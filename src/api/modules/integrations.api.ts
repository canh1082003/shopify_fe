import { httpClient } from '../client';
import { ShopifyIntegrationStatus } from '../../types';
import { SHOPIFY_STATUS, SHOPIFY_SYNC } from '../../constants/apiEndpoints';

export interface ShopifySyncResult {
  syncedCount: number;
  message: string;
}

export const getShopifyStatus = async (): Promise<ShopifyIntegrationStatus> => {
  return httpClient.request<ShopifyIntegrationStatus>(SHOPIFY_STATUS);
};

export const syncShopify = async (): Promise<ShopifySyncResult> => {
  return httpClient.request<ShopifySyncResult>(SHOPIFY_SYNC, {
    method: 'POST',
  });
};
