/**
 * API ENDPOINTS CONSTANTS
 * Centralized registry of backend route endpoints
 */

// Auth Endpoints
export const AUTH_TOKEN = '/auth/token';
export const AUTH_REFRESH = '/auth/refresh';
export const AUTH_VERIFY = '/auth/verify';
export const AUTH_ME = '/auth/me';

// Dashboard Endpoints
export const DASHBOARD_SUMMARY = '/dashboard/summary';
export const DASHBOARD_TRENDS = '/dashboard/trends';

// Orders Endpoints
export const ORDERS = '/orders';
export const ORDER_BY_ID = (id: string) => `/orders/${id}`;

// Alerts Endpoints
export const ALERTS = '/alerts';
export const ALERTS_SUMMARY = '/alerts/summary';
export const ACKNOWLEDGE_ALERT = (id: string) => `/alerts/${id}/acknowledge`;

// Settings Endpoints
export const SETTINGS = '/settings';

// Notifications Endpoints
export const NOTIFICATIONS_TEST = '/notifications/test';

// Integrations Endpoints
export const SHOPIFY_STATUS = '/integrations/shopify/status';
export const SHOPIFY_SYNC = '/integrations/shopify/sync';

// System Health
export const HEALTH = '/health';
export const HEALTH_PING = '/health/ping';
