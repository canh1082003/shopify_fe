import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Eye,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Alert } from '../../types';
import { api } from '../../services/api';

interface AlertsPageProps {
  onOpenOrderModalById: (orderId: string) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  onOpenOrderModalById,
  onToast,
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'resolved'>('all');
  const [summary, setSummary] = useState<{
    totalActive: number;
    criticalCount: number;
    warningCount: number;
    acknowledgedCount: number;
    resolvedCount: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      const [listRes, summaryRes] = await Promise.all([
        api.getAlerts({
          severity: severityFilter,
          page,
          limit: 10,
        }),
        api.getAlertsSummary(),
      ]);
      setAlerts(listRes.items);
      setTotalPages(listRes.totalPages);
      setSummary(summaryRes);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [severityFilter, page]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (alertId: string, orderNumber: string) => {
    try {
      await api.acknowledgeAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: 'acknowledged' as const, acknowledgedAt: new Date().toISOString() } : a))
      );
      if (summary) {
        setSummary({
          ...summary,
          totalActive: Math.max(0, summary.totalActive - 1),
          acknowledgedCount: summary.acknowledgedCount + 1,
        });
      }
      onToast(
        'info',
        'Alert Acknowledged',
        `Alert for order ${orderNumber} acknowledged. Note: Order remains unfulfilled until completed in Shopify.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to acknowledge alert';
      onToast('error', 'Error', msg);
    }
  };

  return (
    <div>
      {/* Alert Center Metrics Cards */}
      <section className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Active Overdue Alerts</span>
            <div className="metric-icon-box" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <Bell size={20} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value" style={{ color: (summary?.totalActive ?? 0) > 0 ? '#ef4444' : 'inherit' }}>
              {summary?.totalActive ?? '—'}
            </span>
          </div>
          <span className="metric-desc">Unacknowledged active fulfillment alerts</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Critical Overdue</span>
            <div className="metric-icon-box" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <AlertOctagon size={20} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value" style={{ color: '#ef4444' }}>
              {summary?.criticalCount ?? '—'}
            </span>
          </div>
          <span className="metric-desc">Orders strictly past configured SLA deadline</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Warning Window</span>
            <div className="metric-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value" style={{ color: '#f59e0b' }}>
              {summary?.warningCount ?? '—'}
            </span>
          </div>
          <span className="metric-desc">Approaching SLA threshold (lead time window)</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Resolved Shipments</span>
            <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value" style={{ color: '#10b981' }}>
              {summary?.resolvedCount ?? '—'}
            </span>
          </div>
          <span className="metric-desc">Fulfillments completed and verified</span>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="filter-tabs-row">
        <div className="tabs-group">
          <button
            className={`tab-btn ${severityFilter === 'all' ? 'active' : ''}`}
            onClick={() => { setSeverityFilter('all'); setPage(1); }}
          >
            All Alerts
          </button>
          <button
            className={`tab-btn ${severityFilter === 'critical' ? 'active' : ''}`}
            onClick={() => { setSeverityFilter('critical'); setPage(1); }}
          >
            Critical
          </button>
          <button
            className={`tab-btn ${severityFilter === 'warning' ? 'active' : ''}`}
            onClick={() => { setSeverityFilter('warning'); setPage(1); }}
          >
            Warning
          </button>
          <button
            className={`tab-btn ${severityFilter === 'resolved' ? 'active' : ''}`}
            onClick={() => { setSeverityFilter('resolved'); setPage(1); }}
          >
            Resolved
          </button>
        </div>
      </div>

      {/* Alerts Table Panel */}
      <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Alert Severity</th>
                <th>Reason / SLA Status</th>
                <th>Elapsed Duration</th>
                <th>Triggered At</th>
                <th>Alert Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading alert status...
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      No alerts matching this filter
                    </div>
                    <p style={{ fontSize: '0.85rem' }}>
                      All orders are complying with SLA requirements.
                    </p>
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <span
                        style={{ fontWeight: 700, color: 'var(--text-link)', cursor: 'pointer' }}
                        onClick={() => onOpenOrderModalById(alert.orderId)}
                      >
                        {alert.orderNumber}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          alert.severity === 'critical'
                            ? 'badge-critical'
                            : alert.severity === 'warning'
                            ? 'badge-warning'
                            : 'badge-success'
                        }`}
                      >
                        {alert.severity === 'critical' && <AlertOctagon size={12} />}
                        {alert.severity === 'warning' && <AlertTriangle size={12} />}
                        {alert.severity === 'resolved' && <CheckCircle size={12} />}
                        {alert.severity}
                      </span>
                    </td>
                    <td style={{ maxWidth: '300px', fontSize: '0.825rem' }}>
                      {alert.reason}
                    </td>
                    <td style={{ fontWeight: 600, color: alert.severity === 'critical' ? 'var(--critical)' : 'inherit' }}>
                      {alert.elapsedHours}h elapsed
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(alert.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: alert.status === 'active' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          color: alert.status === 'active' ? '#f87171' : 'var(--text-muted)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        {alert.status === 'active' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleAcknowledge(alert.id, alert.orderNumber)}
                            title="Acknowledge alert without falsely marking order fulfilled"
                          >
                            <Check size={13} />
                            <span>Acknowledge</span>
                          </button>
                        )}
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onOpenOrderModalById(alert.orderId)}
                          title="View order details"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        <div className="pagination-row" style={{ padding: '1rem 1.5rem', background: 'var(--bg-card-subtle)' }}>
          <div>
            Showing <strong>{alerts.length}</strong> alerts
          </div>

          <div className="pagination-actions">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.85rem' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
