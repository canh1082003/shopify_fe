import { useState, useCallback } from 'react';
import { api, TokenStatusInfo } from '../api';
import { toast } from 'sonner';

export function useAuth() {
  const [tokenInfo, setTokenInfo] = useState<TokenStatusInfo | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const verifyToken = useCallback(async () => {
    try {
      setIsVerifying(true);
      const res = await api.auth.verifyToken();
      setTokenInfo(res);
      if (res.valid) {
        toast.success('Xác thực Token thành công', {
          description: `Shop: ${res.shop?.domain || 'Shopify'} | Thời hạn còn lại: ${res.remainingSeconds ?? '—'} giây`,
        });
      } else {
        toast.error('Token không hợp lệ hoặc đã hết hạn', {
          description: res.error || 'Vui lòng bấm làm mới token.',
        });
      }
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kiểm tra token';
      toast.error('Lỗi kiểm tra token', { description: msg });
      throw err;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await api.auth.refreshAccessToken();
      const res = await api.auth.verifyToken();
      setTokenInfo(res);
      if (!res.valid) {
        toast.error('Token vẫn không hợp lệ sau khi làm mới', {
          description: res.error || 'Vui lòng thử lại.',
        });
        return res;
      }
      toast.success('Làm mới token thành công', {
        description: `Thời hạn: ${res.remainingSeconds ?? '—'} giây.`,
      });
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể làm mới token';
      toast.error('Lỗi làm mới token', { description: msg });
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const clearSession = useCallback(() => {
    api.auth.clearTokens();
    setTokenInfo(null);
    toast.info('Đã xóa phiên đăng nhập');
  }, []);

  return {
    tokenInfo,
    isVerifying,
    isRefreshing,
    verifyToken,
    refreshToken,
    clearSession,
  };
}
