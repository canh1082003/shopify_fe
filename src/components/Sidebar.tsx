import React from 'react';
import { ShieldAlert, LayoutDashboard, ShoppingCart, Bell, Settings, X } from 'lucide-react';
import { NavigationTab, DashboardSummary } from '../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
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
  const activeAlertsCount = summary?.monitoringStatus.activeAlertsCount || 0;
  const shopDomain = summary?.monitoringStatus.shopDomain || 'quickstart-watchdog.myshopify.com';
  const isDemo = summary?.monitoringStatus.isDemoMode ?? true;

  const handleNavClick = (tab: NavigationTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-icon-box">
          <ShieldAlert size={20} />
        </div>
        <div className="brand-titles">
          <h1>Order Watchdog</h1>
          <span>Shopify Fulfillment SaaS</span>
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

      <nav className="sidebar-nav">
        <button
          id="nav-overview"
          className={`nav-item-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleNavClick('dashboard')}
        >
          <div className="nav-item-left">
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </div>
        </button>

        <button
          id="nav-orders"
          className={`nav-item-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => handleNavClick('orders')}
        >
          <div className="nav-item-left">
            <ShoppingCart size={18} />
            <span>Orders</span>
          </div>
          {summary && summary.overdueOrders > 0 && (
            <span
              className="badge badge-critical"
              style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}
            >
              {summary.overdueOrders}
            </span>
          )}
        </button>

        <button
          id="nav-alerts"
          className={`nav-item-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => handleNavClick('alerts')}
        >
          <div className="nav-item-left">
            <Bell size={18} />
            <span>Alert Center</span>
          </div>
          {activeAlertsCount > 0 && (
            <span className="nav-alert-badge">{activeAlertsCount}</span>
          )}
        </button>

        <button
          id="nav-settings"
          className={`nav-item-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleNavClick('settings')}
        >
          <div className="nav-item-left">
            <Settings size={18} />
            <span>Settings</span>
          </div>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="store-pill-footer">
          <div className="store-info-text">
            <span className="store-domain" title={shopDomain}>
              {shopDomain}
            </span>
            <span className="store-plan-tag">Shopify Plus Store</span>
          </div>
          {isDemo && <span className="demo-chip">Sandbox</span>}
        </div>
      </div>
    </aside>
  );
};
