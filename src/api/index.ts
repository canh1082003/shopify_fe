/**
 * STOCKPILOT — CENTRAL API GATEWAY & ROUTER MODULES
 * Unified API entry point connecting feature router modules with the base HTTP client
 */

import { httpClient } from './client';
import * as authApi from './modules/auth.api';
import { dashboardApi } from './modules/dashboard.api';
import * as ordersApi from './modules/orders.api';
import { alertsApi } from './modules/alerts.api';
import { inventoryApi } from './modules/inventory.api';
import { analyticsApi } from './modules/analytics.api';
import * as settingsApi from './modules/settings.api';
import * as notificationsApi from './modules/notifications.api';
import * as integrationsApi from './modules/integrations.api';

// Export Base HTTP Client & Core Types
export { httpClient, ApiClient } from './client';
export type { TokenStatusInfo } from './client';

// Export Domain Router Modules
export {
  authApi,
  dashboardApi,
  inventoryApi,
  ordersApi,
  alertsApi,
  analyticsApi,
  settingsApi,
  notificationsApi,
  integrationsApi,
};

// Export Domain Types
export type { GetOrdersParams } from './modules/orders.api';
export type { AlertsSummaryResult } from './modules/alerts.api';
export type { TestNotificationResult } from './modules/notifications.api';
export type { ShopifySyncResult } from './modules/integrations.api';

/**
 * Consolidated 'api' object
 * Supports both direct calls (e.g. api.getInventory) and namespaced calls (e.g. api.inventory.getInventory)
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
  getDashboardSummary: dashboardApi.getSummary,
  getDashboardTrends: dashboardApi.getSalesTrends,
  getSalesTrends: dashboardApi.getSalesTrends,

  // Inventory Router
  getInventory: inventoryApi.getInventory,
  getInventoryItem: inventoryApi.getInventoryItem,
  updateVariantOverride: inventoryApi.updateVariantOverride,

  // Orders Router
  getOrders: ordersApi.getOrders,
  getOrderById: ordersApi.getOrderById,

  // Alerts Router
  getAlerts: alertsApi.getAlerts,
  getAlertsSummary: alertsApi.getAlertsSummary,
  acknowledgeAlert: alertsApi.acknowledgeAlert,
  dismissAlert: alertsApi.dismissAlert,

  // Analytics Router
  getSalesVelocity: analyticsApi.getSalesVelocity,
  getStockoutRisk: analyticsApi.getStockoutRisk,
  getRestockSuggestions: analyticsApi.getRestockSuggestions,

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
  inventory: inventoryApi,
  orders: ordersApi,
  alerts: alertsApi,
  analytics: analyticsApi,
  settings: settingsApi,
  notifications: notificationsApi,
  integrations: integrationsApi,
};

export default api;
