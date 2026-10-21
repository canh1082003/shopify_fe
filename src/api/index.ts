/**
 * ORDER WATCHDOG — CENTRAL API GATEWAY & ROUTER MODULES
 * Unified API entry point connecting feature router modules with the base HTTP client
 */

import { httpClient } from './client';
import * as authApi from './modules/auth.api';
import * as dashboardApi from './modules/dashboard.api';
import * as ordersApi from './modules/orders.api';
import * as alertsApi from './modules/alerts.api';
import * as settingsApi from './modules/settings.api';
import * as notificationsApi from './modules/notifications.api';
import * as integrationsApi from './modules/integrations.api';

// Export Base HTTP Client & Core Types
export { httpClient, ApiClient } from './client';
export type { TokenStatusInfo } from './client';

// Export Domain Router Modules (Từng router riêng biệt)
export {
  authApi,
  dashboardApi,
  ordersApi,
  alertsApi,
  settingsApi,
  notificationsApi,
  integrationsApi,
};

// Export Domain Types
export type { GetOrdersParams } from './modules/orders.api';
export type { GetAlertsParams, AlertsSummaryResult } from './modules/alerts.api';
export type { TestNotificationResult } from './modules/notifications.api';
export type { ShopifySyncResult } from './modules/integrations.api';

/**
 * Consolidated 'api' object (API Tổng)
 * Supports both direct calls (e.g. api.getOrders) and namespaced calls (e.g. api.orders.getOrders)
 */
export const api = {
  // Base Client Low-Level Access
  client: httpClient,
  request: httpClient.request.bind(httpClient),

  // Auth Router
  fetchToken: authApi.fetchToken,
  refreshAccessToken: authApi.refreshAccessToken,
  verifyToken: authApi.verifyToken,
  clearTokens: authApi.clearTokens,
  getValidToken: authApi.getValidToken,

  // Dashboard Router
  getDashboardSummary: dashboardApi.getDashboardSummary,
  getDashboardTrends: dashboardApi.getDashboardTrends,

  // Orders Router
  getOrders: ordersApi.getOrders,
  getOrderById: ordersApi.getOrderById,

  // Alerts Router
  getAlerts: alertsApi.getAlerts,
  getAlertsSummary: alertsApi.getAlertsSummary,
  acknowledgeAlert: alertsApi.acknowledgeAlert,

  // Settings Router
  getSettings: settingsApi.getSettings,
  updateSettings: settingsApi.updateSettings,

  // Notifications Router
  sendTestNotification: notificationsApi.sendTestNotification,

  // Integrations Router
  getShopifyStatus: integrationsApi.getShopifyStatus,
  syncShopify: integrationsApi.syncShopify,

  // Feature Router Namespaces
  auth: authApi,
  dashboard: dashboardApi,
  orders: ordersApi,
  alerts: alertsApi,
  settings: settingsApi,
  notifications: notificationsApi,
  integrations: integrationsApi,
};

export default api;
