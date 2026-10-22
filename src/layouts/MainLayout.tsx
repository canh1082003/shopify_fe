import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { InventoryDetailModal } from '../components/InventoryDetailModal';
import { api } from '../api';
import { DashboardSummary, Order, ProductVariant, InventoryItemDetail } from '../types';
import { toast } from 'sonner';

export interface MainLayoutContextType {
  summary: DashboardSummary | null;
  refreshSummary: () => Promise<void>;
  openOrderModal: (order: Order) => void;
  openOrderById: (orderId: string) => Promise<void>;
  openInventoryModal: (item: ProductVariant | InventoryItemDetail) => void;
  openInventoryById: (variantId: string) => Promise<void>;
  onToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const MainLayout: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItemDetail | null>(
    null
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('stockpilot_theme') as 'dark' | 'light') || 'light';
  });

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('stockpilot_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Toast Helper
  const handleToast = useCallback(
    (type: 'success' | 'error' | 'info', title: string, message: string) => {
      if (type === 'success') {
        toast.success(title, { description: message });
      } else if (type === 'error') {
        toast.error(title, { description: message });
      } else {
        toast.info(title, { description: message });
      }
    },
    []
  );

  // Fetch Dashboard Summary
  const fetchSummary = useCallback(async () => {
    try {
      const data = await api.dashboard.getDashboardSummary();
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
      const res = await api.integrations.syncShopify();
      await fetchSummary();
      toast.success('Đồng bộ thành công', { description: res.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đồng bộ thất bại';
      toast.error('Lỗi đồng bộ', { description: msg });
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle opening modal by Order ID
  const handleOpenOrderById = async (orderId: string) => {
    try {
      const order = await api.orders.getOrderById(orderId);
      setSelectedOrder(order);
    } catch {
      toast.error('Lỗi truy vấn', { description: 'Không tìm thấy chi tiết đơn hàng' });
    }
  };

  // Handle opening inventory detail modal
  const handleOpenInventoryById = async (variantId: string) => {
    try {
      const item = await api.inventory.getInventoryItem(variantId);
      setSelectedInventoryItem(item);
    } catch {
      toast.error('Lỗi truy vấn', { description: 'Không tìm thấy chi tiết tồn kho sản phẩm' });
    }
  };

  const handleOpenInventoryModal = async (item: ProductVariant | InventoryItemDetail) => {
    try {
      const detail = await api.inventory.getInventoryItem(item.id);
      setSelectedInventoryItem(detail);
    } catch {
      // Fallback to variant info if detail endpoint has issues
      setSelectedInventoryItem(item as InventoryItemDetail);
    }
  };

  const contextValue: MainLayoutContextType = {
    summary,
    refreshSummary: fetchSummary,
    openOrderModal: (order: Order) => setSelectedOrder(order),
    openOrderById: handleOpenOrderById,
    openInventoryModal: handleOpenInventoryModal,
    openInventoryById: handleOpenInventoryById,
    onToast: handleToast,
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        summary={summary}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <TopBar
          summary={summary}
          onOpenMobile={() => setMobileMenuOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onSync={handleSync}
          isSyncing={isSyncing}
        />

        <main className="page-container">
          <Outlet context={contextValue} />
        </main>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

      {/* Inventory Item Detail Modal */}
      {selectedInventoryItem && (
        <InventoryDetailModal
          item={selectedInventoryItem}
          onClose={() => setSelectedInventoryItem(null)}
          onUpdated={() => {
            fetchSummary();
          }}
        />
      )}
    </div>
  );
};

export default MainLayout;
