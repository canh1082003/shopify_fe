export type FinancialStatus =
  | 'paid'
  | 'authorized'
  | 'pending'
  | 'partially_refunded'
  | 'refunded'
  | 'voided';

export type FulfillmentStatus =
  | 'unfulfilled'
  | 'partial'
  | 'fulfilled'
  | 'restocked';

export interface LineItem {
  id: string;
  title: string;
  quantity: number;
  fulfillableQuantity: number;
  price: number;
  sku?: string;
}

export interface Order {
  id: string;
  shopId: string;
  shopifyOrderId: string;
  orderNumber: string;
  name: string;
  customerName?: string | null;
  customerEmail?: string | null;
  createdAt: string;
  processedAt?: string | null;
  cancelledAt?: string | null;
  financialStatus: FinancialStatus;
  fulfillmentStatus: FulfillmentStatus;
  totalAmount: number;
  currencyCode: string;
  totalItems: number;
  fulfillableQuantity: number;
  lineItems: LineItem[];
  deadline: string | null;
  isOverdue: boolean;
  overdueMinutes: number;
  shopifyUrl?: string | null;
  lastSyncedAt: string;
  updatedAt: string;
}

export type AlertSeverity = 'warning' | 'critical' | 'resolved';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  shopId: string;
  orderId: string;
  orderNumber: string;
  severity: AlertSeverity;
  status: AlertStatus;
  reason: string;
  elapsedHours: number;
  thresholdHours: number;
  createdAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
}

export interface Settings {
  id: string;
  shopId: string;
  overdueThresholdHours: number;
  warningLeadTimeHours: number;
  emailEnabled: boolean;
  notificationEmail: string;
  digestFrequency: 'immediate' | 'daily' | 'hourly';
  autoAcknowledge: boolean;
  excludeTags: string[];
  updatedAt: string;
}

export interface DashboardSummary {
  totalOrders: number;
  overdueOrders: number;
  pendingFulfillment: number;
  onTimeRate: number;
  comparison: {
    totalOrdersDiff?: number;
    overdueDiff?: number;
  } | null;
  monitoringStatus: {
    isShopifyConnected: boolean;
    shopDomain: string;
    isDemoMode: boolean;
    lastSyncedAt: string;
    thresholdHours: number;
    emailEnabled: boolean;
    activeAlertsCount: number;
  };
}

export interface TrendPoint {
  date: string;
  overdueCount: number;
  fulfilledCount: number;
  totalCount: number;
}

export interface DashboardTrend {
  period: '7d' | '30d' | '90d';
  points: TrendPoint[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  error?: string;
}

export interface ShopifyIntegrationStatus {
  isConfigured: boolean;
  isShopifyConnected: boolean;
  shopDomain: string;
  isDemoMode: boolean;
  appUrl: string;
  scopes: string[];
  lastSyncedAt: string;
  webhookCount: number;
  activeOrdersCount: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export type NavigationTab = 'dashboard' | 'orders' | 'alerts' | 'settings';
