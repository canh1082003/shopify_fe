import { httpClient } from '../client';
import { DashboardSummary, DashboardTrend } from '../../types';

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    return httpClient.get<DashboardSummary>('/dashboard/summary');
  },

  getSalesTrends: async (days: 7 | 30 | 90 = 7): Promise<DashboardTrend> => {
    return httpClient.get<DashboardTrend>(`/dashboard/sales-trend?days=${days}`);
  },

  // Aliases for compatibility with hooks
  getDashboardSummary: async (_silent = false): Promise<DashboardSummary> => {
    return dashboardApi.getSummary();
  },

  getDashboardTrends: async (days: 7 | 30 | 90 = 7): Promise<DashboardTrend> => {
    return dashboardApi.getSalesTrends(days);
  },

  getTrends: async (days: 7 | 30 | 90 = 7): Promise<DashboardTrend> => {
    return dashboardApi.getSalesTrends(days);
  },
};
