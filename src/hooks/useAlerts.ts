import { useState, useEffect, useCallback } from 'react';
import { api, AlertsSummaryResult } from '../api';
import { StockAlert } from '../types';
import { toast } from 'sonner';

export function useAlerts() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [summary, setSummary] = useState<AlertsSummaryResult | null>(null);
  const [alertTypeFilter, setAlertTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      const [alertsRes, summaryRes] = await Promise.all([
        api.alerts.getAlerts({
          alertType: alertTypeFilter as any,
          page,
          limit: 10,
        }),
        api.alerts.getAlertsSummary(),
      ]);
      setAlerts(alertsRes.items);
      setTotalPages(alertsRes.totalPages);
      setSummary(summaryRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tải danh sách cảnh báo';
      toast.error('Lỗi cảnh báo', { description: msg });
    } finally {
      setIsLoading(false);
    }
  }, [alertTypeFilter, page]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const acknowledgeAlert = useCallback(
    async (alertId: string, skuOrTitle: string) => {
      try {
        await api.alerts.acknowledgeAlert(alertId);
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alertId
              ? { ...a, status: 'acknowledged' as const, acknowledgedAt: new Date().toISOString() }
              : a
          )
        );
        if (summary) {
          setSummary({
            ...summary,
            totalActive: Math.max(0, summary.totalActive - 1),
            acknowledgedCount: summary.acknowledgedCount + 1,
          });
        }
        toast.info('Đã xác nhận cảnh báo', {
          description: `Cảnh báo cho ${skuOrTitle} đã được ghi nhận.`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi xác nhận cảnh báo';
        toast.error('Lỗi', { description: msg });
      }
    },
    [summary]
  );

  return {
    alerts,
    summary,
    alertTypeFilter,
    setAlertTypeFilter: (s: string) => {
      setAlertTypeFilter(s);
      setPage(1);
    },
    page,
    setPage,
    totalPages,
    isLoading,
    refetch: fetchAlerts,
    acknowledgeAlert,
  };
}
