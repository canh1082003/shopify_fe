import { toast } from 'sonner';
import { SHOPIFY_AUTH } from '../constants/apiEndpoints';

interface CustomGlobal {
  process?: {
    env?: {
      VITE_API_BASE_URL?: string;
    };
  };
}

/**
 * Flag to guard against rapid duplicate clicks and race conditions during OAuth initiation
 */
let isOAuthInitiating = false;
let lockResetTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Strict Shopify domain validation and normalization.
 * Fully aligned with Backend RFC / Shopify specifications:
 * - Must be a non-empty string.
 * - Rejects URL schemes (http://, https://).
 * - Rejects ports (:8080).
 * - Rejects paths (/admin, /oauth).
 * - Rejects queries (?), fragments (#).
 * - Rejects credentials (@).
 * - Rejects underscores (_).
 * - Rejects leading or trailing hyphens (-store, store-).
 * - Rejects empty shop labels (.myshopify.com, myshopify.com).
 * - Rejects whitespace.
 * - Returns normalized lowercase string: 'your-store.myshopify.com'.
 */
export function validateAndNormalizeShopDomain(rawDomain: unknown): string {
  if (typeof rawDomain !== 'string') {
    throw new Error('Miền cửa hàng Shopify không hợp lệ: phải là chuỗi ký tự.');
  }

  const trimmed = rawDomain.trim();
  if (!trimmed) {
    throw new Error('Miền cửa hàng Shopify không được để trống.');
  }

  // Explicit check for forbidden characters, protocol injection, paths, queries, ports, underscores
  if (
    trimmed.includes('://') ||
    trimmed.includes('/') ||
    trimmed.includes('?') ||
    trimmed.includes('#') ||
    trimmed.includes(':') ||
    trimmed.includes('@') ||
    trimmed.includes('_') ||
    /\s/.test(trimmed)
  ) {
    throw new Error(
      'Miền cửa hàng chứa ký tự cấm (gạch dưới, khoảng trắng), đường dẫn, cổng hoặc giao thức.'
    );
  }

  const normalized = trimmed.toLowerCase();

  // Strict regex: label must start and end with alphanumeric, can contain internal hyphens, followed by .myshopify.com
  const SHOPIFY_DOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.myshopify\.com$/;
  if (!SHOPIFY_DOMAIN_REGEX.test(normalized)) {
    throw new Error(
      `Định dạng miền cửa hàng không hợp lệ (${rawDomain}). Cần có định dạng your-store.myshopify.com (không chứa gạch dưới, không bắt đầu/kết thúc bằng gạch nối).`
    );
  }

  return normalized;
}

/**
 * Safely resolve and validate the authoritative Backend API Base URL.
 *
 * Requirements:
 * 1. Authoritative configuration from VITE_API_BASE_URL (or process.env in tests).
 * 2. Do not assume Frontend origin equals Backend origin (supports separate ports).
 * 3. Preserve /api route prefix.
 * 4. Reject invalid or unsafe protocols (javascript:, data:, file:, ftp:, etc.).
 * 5. Require HTTPS for non-localhost Backend navigation.
 * 6. Reject missing or malformed Backend configuration.
 * 7. Reject Backend URLs containing credentials, query strings, or fragments.
 */
export function resolveBackendApiBaseUrl(overrideBase?: string): string {
  const metaEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const raw =
    overrideBase !== undefined
      ? overrideBase
      : metaEnv?.VITE_API_BASE_URL || processEnvFallback();

  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    throw new Error('Cấu hình Backend API base URL (VITE_API_BASE_URL) bị thiếu hoặc không hợp lệ.');
  }

  const trimmed = raw.trim();

  // Relative path handling (e.g. '/api')
  if (!/^https?:\/\//i.test(trimmed)) {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
      throw new Error(`Giao thức không an toàn trong cấu hình Backend URL: ${trimmed}`);
    }

    if (trimmed.includes('?') || trimmed.includes('#') || trimmed.includes('@')) {
      throw new Error('Cấu hình Backend URL tương đối không được chứa query, fragment hoặc credentials.');
    }

    const isLocalHost =
      typeof window !== 'undefined' &&
      window.location &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]');

    if (isLocalHost) {
      const cleanRelative = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      const pathWithApi = cleanRelative.endsWith('/api')
        ? cleanRelative
        : `${cleanRelative.replace(/\/+$/, '')}/api`;
      return `${window.location.origin}${pathWithApi}`;
    }

    throw new Error(
      'Backend API base URL chưa được cấu hình địa chỉ tuyệt đối HTTPS (VITE_API_BASE_URL required).'
    );
  }

  // Parse absolute URL
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Cấu hình Backend API base URL không đúng định dạng URL: ${trimmed}`);
  }

  // Hardening: Reject credentials, query strings, and fragments
  if (parsed.username || parsed.password) {
    throw new Error('Backend API URL không được chứa thông tin xác thực (username/password).');
  }
  if (parsed.search) {
    throw new Error('Backend API URL không được chứa query string.');
  }
  if (parsed.hash) {
    throw new Error('Backend API URL không được chứa URL fragment (#).');
  }

  const isHttp = parsed.protocol === 'http:';
  const isHttps = parsed.protocol === 'https:';

  if (!isHttp && !isHttps) {
    throw new Error(`Giao thức không được hỗ trợ trong Backend URL: ${parsed.protocol}`);
  }

  const isLocalHost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '[::1]';

  // Require HTTPS for non-localhost Backend navigation
  if (!isLocalHost && !isHttps) {
    throw new Error(
      `Backend API URL cho môi trường không phải localhost bắt buộc phải sử dụng HTTPS (${trimmed}).`
    );
  }

  // Preserve /api route prefix
  let pathname = parsed.pathname.replace(/\/+$/, '');
  if (!pathname.endsWith('/api')) {
    pathname = pathname ? `${pathname}/api` : '/api';
  }

  const portPart = parsed.port ? `:${parsed.port}` : '';
  return `${parsed.protocol}//${parsed.hostname}${portPart}${pathname}`;
}

/**
 * Fallback to read process.env in Node / test runner environments
 */
function processEnvFallback(): string {
  const customGlobal = globalThis as unknown as CustomGlobal;
  if (customGlobal.process?.env?.VITE_API_BASE_URL) {
    return customGlobal.process.env.VITE_API_BASE_URL;
  }
  return '';
}

/**
 * Resolve the authoritative backend Shopify OAuth initiation URL.
 * Strictly adheres to backend route contract:
 * GET /api/integrations/shopify/auth?shop=<normalizedShop>&redirect=true
 */
export function resolveBackendOAuthUrl(
  shopDomain: string,
  apiBaseOverride?: string
): string {
  const normalizedShop = validateAndNormalizeShopDomain(shopDomain);
  const apiBase = resolveBackendApiBaseUrl(apiBaseOverride);
  const cleanEndpoint = SHOPIFY_AUTH.startsWith('/') ? SHOPIFY_AUTH : `/${SHOPIFY_AUTH}`;
  return `${apiBase}${cleanEndpoint}?shop=${encodeURIComponent(normalizedShop)}&redirect=true`;
}

/**
 * Resolves target shop domain for first-time or returning merchants:
 * 1. Explicit domain passed from application state (if already installed/known).
 * 2. Shopify App Bridge 4 ID token:
 *    IMPORTANT (Trust Boundary): The decoded 'dest' claim is strictly a client-side
 *    routing hint to direct the merchant to their Shopify OAuth consent screen.
 *    It is NEVER treated as authenticated tenant identity. The Backend OAuth callback
 *    remains 100% authoritative for cryptographic verification, tenant boundaries, and token exchange.
 * 3. Shopify Admin URL query parameters (?shop=...).
 * 4. User prompt fallback (ONLY when opened standalone in a direct browser window,
 *    avoiding intrusive prompts inside embedded Shopify iframes).
 */
export async function resolveTargetShopDomain(
  explicitDomain?: string | null
): Promise<string | null> {
  // 1. Explicit domain from caller
  if (explicitDomain && typeof explicitDomain === 'string' && explicitDomain.trim()) {
    try {
      return validateAndNormalizeShopDomain(explicitDomain);
    } catch {
      // Ignore invalid explicit domain and continue resolution
    }
  }

  const isEmbedded = typeof window !== 'undefined' && window.top !== window;

  // 2. App Bridge Session Token (Primary routing hint in embedded apps)
  const win = typeof window !== 'undefined' ? (window as unknown as { shopify?: { idToken?: () => Promise<string> } }) : null;
  if (win?.shopify?.idToken) {
    try {
      const token = await win.shopify.idToken();
      if (token && typeof token === 'string') {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
          const payload = JSON.parse(payloadStr) as { dest?: string };
          if (payload.dest && typeof payload.dest === 'string') {
            const raw = payload.dest.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
            return validateAndNormalizeShopDomain(raw);
          }
        }
      }
    } catch (err) {
      console.warn('[ShopifyAuth] Could not extract shop domain from App Bridge token:', err);
    }
  }

  // 3. Shopify Admin iframe URL parameter (?shop=store.myshopify.com)
  if (typeof window !== 'undefined' && window.location?.search) {
    try {
      const params = new URLSearchParams(window.location.search);
      const shopParam = params.get('shop');
      if (shopParam) {
        return validateAndNormalizeShopDomain(shopParam);
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  // 4. Standalone merchant onboarding fallback:
  // Avoid prompting inside an embedded Shopify iframe when App Bridge is temporarily unavailable!
  if (!isEmbedded && typeof window !== 'undefined' && typeof window.prompt === 'function') {
    const userInput = window.prompt(
      'Vui lòng nhập tên miền cửa hàng Shopify của bạn để kết nối (ví dụ: your-store.myshopify.com):'
    );
    if (userInput && userInput.trim()) {
      try {
        return validateAndNormalizeShopDomain(userInput);
      } catch (promptErr) {
        toast.error('Tên miền không hợp lệ', {
          description: promptErr instanceof Error ? promptErr.message : 'Tên miền Shopify không hợp lệ',
        });
        return null;
      }
    }
  }

  return null;
}

/**
 * Reset OAuth in-flight lock (used for timeout, errors, and testing)
 */
export function resetOAuthInitiationLock(): void {
  isOAuthInitiating = false;
  if (lockResetTimer) {
    clearTimeout(lockResetTimer);
    lockResetTimer = null;
  }
}

/**
 * Inspect whether OAuth initiation is currently locked
 */
export function isOAuthInProgress(): boolean {
  return isOAuthInitiating;
}

/**
 * Safely initiate Shopify OAuth Handshake with Backend.
 *
 * Flow:
 * 1. Synchronously acquires mutex lock before any asynchronous step (eliminates race condition).
 * 2. Resolves target shop domain (caller context -> App Bridge idToken routing hint -> ?shop query -> standalone prompt).
 * 3. Resolves authoritative Backend initiation URL with redirect=true and HTTPS enforcement.
 * 4. Triggers top-level navigation (_top) to escape embedded App Bridge iframe.
 * 5. On any error, cancellation, or navigation failure, immediately releases the mutex lock.
 */
export async function initiateShopifyOAuth(
  shopDomain?: string | null,
  apiBaseOverride?: string
): Promise<void> {
  // 1. Acquire mutex lock immediately to prevent concurrent race conditions
  if (isOAuthInitiating) {
    return;
  }

  isOAuthInitiating = true;
  lockResetTimer = setTimeout(() => {
    isOAuthInitiating = false;
    lockResetTimer = null;
  }, 8000);

  try {
    const targetDomain = await resolveTargetShopDomain(shopDomain);
    if (!targetDomain) {
      resetOAuthInitiationLock();
      toast.error('Lỗi khởi tạo ủy quyền Shopify', {
        description: 'Không tìm thấy miền cửa hàng Shopify hợp lệ để kết nối.',
      });
      return;
    }

    const targetUrl = resolveBackendOAuthUrl(targetDomain, apiBaseOverride);

    // Top-level navigation to escape iframe sandbox (App Bridge 4 / Embedded Apps)
    const isEmbedded = typeof window !== 'undefined' && window.top !== window;
    try {
      if (isEmbedded) {
        window.open(targetUrl, '_top');
      } else if (typeof window !== 'undefined') {
        window.location.href = targetUrl;
      }
    } catch (navErr) {
      resetOAuthInitiationLock();
      const navMsg = navErr instanceof Error ? navErr.message : 'Lỗi điều hướng trình duyệt';
      toast.error('Lỗi điều hướng ủy quyền', { description: navMsg });
      return;
    }
  } catch (err: unknown) {
    resetOAuthInitiationLock();
    const message = err instanceof Error ? err.message : 'Lỗi cấu hình URL ủy quyền';
    toast.error('Lỗi khởi tạo ủy quyền', { description: message });
    return;
  }
}
