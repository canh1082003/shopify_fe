import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Sun, Moon, RefreshCw, ShoppingBag } from 'lucide-react';
import { NavigationTab, DashboardSummary } from '../types';

interface TopBarProps {
  activeTab?: NavigationTab;
  summary: DashboardSummary | null;
  onOpenMobile: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSync: () => void;
  isSyncing: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  summary,
  onOpenMobile,
  theme,
  onToggleTheme,
  onSync,
  isSyncing,
}) => {
  const location = useLocation();

  const currentTab: NavigationTab =
    activeTab ||
    (() => {
      if (location.pathname.startsWith('/orders')) return 'orders';
      if (location.pathname.startsWith('/alerts')) return 'alerts';
      if (location.pathname.startsWith('/settings')) return 'settings';
      return 'dashboard';
    })();

  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return {
          title: 'Overview Dashboard',
          subtitle: 'Live fulfillment monitoring & SLA tracking',
        };
      case 'orders':
        return {
          title: 'Order Monitoring',
          subtitle: 'Track pending fulfillment and overdue delivery deadlines',
        };
      case 'alerts':
        return {
          title: 'Alert Center',
          subtitle: 'Critical & warning alerts for overdue customer shipments',
        };
      case 'settings':
        return {
          title: 'Application Settings',
          subtitle: 'Configure overdue threshold, notification rules, and email digests',
        };
    }
  };

  const { title, subtitle } = getTabTitle();
  const isConnected = summary?.monitoringStatus.isShopifyConnected ?? false;
  const shopDomain = summary?.monitoringStatus.shopDomain || 'quickstart-watchdog.myshopify.com';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="mobile-menu-toggle"
          onClick={onOpenMobile}
          aria-label="Open sidebar menu"
        >
          <Menu size={22} />
        </button>
        <div className="page-title-group">
          <h2>{title}</h2>
          <span>{subtitle}</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Shopify Connection Pill */}
        <div
          className="shopify-status-badge"
          title={
            isConnected
              ? `Connected via Shopify App Bridge to ${shopDomain}`
              : `Running in Sandbox Demo Mode (${shopDomain})`
          }
        >
          <span className={`status-dot ${isConnected ? 'connected' : 'demo'}`} />
          <ShoppingBag size={14} />
          <span>{isConnected ? shopDomain : `${shopDomain} (Demo)`}</span>
        </div>

        {/* Sync Button */}
        <button
          id="btn-sync-shopify"
          className="btn btn-secondary btn-sm"
          onClick={onSync}
          disabled={isSyncing}
          title="Trigger manual order evaluation and sync"
        >
          <RefreshCw size={14} className={isSyncing ? 'spin-animation' : ''} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          id="btn-theme-toggle"
          className="btn btn-secondary btn-icon"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
};
