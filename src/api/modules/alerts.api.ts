import { httpClient } from '../client';
import { Alert, PaginatedResult } from '../../types';
import { ALERTS, ALERTS_SUMMARY, ACKNOWLEDGE_ALERT } from '../../constants/apiEndpoints';

export interface GetAlertsParams {
  severity?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AlertsSummaryResult {
  totalActive: number;
  criticalCount: number;
  warningCount: number;
  acknowledgedCount: number;
  resolvedCount: number;
}

export const getAlerts = async (params: GetAlertsParams): Promise<PaginatedResult<Alert>> => {
  const searchParams = new URLSearchParams();
  if (params.severity && params.severity !== 'all')
    searchParams.append('severity', params.severity);
  if (params.status && params.status !== 'all') searchParams.append('status', params.status);
  if (params.page) searchParams.append('page', String(params.page));
  if (params.limit) searchParams.append('limit', String(params.limit));

  const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return httpClient.request<PaginatedResult<Alert>>(`${ALERTS}${qs}`);
};

export const getAlertsSummary = async (): Promise<AlertsSummaryResult> => {
  return httpClient.request<AlertsSummaryResult>(ALERTS_SUMMARY);
};

export const acknowledgeAlert = async (alertId: string): Promise<Alert> => {
  return httpClient.request<Alert>(ACKNOWLEDGE_ALERT(alertId), {
    method: 'PATCH',
  });
};
