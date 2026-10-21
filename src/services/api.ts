import {
  DashboardSummary,
  DashboardTrend,
  Order,
  Alert,
  Settings,
  PaginatedResult,
  ApiResponse,
  ShopifyIntegrationStatus,
} from '../types';
import { HttpStatus, getStatusFeedback } from '../constants/httpStatus';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface TokenStatusInfo {
  valid: boolean;
  shop?: {
    id: string;
    domain: string;
    name: string;
  };
  expiresAt?: string | null;
  remainingSeconds?: number;
  error?: string;
}

class ApiClient {
  private token: string | null = null;
  private refreshTokenValue: string | null = null;
  private tokenExpiry: number = 0; // unix seconds
  private tokenPromise: Promise<string> | null = null;

  constructor() {
    this.token = localStorage.getItem('ow_auth_token');
    this.refreshTokenValue = localStorage.getItem('ow_refresh_token');
    const savedExp = localStorage.getItem('ow_token_exp');
    if (savedExp) {
      this.tokenExpiry = parseInt(savedExp, 10);
    }
  }

  /**
   * Save token pair to in-memory state and localStorage
   */
  private storeTokens(token: string, refreshToken?: string, expiresIn?: number): void {
    this.token = token;
    localStorage.setItem('ow_auth_token', token);

    if (refreshToken) {
      this.refreshTokenValue = refreshToken;
      localStorage.setItem('ow_refresh_token', refreshToken);
    }

    if (expiresIn) {
      const expiry = Math.floor(Date.now() / 1000) + expiresIn;
      this.tokenExpiry = expiry;
      localStorage.setItem('ow_token_exp', String(expiry));
    }
  }

  /**
   * Clear all authentication tokens from storage
   */
  public clearTokens(): void {
    this.token = null;
    this.refreshTokenValue = null;
    this.tokenExpiry = 0;
    localStorage.removeItem('ow_auth_token');
    localStorage.removeItem('ow_refresh_token');
    localStorage.removeItem('ow_token_exp');
  }

  /**
   * Obtain a fresh Bearer token from Backend
   */
  public async fetchToken(shopDomain?: string): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopDomain }),
    });

    const json: ApiResponse<{
      token: string;
      refreshToken: string;
      expiresIn: number;
    }> = await res.json();

    if (!res.ok || !json.success || !json.data?.token) {
      const feedback = getStatusFeedback(res.status);
      const msg = json.message || feedback.defaultMessage;
      toast.error(feedback.title, { description: msg });
      throw new Error(msg);
    }

    this.storeTokens(json.data.token, json.data.refreshToken, json.data.expiresIn);
    return json.data.token;
  }

  /**
   * Refresh an access token using the long-lived refresh token
   */
  public async refreshAccessToken(): Promise<string> {
    if (!this.refreshTokenValue) {
      // If no refresh token, obtain new session
      return this.fetchToken();
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshTokenValue }),
      });

      const json: ApiResponse<{
        token: string;
        refreshToken: string;
        expiresIn: number;
      }> = await res.json();

      if (!res.ok || !json.success || !json.data?.token) {
        console.warn('[ApiClient] Refresh token invalid or expired. Fetching fresh token...');
        this.clearTokens();
        return this.fetchToken();
      }

      this.storeTokens(json.data.token, json.data.refreshToken, json.data.expiresIn);
      toast.info('Phiên làm việc đã được gia hạn tự động', {
        description: json.message || 'Token refreshed successfully via Backend',
      });
      return json.data.token;
    } catch {
      this.clearTokens();
      return this.fetchToken();
    }
  }

  /**
   * Explicitly verify the current Bearer token status with Backend
   */
  public async verifyToken(): Promise<TokenStatusInfo> {
    const token = await this.getValidToken();
    const res = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const json: ApiResponse<TokenStatusInfo> = await res.json();
    return json.data || { valid: false, error: json.message };
  }

  /**
   * Ensure a valid token is available before making protected requests
   */
  private async getValidToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    // If token exists and is valid (with 30s safety margin)
    if (this.token && (!this.tokenExpiry || this.tokenExpiry > now + 30)) {
      return this.token;
    }

    // If token is expiring or expired, refresh proactively
    if (this.refreshTokenValue && this.tokenExpiry && this.tokenExpiry <= now + 30) {
      if (!this.tokenPromise) {
        this.tokenPromise = this.refreshAccessToken().finally(() => {
          this.tokenPromise = null;
        });
      }
      return this.tokenPromise;
    }

    if (!this.tokenPromise) {
      this.tokenPromise = this.fetchToken().finally(() => {
        this.tokenPromise = null;
      });
    }

    return this.tokenPromise;
  }

  /**
   * Centralized HTTP Request wrapper with Bearer token, auto 401 recovery, and toast integration
   */
  private async request<T>(endpoint: string, options?: RequestInit, isRetry = false): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const isPublicEndpoint = endpoint.startsWith('/auth/token') || endpoint.startsWith('/health') || endpoint.startsWith('/auth/refresh');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options?.headers as Record<string, string>) || {}),
    };

    if (!isPublicEndpoint) {
      const token = await this.getValidToken();
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized (token expired or invalid)
      if (response.status === HttpStatus.UNAUTHORIZED && !isPublicEndpoint && !isRetry) {
        console.warn('[ApiClient] 401 Unauthorized encountered. Attempting token refresh...');
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          return this.request<T>(endpoint, options, true);
        }
      }

      const json: ApiResponse<T> = await response.json();

      if (!response.ok || !json.success) {
        const feedback = getStatusFeedback(response.status);
        const errorMsg = json.message || feedback.defaultMessage;
        
        // Show rich toast for API errors
        toast.error(feedback.title, {
          description: errorMsg,
        });

        throw new Error(errorMsg);
      }

      return json.data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      const networkMsg = 'Không thể kết nối đến máy chủ Order Watchdog Backend (Network Error)';
      toast.error('Lỗi kết nối mạng', { description: networkMsg });
      throw new Error(networkMsg);
    }
  }

  // Dashboard APIs
  public async getDashboardSummary(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/dashboard/summary');
  }

  public async getDashboardTrends(days: 7 | 30 | 90 = 7): Promise<DashboardTrend> {
    return this.request<DashboardTrend>(`/dashboard/trends?days=${days}`);
  }

  // Orders APIs
  public async getOrders(params: {
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<Order>> {
    const searchParams = new URLSearchParams();
    if (params.status && params.status !== 'all') searchParams.append('status', params.status);
    if (params.search && params.search.trim()) searchParams.append('search', params.search.trim());
    if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) searchParams.append('dateTo', params.dateTo);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.page) searchParams.append('page', String(params.page));
    if (params.limit) searchParams.append('limit', String(params.limit));

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<PaginatedResult<Order>>(`/orders${qs}`);
  }

  public async getOrderById(id: string): Promise<Order> {
    return this.request<Order>(`/orders/${id}`);
  }

  // Alerts APIs
  public async getAlerts(params: {
    severity?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<Alert>> {
    const searchParams = new URLSearchParams();
    if (params.severity && params.severity !== 'all') searchParams.append('severity', params.severity);
    if (params.status && params.status !== 'all') searchParams.append('status', params.status);
    if (params.page) searchParams.append('page', String(params.page));
    if (params.limit) searchParams.append('limit', String(params.limit));

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<PaginatedResult<Alert>>(`/alerts${qs}`);
  }

  public async getAlertsSummary(): Promise<{
    totalActive: number;
    criticalCount: number;
    warningCount: number;
    acknowledgedCount: number;
    resolvedCount: number;
  }> {
    return this.request<{
      totalActive: number;
      criticalCount: number;
      warningCount: number;
      acknowledgedCount: number;
      resolvedCount: number;
    }>('/alerts/summary');
  }

  public async acknowledgeAlert(alertId: string): Promise<Alert> {
    const res = await this.request<Alert>(`/alerts/${alertId}/acknowledge`, {
      method: 'PATCH',
    });
    toast.success('Đã xác nhận cảnh báo', {
      description: `Đơn hàng đã được ghi nhận. Hệ thống vẫn tiếp tục giám sát SLA đến khi hoàn tất giao hàng.`,
    });
    return res;
  }

  // Settings APIs
  public async getSettings(): Promise<Settings> {
    return this.request<Settings>('/settings');
  }

  public async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const res = await this.request<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    toast.success('Cập nhật cài đặt thành công', {
      description: 'Quy tắc SLA và thông báo email đã được lưu và áp dụng cho toàn bộ đơn hàng.',
    });
    return res;
  }

  // Notifications API
  public async sendTestNotification(email?: string): Promise<{ success: boolean; isSimulated: boolean; message: string }> {
    const res = await this.request<{ success: boolean; isSimulated: boolean; message: string }>('/notifications/test', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    toast.success('Gửi email thông báo mẫu thành công', {
      description: res.message,
    });
    return res;
  }

  // Shopify Integration APIs
  public async getShopifyStatus(): Promise<ShopifyIntegrationStatus> {
    return this.request<ShopifyIntegrationStatus>('/integrations/shopify/status');
  }

  public async syncShopify(): Promise<{ syncedCount: number; message: string }> {
    const res = await this.request<{ syncedCount: number; message: string }>('/integrations/shopify/sync', {
      method: 'POST',
    });
    toast.success('Đồng bộ Shopify thành công', {
      description: res.message,
    });
    return res;
  }
}

export const api = new ApiClient();
