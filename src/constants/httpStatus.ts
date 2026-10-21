/**
 * Standard HTTP Status Codes and SaaS Application Error Codes (Frontend)
 * RFC 7231, RFC 6585, RFC 7519
 */

export const HttpStatus = {
  // 2xx Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // 3xx Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  SEE_OTHER: 303,
  NOT_MODIFIED: 304,

  // 4xx Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export type HttpStatusCode = typeof HttpStatus[keyof typeof HttpStatus];

export const ErrorCode = {
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_INVALID_HEADER: 'AUTH_INVALID_HEADER',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_REFRESH_EXPIRED: 'AUTH_REFRESH_EXPIRED',
  AUTH_REFRESH_INVALID: 'AUTH_REFRESH_INVALID',
  FORBIDDEN_ACCESS: 'FORBIDDEN_ACCESS',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PARAMETERS: 'INVALID_PARAMETERS',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  SHOPIFY_API_ERROR: 'SHOPIFY_API_ERROR',
  SHOPIFY_RATE_LIMIT: 'SHOPIFY_RATE_LIMIT',
  SHOPIFY_UNAUTHORIZED: 'SHOPIFY_UNAUTHORIZED',
  WEBHOOK_HMAC_INVALID: 'WEBHOOK_HMAC_INVALID',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

/**
 * Friendly status messages in Vietnamese & English for UI Toasts
 */
export const HttpStatusFeedback: Record<number, { title: string; defaultMessage: string }> = {
  200: { title: 'Thành công', defaultMessage: 'Yêu cầu được thực thi thành công.' },
  201: { title: 'Đã tạo mới', defaultMessage: 'Tạo tài nguyên mới thành công.' },
  204: { title: 'Hoàn tất', defaultMessage: 'Thao tác thực thi thành công.' },
  400: { title: 'Yêu cầu không hợp lệ', defaultMessage: 'Dữ liệu gửi lên không đúng định dạng hoặc thiếu thông tin.' },
  401: { title: 'Xác thực thất bại', defaultMessage: 'Token không hợp lệ hoặc đã hết hạn. Đang làm mới phiên làm việc...' },
  403: { title: 'Truy cập bị từ chối', defaultMessage: 'Bạn không có quyền thực hiện thao tác này.' },
  404: { title: 'Không tìm thấy', defaultMessage: 'Không tìm thấy dữ liệu yêu cầu.' },
  409: { title: 'Xung đột dữ liệu', defaultMessage: 'Tài nguyên đã tồn tại hoặc đang xung đột trạng thái.' },
  422: { title: 'Lỗi xác thực dữ liệu', defaultMessage: 'Dữ liệu đầu vào không vượt qua kiểm tra nghiệp vụ.' },
  429: { title: 'Quá nhiều yêu cầu', defaultMessage: 'Đạt giới hạn gọi API. Vui lòng thử lại sau ít giây.' },
  500: { title: 'Lỗi máy chủ nội bộ', defaultMessage: 'Máy chủ Backend gặp sự cố. Vui lòng kiểm tra log hệ thống.' },
  502: { title: 'Lỗi cổng Gateway', defaultMessage: 'Không thể kết nối đến dịch vụ Shopify phía trên.' },
  503: { title: 'Dịch vụ tạm ngừng', defaultMessage: 'Hệ thống đang bảo trì hoặc quá tải.' },
  504: { title: 'Hết thời gian chờ', defaultMessage: 'Yêu cầu tới máy chủ vượt quá thời gian cho phép.' },
};

export function getStatusFeedback(statusCode: number): { title: string; defaultMessage: string } {
  return (
    HttpStatusFeedback[statusCode] || {
      title: `HTTP ${statusCode}`,
      defaultMessage: `Mã phản hồi từ máy chủ: ${statusCode}`,
    }
  );
}
