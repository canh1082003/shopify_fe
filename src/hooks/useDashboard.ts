import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { DashboardSummary, DashboardTrend, Order } from '../types';

export function useDashboard(autoPollInterval = 30000) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<DashboardTrend | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(7);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await api.dashboard.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('[useDashboard] Failed to fetch summary:', err);
    }
  }, []);

  const fetchTrendsAndOrders = useCallback(async (days: 7 | 30 | 90) => {
    try {
      setIsLoading(true);
      const [trendData, ordersData] = await Promise.all([
        api.dashboard.getSalesTrends(days),
        api.orders.getOrders({ limit: 5 }),
      ]);
      setTrends(trendData);
      setRecentOrders(ordersData.items);
    } catch (err) {
      console.error('[useDashboard] Failed to fetch trends/orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    if (autoPollInterval > 0) {
      const interval = setInterval(fetchSummary, autoPollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchSummary, autoPollInterval]);

  useEffect(() => {
    fetchTrendsAndOrders(selectedPeriod);
  }, [fetchTrendsAndOrders, selectedPeriod]);

  return {
    summary,
    trends,
    recentOrders,
    selectedPeriod,
    setSelectedPeriod,
    isLoading,
    refreshSummary: fetchSummary,
    refreshAll: () => {
      fetchSummary();
      fetchTrendsAndOrders(selectedPeriod);
    },
  };
}
