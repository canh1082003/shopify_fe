import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Clock,
  HelpCircle,
  CheckCircle,
  Eye,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { StockAlert, AlertType, AlertStatus } from '../../types';
import { api } from '../../api';
import { MainLayoutContextType } from '../../layouts/MainLayout';
import { toast } from 'sonner';
import { useTranslation } from '../../i18n';

export const AlertsPage: React.FC = () => {
  const { t } = useTranslation();
  const context = useOutletContext<MainLayoutContextType | null>();
  const openInventoryById = context?.openInventoryById || (async () => {});
  const refreshSummary = context?.refreshSummary || (async () => {});

  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [alertTypeFilter, setAlertTypeFilter] = useState<'all' | AlertType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AlertStatus>('all');
  const [summary, setSummary] = useState<{
    totalActive: number;
    outOfStockCount: number;
    lowStockCount: number;
    restockSoonCount: number;
    untrackedCount: number;
    acknowledgedCount: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      const [listRes, summaryRes] = await Promise.all([
        api.alerts.getAlerts({
          alertType: alertTypeFilter,
          status: statusFilter,
          page,
          limit: 10,
        }),
        api.alerts.getAlertsSummary(),
      ]);
      setAlerts(listRes.items);
      setTotalPages(listRes.totalPages);
      setTotalCount(listRes.total);
      setSummary(summaryRes);
    } catch (err) {
      console.error('Failed to load stock alerts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [alertTypeFilter, statusFilter, page]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.alerts.acknowledgeAlert(alertId);
      toast.success('Đã xác nhận cảnh báo', {
        description: 'Cảnh báo đã được ghi nhận. Số lượng tồn kho trên Shopify được giữ nguyên.',
      });
      fetchAlerts();
      refreshSummary();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi xác nhận';
      toast.error('Xác nhận thất bại', { description: msg });
    }
  };

  const handleDismiss = async (alertId: string) => {
    try {
      await api.alerts.dismissAlert(alertId);
      toast.info('Đã ẩn cảnh báo');
      fetchAlerts();
      refreshSummary();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi xử lý';
      toast.error('Không thể ẩn cảnh báo', { description: msg });
    }
  };

  const getAlertBadge = (type: AlertType) => {
    switch (type) {
      case 'out_of_stock':
        return (
          <span className="badge badge-out_of_stock">
            <AlertOctagon size={12} /> Out of Stock
          </span>
        );
      case 'low_stock':
        return (
          <span className="badge badge-low_stock">
            <AlertTriangle size={12} /> Low Stock
          </span>
        );
      case 'restock_soon':
        return (
          <span className="badge badge-restock_soon">
            <Clock size={12} /> Restock Soon
          </span>
        );
      case 'untracked':
        return (
          <span className="badge badge-untracked">
            <HelpCircle size={12} /> Untracked
          </span>
        );
    }
  };

  return (
    <div>
      {/* Alert KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div
          className="kpi-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setAlertTypeFilter('all')}
        >
          <div className="kpi-card-header">
            <span className="kpi-label">{t('alerts.activeCount')}</span>
            <Bell size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{summary?.totalActive ?? 0}</span>
          </div>
          <span className="kpi-subtext">Requiring merchant review</span>
        </div>

        <div
          className="kpi-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setAlertTypeFilter('out_of_stock')}
        >
          <div className="kpi-card-header">
            <span className="kpi-label">{t('dashboard.outOfStock')}</span>
            <AlertOctagon size={18} style={{ color: 'var(--danger)' }} />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: 'var(--danger)' }}>
              {summary?.outOfStockCount ?? 0}
            </span>
          </div>
          <span className="kpi-subtext">Immediate action needed</span>
        </div>

        <div
          className="kpi-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setAlertTypeFilter('low_stock')}
        >
          <div className="kpi-card-header">
            <span className="kpi-label">{t('dashboard.lowStock')}</span>
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: 'var(--warning)' }}>
              {summary?.lowStockCount ?? 0}
            </span>
          </div>
          <span className="kpi-subtext">Under low threshold</span>
        </div>

        <div
          className="kpi-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setAlertTypeFilter('restock_soon')}
        >
          <div className="kpi-card-header">
            <span className="kpi-label">{t('alerts.filterSoon')}</span>
            <Clock size={18} style={{ color: 'var(--info)' }} />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: 'var(--info)' }}>
              {summary?.restockSoonCount ?? 0}
            </span>
          </div>
          <span className="kpi-subtext">Within lead-time horizon</span>
        </div>

        <div
          className="kpi-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setStatusFilter('acknowledged')}
        >
          <div className="kpi-card-header">
            <span className="kpi-label">{t('alerts.acknowledged')}</span>
            <CheckCircle size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{summary?.acknowledgedCount ?? 0}</span>
          </div>
          <span className="kpi-subtext">Reviewed by merchant</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="controls-bar">
        <div className="tabs-group">
          <button
            className={`tab-pill ${alertTypeFilter === 'all' ? 'active' : ''}`}
            onClick={() => {
              setAlertTypeFilter('all');
              setPage(1);
            }}
          >
            {t('alerts.filterAll')}
          </button>
          <button
            className={`tab-pill ${alertTypeFilter === 'out_of_stock' ? 'active' : ''}`}
            onClick={() => {
              setAlertTypeFilter('out_of_stock');
              setPage(1);
            }}
          >
            {t('alerts.filterOut')}
          </button>
          <button
            className={`tab-pill ${alertTypeFilter === 'low_stock' ? 'active' : ''}`}
            onClick={() => {
              setAlertTypeFilter('low_stock');
              setPage(1);
            }}
          >
            {t('alerts.filterLow')}
          </button>
          <button
            className={`tab-pill ${alertTypeFilter === 'restock_soon' ? 'active' : ''}`}
            onClick={() => {
              setAlertTypeFilter('restock_soon');
              setPage(1);
            }}
          >
            {t('alerts.filterSoon')}
          </button>
          <button
            className={`tab-pill ${alertTypeFilter === 'untracked' ? 'active' : ''}`}
            onClick={() => {
              setAlertTypeFilter('untracked');
              setPage(1);
            }}
          >
            Untracked
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as any);
            setPage(1);
          }}
          className="search-input"
          style={{ width: 'auto', paddingLeft: '12px', cursor: 'pointer' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Alerts Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product & Variant</th>
              <th>SKU</th>
              <th>Location</th>
              <th>Alert Category</th>
              <th>Current Qty</th>
              <th>Threshold</th>
              <th>Runway</th>
              <th>Reason & Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={9}
                  style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}
                >
                  Loading stock alerts...
                </td>
              </tr>
            ) : alerts.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}
                >
                  No stock alerts found for the current selection.
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{alert.productTitle}</span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {alert.variantTitle}
                      </span>
                    </div>
                  </td>
                  <td>
                    <code style={{ color: 'var(--primary)', fontWeight: 600 }}>{alert.sku}</code>
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {alert.locationName}
                  </td>
                  <td>{getAlertBadge(alert.alertType)}</td>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        color: alert.currentQuantity === 0 ? 'var(--danger)' : 'var(--text-main)',
                      }}
                    >
                      {alert.currentQuantity}
                    </span>
                  </td>
                  <td>{alert.threshold}</td>
                  <td>
                    {alert.estimatedDaysRemaining !== null ? (
                      <span
                        style={{
                          fontWeight: 600,
                          color:
                            alert.estimatedDaysRemaining <= 3 ? 'var(--danger)' : 'var(--warning)',
                        }}
                      >
                        {alert.estimatedDaysRemaining} days
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12.5px' }}>{alert.reason}</span>
                      <span
                        style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}
                      >
                        State: <strong>{alert.status}</strong> •{' '}
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openInventoryById(alert.variantId)}
                        title="View inventory details and reorder recommendations"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>

                      {alert.status === 'active' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAcknowledge(alert.id)}
                          title="Acknowledge alert without modifying Shopify stock"
                        >
                          <Check size={13} />
                          <span>Acknowledge</span>
                        </button>
                      )}

                      {alert.status !== 'resolved' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDismiss(alert.id)}
                          title="Dismiss alert"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Server Pagination */}
        <div className="pagination-bar">
          <div>
            Showing <strong>{alerts.length}</strong> of <strong>{totalCount}</strong> alerts
          </div>
          <div className="pagination-actions">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span style={{ padding: '0 8px', fontWeight: 600 }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;
