import { httpClient } from '../client';
import { SalesVelocitySummary, StockoutRiskGroup, RestockRecommendation } from '../../types';

export const analyticsApi = {
  getSalesVelocity: async (): Promise<SalesVelocitySummary> => {
    return httpClient.get<SalesVelocitySummary>('/analytics/sales-velocity');
  },

  getStockoutRisk: async (): Promise<StockoutRiskGroup[]> => {
    return httpClient.get<StockoutRiskGroup[]>('/analytics/stockout-risk');
  },

  getRestockSuggestions: async (): Promise<RestockRecommendation[]> => {
    return httpClient.get<RestockRecommendation[]>('/analytics/restock');
  },
};
