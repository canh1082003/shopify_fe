import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Package,
  Boxes,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  DollarSign,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { DashboardSummary, DashboardTrend } from '../../types';
import { api } from '../../api';
import { MainLayoutContextType } from '../../layouts/MainLayout';
import { useTranslation } from '../../i18n';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const context = useOutletContext<MainLayoutContextType | null>();
  const navigate = useNavigate();

  const summary: DashboardSummary | null = context?.summary ?? null;
  const openOrderModal = context?.openOrderModal || (() => {});
  const openInventoryById = context?.openInventoryById || (async () => {});

  const [trends, setTrends] = useState<DashboardTrend | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(7);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);

  useEffect(() => {
    const loadTrends = async () => {
      try {
        setIsLoadingTrends(true);
        const trendData = await api.dashboard.getSalesTrends(selectedPeriod);
        setTrends(trendData);
      } catch (err) {
        console.error('Failed to load sales trends:', err);
      } finally {
        setIsLoadingTrends(false);
      }
    };
    loadTrends();
  }, [selectedPeriod]);

  const kpis = summary?.kpis || {
    totalProducts: 7,
    totalInventoryUnits: 140,
    lowStockProducts: 4,
    outOfStockProducts: 2,
    ordersThisMonth: 6,
    estimatedInventoryValue: 3968,
    currency: 'USD',
  };

  const health = summary?.inventoryHealth || {
    healthyCount: 5,
    lowStockCount: 4,
    outOfStockCount: 2,
    untrackedCount: 1,
    totalTracked: 11,
  };

  const totalTrackedVariants = Math.max(
    1,
    health.healthyCount + health.lowStockCount + health.outOfStockCount + health.untrackedCount
  );
  const pctHealthy = Math.round((health.healthyCount / totalTrackedVariants) * 100);
  const pctLow = Math.round((health.lowStockCount / totalTrackedVariants) * 100);
  const pctOut = Math.round((health.outOfStockCount / totalTrackedVariants) * 100);
  const pctUntracked = Math.max(0, 100 - pctHealthy - pctLow - pctOut);

  // SVG Chart Calculation for Sales Trend
  const chartPoints = trends?.points || [];
  const maxUnits = Math.max(...chartPoints.map((p) => p.unitsSold), 10);
  const chartWidth = 620;
  const chartHeight = 180;
  const padX = 35;
  const padY = 25;

  const getCoordinates = (index: number, val: number) => {
    const x = padX + (index / Math.max(1, chartPoints.length - 1)) * (chartWidth - padX * 2);
    const y = chartHeight - padY - (val / maxUnits) * (chartHeight - padY * 2);
    return { x, y };
  };

  const pathData = chartPoints
    .map((p, i) => {
      const { x, y } = getCoordinates(i, p.unitsSold);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const areaData =
    chartPoints.length > 0
      ? `${pathData} L ${getCoordinates(chartPoints.length - 1, 0).x} ${chartHeight - padY} L ${getCoordinates(0, 0).x} ${chartHeight - padY} Z`
      : '';

  return (
    <div>
      {/* 6 KPI Cards Grid */}
      <section className="kpis-grid">
        {/* KPI 1: Total Products */}
        <div
          className="kpi-card"
          onClick={() => navigate('/inventory')}
          style={{ cursor: 'pointer' }}
        >
          <div className="kpi-card-header">
            <span className="kpi-label">{t('dashboard.kpiTotalProducts')}</span>
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: 'var(--primary-subtle)', color: 'var(--primary)' }}
            >
              <Package size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{kpis.totalProducts}</span>
          </div>
          <span className="kpi-subtext">Active catalog items</span>
        </div>

        {/* KPI 2: Total Inventory Units */}
        <div
          className="kpi-card"
          onClick={() => navigate('/inventory')}
          style={{ cursor: 'pointer' }}
        >
          <div className="kpi-card-header">
            <span className="kpi-label">{t('dashboard.kpiTotalUnits')}</span>
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284C7' }}
            >
              <Boxes size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{kpis.totalInventoryUnits.toLocaleString()}</span>
          </div>
          <span className="kpi-subtext">Tracked stock across locations</span>
        </div>

        {/* KPI 3: Low Stock Products */}
        <div className="kpi-card" onClick={() => navigate('/alerts')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">{t('dashboard.kpiLowStock')}</span>
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: 'var(--warning)' }}>
              {kpis.lowStockProducts}
            </span>
          </div>
          <span className="kpi-subtext">Below configured threshold</span>
        </div>

        {/* KPI 4: Out of Stock Products */}
        <div className="kpi-card" onClick={() => navigate('/alerts')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">{t('dashboard.kpiOutOfStock')}</span>
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}
            >
              <AlertOctagon size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: 'var(--danger)' }}>
              {kpis.outOfStockProducts}
            </span>
          </div>
          <span className="kpi-subtext">Zero units available</span>
        </div>

        {/* KPI 5: Orders This Month */}
        <div className="kpi-card" onClick={() => navigate('/orders')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-header">
            <span className="kpi-label">{t('dashboard.kpiOrdersMonth')}</span>
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED' }}
            >
              <Calendar size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{kpis.ordersThisMonth}</span>
          </div>
          <span className="kpi-subtext">Current billing cycle</span>
        </div>

        {/* KPI 6: Estimated Inventory Value */}
        <div
          className="kpi-card"
          onClick={() => navigate('/inventory')}
          style={{ cursor: 'pointer' }}
        >
          <div className="kpi-card-header">
            <span className="kpi-label">{t('dashboard.kpiEstimatedValue')}</span>
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}
            >
              <DollarSign size={18} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">${kpis.estimatedInventoryValue.toLocaleString()}</span>
          </div>
          <span className="kpi-subtext">At unit cost valuation</span>
        </div>
      </section>

      {/* Inventory Health Section */}
      <section className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>{t('dashboard.inventoryHealth')}</h3>
            <p>Distribution of inventory variants by operational availability</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/inventory')}>
            <span>{t('inventory.filterAll')}</span>
            <ArrowRight size={14} />
          </button>
        </div>
        <div className="card-body">
          <div className="health-progress-bar">
            <div
              className="progress-segment progress-healthy"
              style={{ width: `${pctHealthy}%` }}
              title={`Healthy: ${pctHealthy}%`}
            />
            <div
              className="progress-segment progress-low"
              style={{ width: `${pctLow}%` }}
              title={`Low Stock: ${pctLow}%`}
            />
            <div
              className="progress-segment progress-out"
              style={{ width: `${pctOut}%` }}
              title={`Out of Stock: ${pctOut}%`}
            />
            <div
              className="progress-segment progress-untracked"
              style={{ width: `${pctUntracked}%` }}
              title={`Untracked: ${pctUntracked}%`}
            />
          </div>

          <div className="health-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: 'var(--success)' }} />
              <span>
                {t('dashboard.healthy')}: <strong>{health.healthyCount}</strong> ({pctHealthy}%)
              </span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: 'var(--warning)' }} />
              <span>
                {t('dashboard.lowStock')}: <strong>{health.lowStockCount}</strong> ({pctLow}%)
              </span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: 'var(--danger)' }} />
              <span>
                {t('dashboard.outOfStock')}: <strong>{health.outOfStockCount}</strong> ({pctOut}%)
              </span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: 'var(--neutral)' }} />
              <span>
                {t('dashboard.untracked')}: <strong>{health.untrackedCount}</strong> ({pctUntracked}
                %)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Grid: Sales Velocity & Top Selling */}
      <div className="dashboard-grid">
        {/* Sales Trend Chart */}
        <section className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title-group">
              <h3>{t('dashboard.salesTrend')}</h3>
              <p>Daily units sold over selected reporting period</p>
            </div>
            <div className="tabs-group">
              <button
                className={`tab-pill ${selectedPeriod === 7 ? 'active' : ''}`}
                onClick={() => setSelectedPeriod(7)}
              >
                {t('dashboard.days7')}
              </button>
              <button
                className={`tab-pill ${selectedPeriod === 30 ? 'active' : ''}`}
                onClick={() => setSelectedPeriod(30)}
              >
                {t('dashboard.days30')}
              </button>
              <button
                className={`tab-pill ${selectedPeriod === 90 ? 'active' : ''}`}
                onClick={() => setSelectedPeriod(90)}
              >
                {t('dashboard.days90')}
              </button>
            </div>
          </div>
          <div className="card-body">
            {chartPoints.length > 0 ? (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                >
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal gridlines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                    const y = chartHeight - padY - pct * (chartHeight - padY * 2);
                    return (
                      <line
                        key={idx}
                        x1={padX}
                        y1={y}
                        x2={chartWidth - padX}
                        y2={y}
                        stroke="var(--border-subtle)"
                        strokeDasharray="4 4"
                      />
                    );
                  })}

                  {/* Shaded Area */}
                  {areaData && <path d={areaData} fill="url(#salesGradient)" />}

                  {/* Trend Line */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Points */}
                  {chartPoints.map((p, idx) => {
                    const { x, y } = getCoordinates(idx, p.unitsSold);
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r="3.5"
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth="2"
                      >
                        <title>{`${p.date}: ${p.unitsSold} units ($${p.revenue})`}</title>
                      </circle>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                {isLoadingTrends
                  ? 'Loading sales velocity data...'
                  : 'No sales velocity history recorded'}
              </div>
            )}
          </div>
        </section>

        {/* Top Selling Products */}
        <section className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title-group">
              <h3>Top Selling Products</h3>
              <p>Ranked by 30-day unit sales</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/analytics')}>
              <span>Analytics</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Sold (30d)</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.topSellingProducts || []).slice(0, 5).map((p) => (
                    <tr
                      key={p.variantId}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openInventoryById(p.variantId)}
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{p.productTitle}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {p.variantTitle} ({p.sku})
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {p.unitsSold} units
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color: p.currentStock <= 4 ? 'var(--warning)' : 'var(--text-main)',
                          }}
                        >
                          {p.currentStock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Restock Recommendations Section */}
      <section className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <div className="card-title-group">
            <h3>Restock Recommendations</h3>
            <p>
              Actionable replenishment priorities calculated using sales velocity and lead time
              horizon
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/analytics')}>
            <span>Full Reorder Plan</span>
            <ArrowRight size={14} />
          </button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product & Variant</th>
                  <th>SKU</th>
                  <th>Available Stock</th>
                  <th>Daily Velocity</th>
                  <th>Days Remaining</th>
                  <th>Recommended Restock</th>
                  <th>Urgency</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.restockRecommendations || []).length > 0 ? (
                  (summary?.restockRecommendations || []).map((rec) => (
                    <tr key={rec.variantId}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{rec.productTitle}</span>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            {rec.variantTitle}
                          </span>
                        </div>
                      </td>
                      <td>
                        <code style={{ color: 'var(--primary)', fontSize: '12px' }}>{rec.sku}</code>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              rec.availableQuantity === 0 ? 'var(--danger)' : 'var(--text-main)',
                          }}
                        >
                          {rec.availableQuantity} units
                        </span>
                      </td>
                      <td>{rec.averageDailySales} /day</td>
                      <td>
                        {rec.daysRemaining !== null ? (
                          <span
                            style={{
                              fontWeight: 600,
                              color: rec.daysRemaining <= 3 ? 'var(--danger)' : 'var(--warning)',
                            }}
                          >
                            {rec.daysRemaining} days
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Insufficient data</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          +{rec.recommendedQuantity} units
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Est. ${rec.estimatedCost.toFixed(2)}
                        </div>
                      </td>
                      <td>
                        {rec.urgency === 'critical' ? (
                          <span className="badge badge-out_of_stock">Critical</span>
                        ) : rec.urgency === 'high' ? (
                          <span className="badge badge-low_stock">High</span>
                        ) : (
                          <span className="badge badge-restock_soon">Medium</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openInventoryById(rec.variantId)}
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}
                    >
                      No replenishment required at this time. All tracked inventory is healthy.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Recent Shopify Orders Section */}
      <section className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Recent Orders Context</h3>
            <p>Latest Shopify customer orders & fulfillment statuses (read-only monitoring)</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/orders')}>
            <span>View All Orders</span>
            <ArrowRight size={14} />
          </button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Customer</th>
                  <th>Order Date</th>
                  <th>Total Amount</th>
                  <th>Financial Status</th>
                  <th>Fulfillment Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.recentOrders || []).map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {order.orderNumber}
                      </span>
                    </td>
                    <td>{order.customerName || 'Guest Customer'}</td>
                    <td style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>
                        ${order.totalAmount.toFixed(2)} {order.currencyCode}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor:
                            order.financialStatus === 'paid'
                              ? 'var(--success-bg)'
                              : 'var(--warning-bg)',
                          color:
                            order.financialStatus === 'paid' ? 'var(--success)' : 'var(--warning)',
                        }}
                      >
                        {order.financialStatus}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor:
                            order.fulfillmentStatus === 'fulfilled'
                              ? 'var(--success-bg)'
                              : order.fulfillmentStatus === 'partial'
                                ? 'var(--info-bg)'
                                : 'var(--warning-bg)',
                          color:
                            order.fulfillmentStatus === 'fulfilled'
                              ? 'var(--success)'
                              : order.fulfillmentStatus === 'partial'
                                ? 'var(--info)'
                                : 'var(--warning)',
                        }}
                      >
                        {order.fulfillmentStatus}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openOrderModal(order)}
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
