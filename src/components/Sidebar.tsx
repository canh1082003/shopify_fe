import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Bell,
  TrendingUp,
  Settings,
  X,
  Store,
  Layers,
} from 'lucide-react';
import { NavigationTab, DashboardSummary } from '../types';
import { useTranslation } from '../i18n';

interface SidebarProps {
  activeTab?: NavigationTab;
  onSelectTab?: (tab: NavigationTab) => void;
  summary: DashboardSummary | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  summary,
  mobileOpen,
  onCloseMobile,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const currentTab: NavigationTab =
    activeTab ||
    (() => {
      if (location.pathname.startsWith('/inventory')) return 'inventory';
      if (location.pathname.startsWith('/orders')) return 'orders';
      if (location.pathname.startsWith('/alerts')) return 'alerts';
      if (location.pathname.startsWith('/analytics')) return 'analytics';
      if (location.pathname.startsWith('/settings')) return 'settings';
      return 'dashboard';
    })();

  const activeAlertsCount = summary?.monitoringStatus.activeAlertsCount || 0;
  const shopDomain = summary?.monitoringStatus.shopDomain || 'stockpilot-demo.myshopify.com';
  const isDemo = summary?.monitoringStatus.isDemoMode ?? true;

  const handleNavClick = (tab: NavigationTab) => {
    if (onSelectTab) {
      onSelectTab(tab);
    }
    switch (tab) {
      case 'dashboard':
        navigate('/');
        break;
      case 'inventory':
        navigate('/inventory');
        break;
      case 'orders':
        navigate('/orders');
        break;
      case 'alerts':
        navigate('/alerts');
        break;
      case 'analytics':
        navigate('/analytics');
        break;
      case 'settings':
        navigate('/settings');
        break;
    }
    onCloseMobile();
  };

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-box">
          <Layers size={20} />
        </div>
        <div className="brand-titles">
          <h1>StockPilot</h1>
          <span>{t('nav.tagline')}</span>
        </div>
        {mobileOpen && (
          <button
            onClick={onCloseMobile}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Primary Navigation Menu */}
      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleNavClick('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>{t('nav.dashboard')}</span>
        </button>

        <button
          className={`sidebar-nav-item ${currentTab === 'inventory' ? 'active' : ''}`}
          onClick={() => handleNavClick('inventory')}
        >
          <Boxes size={18} />
          <span>{t('nav.inventory')}</span>
        </button>

        <button
          className={`sidebar-nav-item ${currentTab === 'orders' ? 'active' : ''}`}
          onClick={() => handleNavClick('orders')}
        >
          <ShoppingCart size={18} />
          <span>{t('nav.orders')}</span>
        </button>

        <button
          className={`sidebar-nav-item ${currentTab === 'alerts' ? 'active' : ''}`}
          onClick={() => handleNavClick('alerts')}
        >
          <Bell size={18} />
          <span>{t('nav.alerts')}</span>
          {activeAlertsCount > 0 && <span className="nav-item-badge">{activeAlertsCount}</span>}
        </button>

        <button
          className={`sidebar-nav-item ${currentTab === 'analytics' ? 'active' : ''}`}
          onClick={() => handleNavClick('analytics')}
        >
          <TrendingUp size={18} />
          <span>{t('nav.analytics')}</span>
        </button>

        <button
          className={`sidebar-nav-item ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleNavClick('settings')}
        >
          <Settings size={18} />
          <span>{t('nav.settings')}</span>
        </button>
      </nav>

      {/* Connected Store Profile Footer */}
      <div className="sidebar-footer">
        <div className="store-card">
          <Store size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <div className="store-info">
            <span className="store-name" title={shopDomain}>
              {shopDomain.split('.')[0]}
            </span>
            <span className="store-plan">
              {isDemo ? t('common.demoMode') : t('common.liveShopify')}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
