import { httpClient } from '../client';
import { DashboardSummary, DashboardTrend } from '../../types';
import { DASHBOARD_SUMMARY, DASHBOARD_TRENDS } from '../../constants/apiEndpoints';

export const getDashboardSummary = async (silent = true): Promise<DashboardSummary> => {
  return httpClient.request<DashboardSummary>(DASHBOARD_SUMMARY, undefined, false, silent);
};

export const getDashboardTrends = async (days: 7 | 30 | 90 = 7): Promise<DashboardTrend> => {
  return httpClient.request<DashboardTrend>(`${DASHBOARD_TRENDS}?days=${days}`);
};
