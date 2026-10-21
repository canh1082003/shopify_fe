import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { OrdersPage } from './features/orders/OrdersPage';
import { AlertsPage } from './features/alerts/AlertsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { api } from './services/api';
import { NavigationTab, DashboardSummary, Order } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ow_theme') as 'dark' | 'light') || 'dark';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Apply theme to HTML tag
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ow_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Toast Helper utilizing sonner
  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    if (type === 'success') {
      toast.success(title, { description: message });
    } else if (type === 'error') {
      toast.error(title, { description: message });
    } else {
      toast.info(title, { description: message });
    }
  }, []);

  // Fetch Dashboard Summary
  const fetchSummary = useCallback(async () => {
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch dashboard summary:', err);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [fetchSummary]);

  // Handle Manual Sync
  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const res = await api.syncShopify();
      await fetchSummary();
      toast.success('Đồng bộ hoàn tất', { description: res.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đồng bộ thất bại';
      toast.error('Lỗi đồng bộ', { description: msg });
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle opening modal by Order ID (e.g. from Alerts Page)
  const handleOpenOrderById = async (orderId: string) => {
    try {
      const order = await api.getOrderById(orderId);
      setSelectedOrder(order);
    } catch {
      toast.error('Lỗi truy vấn', { description: 'Không tìm thấy chi tiết đơn hàng' });
    }
  };

  return (
    <div className="saas-layout">
      {/* Interactive Sonner Toast Notification Center */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        theme={theme}
        toastOptions={{
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
          },
        }}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        summary={summary}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="main-wrapper">
        <TopBar
          activeTab={activeTab}
          summary={summary}
          onOpenMobile={() => setMobileOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onSync={handleSync}
          isSyncing={isSyncing}
        />

        <main className="page-content">
          {activeTab === 'dashboard' && (
            <DashboardPage
              summary={summary}
              onOpenOrderModal={setSelectedOrder}
              onNavigateToOrders={() => setActiveTab('orders')}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersPage onOpenOrderModal={setSelectedOrder} />
          )}

          {activeTab === 'alerts' && (
            <AlertsPage
              onOpenOrderModalById={handleOpenOrderById}
              onToast={addToast}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage onToast={addToast} />
          )}
        </main>
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
};
