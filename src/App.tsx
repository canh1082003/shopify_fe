import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { OrdersPage } from './features/orders/OrdersPage';
import { AlertsPage } from './features/alerts/AlertsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { ToastContainer } from './components/Toast';
import { api } from './services/api';
import { NavigationTab, DashboardSummary, Order, ToastMessage } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ow_theme') as 'dark' | 'light') || 'dark';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Apply theme to HTML tag
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ow_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Toast Helper
  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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
      addToast('success', 'Sync Complete', res.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      addToast('error', 'Sync Failed', msg);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle opening modal by Order ID (e.g. from Alerts Page)
  const handleOpenOrderById = async (orderId: string) => {
    try {
      const order = await api.getOrderById(orderId);
      setSelectedOrder(order);
    } catch (err) {
      addToast('error', 'Error', 'Could not retrieve order details');
    }
  };

  return (
    <div className="saas-layout">
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

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
