import { httpClient } from '../client';
import { AlertFilterQuery, PaginatedResult, StockAlert } from '../../types';

export interface AlertsSummaryResult {
  totalActive: number;
  outOfStockCount: number;
  lowStockCount: number;
  restockSoonCount: number;
  untrackedCount: number;
  acknowledgedCount: number;
}

export type GetAlertsParams = AlertFilterQuery;

export const alertsApi = {
  getAlerts: async (query: AlertFilterQuery = {}): Promise<PaginatedResult<StockAlert>> => {
    const params = new URLSearchParams();
    if (query.alertType && query.alertType !== 'all') params.append('alertType', query.alertType);
    if (query.status && query.status !== 'all') params.append('status', query.status);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    const endpoint = `/alerts${qs ? `?${qs}` : ''}`;
    return httpClient.get<PaginatedResult<StockAlert>>(endpoint);
  },

  getAlertsSummary: async (): Promise<AlertsSummaryResult> => {
    return httpClient.get<AlertsSummaryResult>('/alerts/summary');
  },

  acknowledgeAlert: async (id: string): Promise<StockAlert> => {
    return httpClient.patch<StockAlert>(`/alerts/${encodeURIComponent(id)}/acknowledge`);
  },

  dismissAlert: async (id: string): Promise<StockAlert> => {
    return httpClient.patch<StockAlert>(`/alerts/${encodeURIComponent(id)}/dismiss`);
  },
};
