import { httpClient } from '../client';
import { NOTIFICATIONS_TEST } from '../../constants/apiEndpoints';

export interface TestNotificationResult {
  success: boolean;
  isSimulated: boolean;
  message: string;
}

export const sendTestNotification = async (email?: string): Promise<TestNotificationResult> => {
  return httpClient.request<TestNotificationResult>(NOTIFICATIONS_TEST, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};
