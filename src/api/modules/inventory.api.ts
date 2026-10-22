import { httpClient } from '../client';
import {
  InventoryFilterQuery,
  PaginatedResult,
  ProductVariant,
  InventoryItemDetail,
} from '../../types';

export const inventoryApi = {
  getInventory: async (
    query: InventoryFilterQuery = {}
  ): Promise<PaginatedResult<ProductVariant>> => {
    const params = new URLSearchParams();
    if (query.status && query.status !== 'all') params.append('status', query.status);
    if (query.search) params.append('search', query.search);
    if (query.locationId && query.locationId !== 'all')
      params.append('locationId', query.locationId);
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortOrder) params.append('sortOrder', query.sortOrder);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    const endpoint = `/inventory${qs ? `?${qs}` : ''}`;
    return httpClient.get<PaginatedResult<ProductVariant>>(endpoint);
  },

  getInventoryItem: async (id: string): Promise<InventoryItemDetail> => {
    return httpClient.get<InventoryItemDetail>(`/inventory/${encodeURIComponent(id)}`);
  },

  updateVariantOverride: async (
    id: string,
    override: { lowStockThreshold?: number; leadTimeDays?: number; safetyStockDays?: number }
  ): Promise<InventoryItemDetail> => {
    return httpClient.patch<InventoryItemDetail>(
      `/inventory/${encodeURIComponent(id)}/override`,
      override
    );
  },
};
