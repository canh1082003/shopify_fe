import { ApiResponse } from '../types';
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

export class ApiClientError extends Error {
  public statusCode: number;
  public errorCode?: string;
  public isAuthError: boolean;
  public isUninstalled: boolean;
  public handled: boolean;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      errorCode?: string;
      isAuthError?: boolean;
      isUninstalled?: boolean;
      handled?: boolean;
      cause?: unknown;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = 'ApiClientError';
    this.statusCode = options.statusCode ?? 0;
    this.errorCode = options.errorCode;
    this.isAuthError = options.isAuthError ?? (this.statusCode === 401 || this.statusCode === 403);
    this.isUninstalled =
      options.isUninstalled ??
      (options.errorCode === 'AUTH_SHOP_UNINSTALLED' ||
        options.errorCode === 'AUTH_SHOP_NOT_FOUND' ||
        options.errorCode === 'AUTH_SHOP_NOT_INSTALLED');
    this.handled = options.handled ?? false;
  }
}

export class ApiClient {
  private token: string | null = null;
  private refreshTokenValue: string | null = null;
  private tokenExpiry: number = 0; // unix seconds
  private tokenPromise: Promise<string> | null = null;

  constructor() {
    // Purge any legacy tokens from localStorage to prevent XSS exposure
    try {
      localStorage.removeItem('ow_auth_token');
      localStorage.removeItem('ow_refresh_token');
      localStorage.removeItem('ow_token_exp');
    } catch {
      // Ignore if localStorage is restricted
    }
  }

  /**
   * Save token pair to in-memory state
   */
  public storeTokens(token: string, refreshToken?: string, expiresIn?: number): void {
    this.token = token;

    if (refreshToken) {
      this.refreshTokenValue = refreshToken;
    }

    if (expiresIn) {
      this.tokenExpiry = Math.floor(Date.now() / 1000) + expiresIn;
    }
  }

  /**
   * Clear all authentication tokens from in-memory state
   */
  public clearTokens(): void {
    this.token = null;
    this.refreshTokenValue = null;
    this.tokenExpiry = 0;
  }

  /**
   * Acquire token with mutex to prevent duplicate concurrent exchanges
   */
  public async acquireToken(): Promise<string> {
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    this.tokenPromise = (async () => {
      try {
        return await this.fetchToken();
      } finally {
        this.tokenPromise = null;
      }
    })();

    return this.tokenPromise;
  }

  /**
   * Obtain a fresh Bearer token from Backend using verified Shopify App Bridge Session Token
   */
  public async fetchToken(): Promise<string> {
    let sessionToken: string | null = null;

    // Primary Source: Official Shopify App Bridge idToken()
    if (typeof window !== 'undefined' && (window as any).shopify?.idToken) {
      try {
        sessionToken = await (window as any).shopify.idToken();
      } catch (err) {
        console.warn('[ApiClient] Failed to acquire Shopify App Bridge session token:', err);
      }
    }

    if (!sessionToken) {
      const msg = 'Yêu cầu mở StockPilot bên trong Shopify Admin (App Bridge Session Token required).';
      toast.error('Lỗi xác thực Shopify', { description: msg });
      throw new ApiClientError(msg, {
        statusCode: HttpStatus.UNAUTHORIZED,
        errorCode: 'MISSING_SESSION_TOKEN',
        isAuthError: true,
        handled: true,
      });
    }

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ sessionToken }),
      });
    } catch (netErr) {
      const netMsg = 'Không thể kết nối đến máy chủ xác thực (Network Error)';
      toast.error('Lỗi kết nối mạng', { description: netMsg });
      throw new ApiClientError(netMsg, { statusCode: 0, handled: true, cause: netErr });
    }

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // Non-json response
    }

    if (!res.ok || !json?.success || !json?.data?.token) {
      const feedback = getStatusFeedback(res.status);
      const msg = json?.message || feedback.defaultMessage;
      const errorCode = json?.errorCode;

      const isUninstalled =
        errorCode === 'AUTH_SHOP_UNINSTALLED' ||
        errorCode === 'AUTH_SHOP_NOT_FOUND' ||
        errorCode === 'AUTH_SHOP_NOT_INSTALLED';

      toast.error(feedback.title, { description: msg });
      throw new ApiClientError(msg, {
        statusCode: res.status,
        errorCode,
        isAuthError: true,
        isUninstalled,
        handled: true,
      });
    }

    this.storeTokens(json.data.token, json.data.refreshToken, json.data.expiresIn);
    return json.data.token;
  }

  /**
   * Refresh an access token using the long-lived refresh token with mutex
   */
  public async refreshAccessToken(): Promise<string> {
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    if (!this.refreshTokenValue) {
      return this.acquireToken();
    }

    this.tokenPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshTokenValue }),
        });

        let json: any = null;
        try {
          json = await res.json();
        } catch {
          // ignore
        }

        if (!res.ok || !json?.success || !json?.data?.token) {
          const errorCode = json?.errorCode;
          if (
            errorCode === 'AUTH_SHOP_UNINSTALLED' ||
            errorCode === 'AUTH_SHOP_NOT_FOUND' ||
            errorCode === 'AUTH_SHOP_NOT_INSTALLED'
          ) {
            this.clearTokens();
            throw new ApiClientError(json?.message || 'Cửa hàng đã gỡ cài đặt.', {
              statusCode: res.status,
              errorCode,
              isAuthError: true,
              isUninstalled: true,
              handled: true,
            });
          }

          console.warn('[ApiClient] Refresh token invalid or expired. Fetching fresh token...');
          this.clearTokens();
          return await this.fetchToken();
        }

        this.storeTokens(json.data.token, json.data.refreshToken, json.data.expiresIn);
        return json.data.token;
      } catch (err) {
        if (err instanceof ApiClientError && err.isUninstalled) {
          throw err;
        }
        console.warn('[ApiClient] Refresh token failed. Falling back to fresh session token...', err);
        this.clearTokens();
        return await this.fetchToken();
      } finally {
        this.tokenPromise = null;
      }
    })();

    return this.tokenPromise;
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
  public async getValidToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    // If token exists and is valid (with 30s safety margin)
    if (this.token && (!this.tokenExpiry || this.tokenExpiry > now + 30)) {
      return this.token;
    }

    // If token is expiring or expired, refresh proactively
    if (this.refreshTokenValue && this.tokenExpiry && this.tokenExpiry <= now + 30) {
      return this.refreshAccessToken();
    }

    return this.acquireToken();
  }

  /**
   * Centralized HTTP Request wrapper with Bearer token, auto 401 recovery, and toast integration
   */
  public async request<T>(
    endpoint: string,
    options?: RequestInit,
    isRetry = false,
    silent = false
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const isPublicEndpoint =
      endpoint.startsWith('/auth/token') ||
      endpoint.startsWith('/health') ||
      endpoint.startsWith('/auth/refresh');

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
        let errJson: any = null;
        try {
          errJson = await response.clone().json();
        } catch {
          // ignore
        }

        const errorCode = errJson?.errorCode;
        if (
          errorCode === 'AUTH_SHOP_UNINSTALLED' ||
          errorCode === 'AUTH_SHOP_NOT_FOUND' ||
          errorCode === 'AUTH_SHOP_NOT_INSTALLED'
        ) {
          this.clearTokens();
          const uninstalledMsg =
            errJson?.message || 'Cửa hàng chưa cài đặt hoặc đã gỡ ứng dụng StockPilot.';
          if (!silent) {
            toast.error('Cửa hàng chưa kích hoạt', { description: uninstalledMsg });
          }
          throw new ApiClientError(uninstalledMsg, {
            statusCode: HttpStatus.UNAUTHORIZED,
            errorCode,
            isAuthError: true,
            isUninstalled: true,
            handled: true,
          });
        }

        console.warn('[ApiClient] 401 Unauthorized encountered. Attempting token refresh...');
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          return this.request<T>(endpoint, options, true, silent);
        }
      }

      // Handle 403 Forbidden (cross-tenant mismatch)
      if (response.status === HttpStatus.FORBIDDEN && !silent) {
        let errJson: any = null;
        try {
          errJson = await response.clone().json();
        } catch {
          // ignore
        }
        const errorMsg = errJson?.message || 'Không có quyền truy cập dữ liệu cửa hàng này.';
        toast.error('Truy cập bị từ chối', { description: errorMsg });
        throw new ApiClientError(errorMsg, {
          statusCode: HttpStatus.FORBIDDEN,
          errorCode: errJson?.errorCode,
          isAuthError: true,
          handled: true,
        });
      }

      const json: ApiResponse<T> = await response.json();

      if (!response.ok || !json.success) {
        const feedback = getStatusFeedback(response.status);
        const errorMsg = json.message || feedback.defaultMessage;

        // Show rich toast for API errors only if not in silent mode
        if (!silent) {
          toast.error(feedback.title, {
            description: errorMsg,
          });
        }

        throw new ApiClientError(errorMsg, {
          statusCode: response.status,
          errorCode: json.errorCode,
          handled: true,
        });
      }

      return json.data as T;
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.handled) {
        throw err;
      }
      const networkMsg = 'Không thể kết nối đến máy chủ StockPilot Backend (Network Error)';
      if (!silent) {
        toast.error('Lỗi kết nối mạng', { description: networkMsg });
      }
      throw new ApiClientError(networkMsg, {
        statusCode: 0,
        handled: true,
        cause: err,
      });
    }
  }

  public async get<T>(endpoint: string, silent = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, false, silent);
  }

  public async post<T>(endpoint: string, body?: any, silent = false): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      },
      false,
      silent
    );
  }

  public async put<T>(endpoint: string, body?: any, silent = false): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      },
      false,
      silent
    );
  }

  public async patch<T>(endpoint: string, body?: any, silent = false): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      },
      false,
      silent
    );
  }

  public async delete<T>(endpoint: string, silent = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, false, silent);
  }
}

export const httpClient = new ApiClient();
