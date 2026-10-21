import { useState, useEffect, useCallback } from 'react';
import { api, GetOrdersParams } from '../api';
import { Order, PaginatedResult } from '../types';
import { toast } from 'sonner';

export function useOrders(initialParams?: Partial<GetOrdersParams>) {
  const [ordersData, setOrdersData] = useState<PaginatedResult<Order> | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialParams?.status || 'all');
  const [searchTerm, setSearchTerm] = useState(initialParams?.search || '');
  const [page, setPage] = useState(initialParams?.page || 1);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.orders.getOrders({
        status: statusFilter,
        search: searchTerm,
        page,
        limit: 10,
      });
      setOrdersData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tải danh sách đơn hàng';
      toast.error('Lỗi tải đơn hàng', { description: msg });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchTerm, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openOrderById = useCallback(async (id: string) => {
    try {
      const order = await api.orders.getOrderById(id, true);
      setSelectedOrder(order);
    } catch {
      toast.error('Lỗi truy vấn', { description: 'Không tìm thấy chi tiết đơn hàng' });
    }
  }, []);

  return {
    orders: ordersData?.items || [],
    total: ordersData?.total || 0,
    totalPages: ordersData?.totalPages || 1,
    selectedOrder,
    setSelectedOrder,
    isLoading,
    statusFilter,
    setStatusFilter: (s: string) => {
      setStatusFilter(s);
      setPage(1);
    },
    searchTerm,
    setSearchTerm: (t: string) => {
      setSearchTerm(t);
      setPage(1);
    },
    page,
    setPage,
    refetch: fetchOrders,
    openOrderById,
  };
}
