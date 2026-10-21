import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Package,
  AlertOctagon,
  Clock,
  TrendingUp,
  Activity,
  ExternalLink,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { DashboardSummary, DashboardTrend, Order } from '../../types';
import { api } from '../../api';
import { MainLayoutContextType } from '../../layouts/MainLayout';

export interface DashboardPageProps {
  summary?: DashboardSummary | null;
  onOpenOrderModal?: (order: Order) => void;
  onNavigateToOrders?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = (props) => {
  const context = useOutletContext<MainLayoutContextType | null>();
  const navigate = useNavigate();

  const summary = props.summary !== undefined ? props.summary : (context?.summary ?? null);
  const onOpenOrderModal = props.onOpenOrderModal || context?.openOrderModal || (() => {});
  const onNavigateToOrders = props.onNavigateToOrders || (() => navigate('/orders'));
  const [trends, setTrends] = useState<DashboardTrend | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(7);
  const [recentOverdue, setRecentOverdue] = useState<Order[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [trendData, ordersRes] = await Promise.all([
          api.getDashboardTrends(selectedPeriod),
          api.getOrders({ status: 'overdue', limit: 5 }),
        ]);
        setTrends(trendData);
        setRecentOverdue(ordersRes.items);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    };
    loadDashboardData();
  }, [selectedPeriod]);

  // SVG Chart Dimensions & Calculations
  const chartPoints = trends?.points || [];
  const maxVal = Math.max(
    ...chartPoints.map((p) => Math.max(p.overdueCount, p.fulfilledCount, 1)),
    5
  );
  const chartWidth = 720;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  const getCoordinates = (index: number, value: number) => {
    const x =
      paddingX + (index / Math.max(1, chartPoints.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (value / maxVal) * (chartHeight - paddingY * 2);
    return { x, y };
  };

  const overduePathData = chartPoints
    .map((p, i) => {
      const { x, y } = getCoordinates(i, p.overdueCount);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const fulfilledPathData = chartPoints
    .map((p, i) => {
      const { x, y } = getCoordinates(i, p.fulfilledCount);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div>
      {/* 4 Primary Metric Cards */}
      <section className="metrics-grid">
        {/* Metric 1: Total Orders */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Total Monitored Orders</span>
            <div
              className="metric-icon-box"
              style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
            >
              <Package size={20} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{summary?.totalOrders ?? '—'}</span>
            {summary?.comparison?.totalOrdersDiff && (
              <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                +{summary.comparison.totalOrdersDiff}%
              </span>
            )}
          </div>
          <span className="metric-desc">Total orders within active monitoring window</span>
        </div>

        {/* Metric 2: Overdue Orders */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Overdue Orders</span>
            <div
              className="metric-icon-box"
              style={{ background: 'var(--critical-bg)', color: 'var(--critical)' }}
            >
              <AlertOctagon size={20} />
            </div>
          </div>
          <div className="metric-value-row">
            <span
              className="metric-value"
              style={{ color: (summary?.overdueOrders ?? 0) > 0 ? 'var(--critical)' : 'inherit' }}
            >
              {summary?.overdueOrders ?? '—'}
            </span>
            {(summary?.overdueOrders ?? 0) > 0 && (
              <span className="badge badge-critical" style={{ fontSize: '0.72rem' }}>
                Attention Required
              </span>
            )}
          </div>
          <span className="metric-desc">
            Exceeding configured {summary?.monitoringStatus.thresholdHours || 24}h SLA deadline
          </span>
        </div>

        {/* Metric 3: Pending Fulfillment */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Pending Fulfillment</span>
            <div
              className="metric-icon-box"
              style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}
            >
              <Clock size={20} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{summary?.pendingFulfillment ?? '—'}</span>
          </div>
          <span className="metric-desc">
            Unfulfilled and partially fulfilled customer shipments
          </span>
        </div>

        {/* Metric 4: On-Time Fulfillment Rate */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">On-Time Fulfillment Rate</span>
            <div
              className="metric-icon-box"
              style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
            >
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value" style={{ color: 'var(--success)' }}>
              {summary?.onTimeRate !== undefined ? `${summary.onTimeRate}%` : '—'}
            </span>
          </div>
          <span className="metric-desc">
            Eligible orders dispatched prior to configured deadline
          </span>
        </div>
      </section>

      {/* Monitoring Status & Trend Section */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}
      >
        {/* Trend Chart Panel */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Fulfillment &amp; Overdue Trends</h3>
              <p className="panel-subtitle">
                Historical comparison between overdue orders and fulfilled shipments
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className={`btn btn-sm ${selectedPeriod === 7 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedPeriod(7)}
              >
                7 Days
              </button>
              <button
                className={`btn btn-sm ${selectedPeriod === 30 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedPeriod(30)}
              >
                30 Days
              </button>
              <button
                className={`btn btn-sm ${selectedPeriod === 90 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedPeriod(90)}
              >
                90 Days
              </button>
            </div>
          </div>

          {/* SVG Trend Chart */}
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ width: '100%', maxHeight: '250px', display: 'block' }}
            >
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = paddingY + ratio * (chartHeight - paddingY * 2);
                const val = Math.round(maxVal * (1 - ratio));
                return (
                  <g key={ratio}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="var(--border-subtle)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 10}
                      y={y + 4}
                      fill="var(--text-muted)"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Fulfilled line (Shopify Emerald) */}
              {fulfilledPathData && (
                <path
                  d={fulfilledPathData}
                  fill="none"
                  stroke="#00a47c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Overdue line (Shopify Crimson) */}
              {overduePathData && (
                <path
                  d={overduePathData}
                  fill="none"
                  stroke="#eb5757"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Interactive Dots */}
              {chartPoints.map((p, i) => {
                const overdueCoord = getCoordinates(i, p.overdueCount);
                const fulfilledCoord = getCoordinates(i, p.fulfilledCount);
                return (
                  <g key={p.date}>
                    <circle
                      cx={overdueCoord.x}
                      cy={overdueCoord.y}
                      r="4"
                      fill="#eb5757"
                      stroke="var(--bg-card)"
                      strokeWidth="2"
                    >
                      <title>{`${p.date}: ${p.overdueCount} overdue`}</title>
                    </circle>
                    <circle
                      cx={fulfilledCoord.x}
                      cy={fulfilledCoord.y}
                      r="4"
                      fill="#00a47c"
                      stroke="var(--bg-card)"
                      strokeWidth="2"
                    >
                      <title>{`${p.date}: ${p.fulfilledCount} fulfilled`}</title>
                    </circle>
                    {/* Date label */}
                    {i % Math.ceil(chartPoints.length / 7) === 0 && (
                      <text
                        x={overdueCoord.x}
                        y={chartHeight - 8}
                        fill="var(--text-muted)"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {p.date.slice(5)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2rem',
              marginTop: '1rem',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span
                style={{ width: '12px', height: '3px', background: '#eb5757', borderRadius: '2px' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Overdue Orders</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span
                style={{ width: '12px', height: '3px', background: '#00a47c', borderRadius: '2px' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Fulfilled Orders</span>
            </div>
          </div>
        </div>

        {/* Monitoring Status Info Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.4rem 1.6rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                background: summary?.monitoringStatus.isShopifyConnected
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(245, 158, 11, 0.15)',
                color: summary?.monitoringStatus.isShopifyConnected ? '#10b981' : '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={22} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Engine Status
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {summary?.monitoringStatus.isShopifyConnected
                  ? 'Shopify App Connected'
                  : 'Sandbox Demo Mode'}
              </div>
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Active SLA Threshold
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8' }}>
              {summary?.monitoringStatus.thresholdHours || 24} Hours elapsed
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Email Notifications
            </div>
            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: summary?.monitoringStatus.emailEnabled ? '#10b981' : 'var(--text-muted)',
              }}
            >
              {summary?.monitoringStatus.emailEnabled ? 'Enabled (Alerts Active)' : 'Disabled'}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Last Synchronized
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {summary?.monitoringStatus.lastSyncedAt
                ? new Date(summary.monitoringStatus.lastSyncedAt).toLocaleTimeString()
                : 'Just now'}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Overdue Orders Table */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Recent Overdue Orders</h3>
            <p className="panel-subtitle">
              Customer orders that have currently exceeded the configured fulfillment SLA
            </p>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={onNavigateToOrders}>
            View All Orders &rarr;
          </button>
        </div>

        {recentOverdue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <CheckCircle size={36} color="#10b981" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
              All clear! No overdue orders detected.
            </div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              All pending orders are currently within their processing threshold.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Order Date</th>
                  <th>Fulfillment Status</th>
                  <th>Overdue Duration</th>
                  <th>Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentOverdue.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span
                        style={{ fontWeight: 700, color: 'var(--text-link)', cursor: 'pointer' }}
                        onClick={() => onOpenOrderModal(order)}
                      >
                        {order.orderNumber}
                      </span>
                    </td>
                    <td>{order.customerName || 'Anonymous Customer'}</td>
                    <td>
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <span
                        className={`badge ${order.fulfillmentStatus === 'partial' ? 'badge-warning' : 'badge-critical'}`}
                      >
                        {order.fulfillmentStatus === 'partial'
                          ? 'Partially Fulfilled'
                          : 'Unfulfilled'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--critical)', fontWeight: 700 }}>
                        +{Math.floor(order.overdueMinutes / 60)}h {order.overdueMinutes % 60}m
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>${order.totalAmount.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenOrderModal(order)}
                          title="View order line items & SLA breakdown"
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>
                        <a
                          href={order.shopifyUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                          title="Fulfill order directly in Shopify Admin"
                        >
                          <ExternalLink size={13} />
                          <span>Shopify</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
