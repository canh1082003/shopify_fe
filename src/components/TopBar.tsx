import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Sun, Moon, RefreshCw, ShoppingBag, Clock, Globe } from 'lucide-react';
import { NavigationTab, DashboardSummary } from '../types';
import { useTranslation } from '../i18n';

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
  const { language, setLanguage, t } = useTranslation();

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

  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return {
          title: t('topbar.dashboardTitle'),
          subtitle: t('topbar.dashboardSubtitle'),
        };
      case 'inventory':
        return {
          title: t('topbar.inventoryTitle'),
          subtitle: t('topbar.inventorySubtitle'),
        };
      case 'orders':
        return {
          title: t('topbar.ordersTitle'),
          subtitle: t('topbar.ordersSubtitle'),
        };
      case 'alerts':
        return {
          title: t('topbar.alertsTitle'),
          subtitle: t('topbar.alertsSubtitle'),
        };
      case 'analytics':
        return {
          title: t('topbar.analyticsTitle'),
          subtitle: t('topbar.analyticsSubtitle'),
        };
      case 'settings':
        return {
          title: t('topbar.settingsTitle'),
          subtitle: t('topbar.settingsSubtitle'),
        };
    }
  };

  const { title, subtitle } = getTabTitle();
  const isConnected = summary?.monitoringStatus.isShopifyConnected ?? false;
  const shopDomain = summary?.monitoringStatus.shopDomain || 'stockpilot-demo.myshopify.com';
  const lastSync = summary?.monitoringStatus.lastSyncedAt
    ? new Date(summary.monitoringStatus.lastSyncedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : t('common.justNow');

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
              ? `${t('common.liveShopify')}: ${shopDomain}`
              : `${t('common.demoMode')} (${shopDomain})`
          }
        >
          <span className={`status-dot ${isConnected ? 'connected' : 'demo'}`} />
          <ShoppingBag size={14} />
          <span>{isConnected ? shopDomain : `${shopDomain.split('.')[0]} (${t('common.demoMode')})`}</span>
        </div>

        {/* Last Sync Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}
          title={t('topbar.lastSync')}
        >
          <Clock size={13} />
          <span>{lastSync}</span>
        </div>

        {/* Sync Button */}
        <button
          id="btn-sync-shopify"
          className="btn btn-secondary btn-sm"
          onClick={onSync}
          disabled={isSyncing}
          title={t('common.syncNow')}
        >
          <RefreshCw size={14} className={isSyncing ? 'spin-animation' : ''} />
          <span>{isSyncing ? t('common.syncing') : t('common.syncNow')}</span>
        </button>

        {/* Language Switcher */}
        <button
          id="btn-lang-toggle"
          className="btn btn-secondary btn-sm"
          onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
          title={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          style={{ fontWeight: 700, gap: '4px', padding: '0.4rem 0.65rem' }}
        >
          <Globe size={14} />
          <span>{language === 'vi' ? 'VI' : 'EN'}</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          id="btn-theme-toggle"
          className="btn btn-secondary btn-icon"
          onClick={onToggleTheme}
          title={`${t('topbar.switchTheme')} ${theme === 'dark' ? 'Light' : 'Dark'}`}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
};

export default TopBar;
