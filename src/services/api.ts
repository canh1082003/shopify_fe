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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClient {
  private token: string | null = null;
  private tokenPromise: Promise<string> | null = null;

  constructor() {
    this.token = localStorage.getItem('ow_auth_token');
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

    const json: ApiResponse<{ token: string }> = await res.json();
    if (!res.ok || !json.success || !json.data?.token) {
      throw new Error(json.message || 'Failed to authenticate with backend');
    }

    this.token = json.data.token;
    localStorage.setItem('ow_auth_token', this.token);
    return this.token;
  }

  /**
   * Ensure a valid token is available before making protected requests
   */
  private async getValidToken(): Promise<string> {
    if (this.token) {
      return this.token;
    }

    if (!this.tokenPromise) {
      this.tokenPromise = this.fetchToken().finally(() => {
        this.tokenPromise = null;
      });
    }

    return this.tokenPromise;
  }

  /**
   * Centralized HTTP Request wrapper with Bearer token authentication
   */
  private async request<T>(endpoint: string, options?: RequestInit, isRetry = false): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const isPublicEndpoint = endpoint.startsWith('/auth/token') || endpoint.startsWith('/health');

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

      // Handle token expiration or invalidation (401)
      if (response.status === 401 && !isPublicEndpoint && !isRetry) {
        console.warn('[ApiClient] 401 Unauthorized encountered. Refreshing authentication token...');
        this.token = null;
        localStorage.removeItem('ow_auth_token');
        await this.getValidToken();
        // Retry request with fresh token
        return this.request<T>(endpoint, options, true);
      }

      const json: ApiResponse<T> = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || `Request failed with HTTP status ${response.status}`);
      }

      return json.data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Network error: Unable to communicate with Order Watchdog backend');
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
    return this.request<Alert>(`/alerts/${alertId}/acknowledge`, {
      method: 'PATCH',
    });
  }

  // Settings APIs
  public async getSettings(): Promise<Settings> {
    return this.request<Settings>('/settings');
  }

  public async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    return this.request<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Notifications API
  public async sendTestNotification(email?: string): Promise<{ success: boolean; isSimulated: boolean; message: string }> {
    return this.request<{ success: boolean; isSimulated: boolean; message: string }>('/notifications/test', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Shopify Integration APIs
  public async getShopifyStatus(): Promise<ShopifyIntegrationStatus> {
    return this.request<ShopifyIntegrationStatus>('/integrations/shopify/status');
  }

  public async syncShopify(): Promise<{ syncedCount: number; message: string }> {
    return this.request<{ syncedCount: number; message: string }>('/integrations/shopify/sync', {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
