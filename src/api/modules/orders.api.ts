import { httpClient } from '../client';
import { Order, PaginatedResult } from '../../types';
import { ORDERS, ORDER_BY_ID } from '../../constants/apiEndpoints';

export interface GetOrdersParams {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export const getOrders = async (params: GetOrdersParams): Promise<PaginatedResult<Order>> => {
  const searchParams = new URLSearchParams();
  if (params.status && params.status !== 'all') searchParams.append('status', params.status);
  if (params.search && params.search.trim()) searchParams.append('search', params.search.trim());
  if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
  if (params.dateTo) searchParams.append('dateTo', params.dateTo);
  if (params.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params.page) searchParams.append('page', String(params.page));
  if (params.limit) searchParams.append('limit', String(params.limit));

  const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return httpClient.request<PaginatedResult<Order>>(`${ORDERS}${qs}`);
};

export const getOrderById = async (id: string, silent = true): Promise<Order> => {
  return httpClient.request<Order>(ORDER_BY_ID(id), undefined, false, silent);
};
