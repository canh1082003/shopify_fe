import { httpClient } from '../client';
import { Settings } from '../../types';
import { SETTINGS } from '../../constants/apiEndpoints';

export const getSettings = async (): Promise<Settings> => {
  return httpClient.request<Settings>(SETTINGS);
};

export const updateSettings = async (settings: Partial<Settings>): Promise<Settings> => {
  return httpClient.request<Settings>(SETTINGS, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
};
