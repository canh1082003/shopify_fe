import { httpClient, TokenStatusInfo } from '../client';

export const fetchToken = async (): Promise<string> => {
  return httpClient.fetchToken();
};

export const refreshAccessToken = async (): Promise<string> => {
  return httpClient.refreshAccessToken();
};

export const verifyToken = async (): Promise<TokenStatusInfo> => {
  return httpClient.verifyToken();
};

export const clearTokens = (): void => {
  httpClient.clearTokens();
};

export const getValidToken = async (): Promise<string> => {
  return httpClient.getValidToken();
};
