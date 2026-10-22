import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Clock, Zap, Eye, Copy, Info } from 'lucide-react';
import { SalesVelocitySummary, StockoutRiskGroup, RestockRecommendation } from '../../types';
import { api } from '../../api';
import { MainLayoutContextType } from '../../layouts/MainLayout';
import { toast } from 'sonner';
import { useTranslation } from '../../i18n';

export const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const context = useOutletContext<MainLayoutContextType | null>();
  const openInventoryById = context?.openInventoryById || (async () => {});

  const [velocity, setVelocity] = useState<SalesVelocitySummary | null>(null);
  const [riskGroups, setRiskGroups] = useState<StockoutRiskGroup[]>([]);
  const [restockPlan, setRestockPlan] = useState<RestockRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        const [velData, riskData, restockData] = await Promise.all([
          api.analytics.getSalesVelocity(),
          api.analytics.getStockoutRisk(),
          api.analytics.getRestockSuggestions(),
        ]);
        setVelocity(velData);
        setRiskGroups(riskData);
        setRestockPlan(restockData);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  const totalRestockUnits = restockPlan.reduce((acc, r) => acc + r.recommendedQuantity, 0);
  const totalRestockInvestment = restockPlan.reduce((acc, r) => acc + r.estimatedCost, 0);

  const handleCopyRestockList = () => {
    if (restockPlan.length === 0) {
      toast.info('No replenishment items to export');
      return;
    }
    const lines = [
      'SKU\tProduct\tVariant\tAvailable\tDaily Sales\tDays Left\tTarget Stock\tReorder Qty\tEst. Cost',
      ...restockPlan.map(
        (r) =>
          `${r.sku}\t${r.productTitle}\t${r.variantTitle}\t${r.availableQuantity}\t${r.averageDailySales}\t${r.daysRemaining ?? 'N/A'}\t${r.targetStock}\t${r.recommendedQuantity}\t$${r.estimatedCost}`
      ),
    ].join('\n');

    navigator.clipboard.writeText(lines);
    toast.success('Danh sách nhập kho đã được sao chép', {
      description: 'Dữ liệu đã sẵn sàng để dán vào Excel hoặc gửi nhà cung cấp.',
    });
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
        Calculating inventory analytics & sales velocity forecasting...
      </div>
    );
  }

  return (
    <div>
      {/* Model Transparency Formula Box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '14px 18px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
          fontSize: '13px',
          lineHeight: '1.6',
        }}
      >
        <Info size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: 'var(--text-main)' }}>
            StockPilot Inventory Intelligence & Forecasting Engine:
          </strong>
          <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
            Restock recommendations use dynamic target stock formulas:{' '}
            <code style={{ color: 'var(--primary)', fontWeight: 600 }}>
              targetStock = max(lowStockThreshold, ceil(dailySales × (leadTimeDays +
              safetyStockDays)))
            </code>
            , and{' '}
            <code style={{ color: 'var(--primary)', fontWeight: 600 }}>
              reorderQty = max(0, targetStock - availableStock)
            </code>
            . Forecasts are decision-support estimates based on historical order velocity.
          </p>
        </div>
      </div>

      {/* Stockout Risk Timeline Matrix */}
      <section className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>{t('analytics.stockoutRiskTitle')}</h3>
            <p>{t('analytics.stockoutRiskDesc')}</p>
          </div>
        </div>
        <div className="card-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
            }}
          >
            {riskGroups.map((group) => {
              const isCrit = group.timeframe === '3_days';
              const isHigh = group.timeframe === '7_days';
              const isMed = group.timeframe === '14_days';

              const headerColor = isCrit
                ? 'var(--danger)'
                : isHigh
                  ? 'var(--warning)'
                  : isMed
                    ? 'var(--info)'
                    : 'var(--success)';

              return (
                <div
                  key={group.timeframe}
                  style={{
                    backgroundColor: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: headerColor }}>
                      {group.label}
                    </span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: isCrit
                          ? 'var(--danger-bg)'
                          : isHigh
                            ? 'var(--warning-bg)'
                            : 'var(--bg-card)',
                        color: headerColor,
                      }}
                    >
                      {group.count} variants
                    </span>
                  </div>

                  {/* Top Items preview in group */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      minHeight: '120px',
                    }}
                  >
                    {group.items.length > 0 ? (
                      group.items.slice(0, 3).map((item) => (
                        <div
                          key={item.variantId}
                          onClick={() => openInventoryById(item.variantId)}
                          style={{
                            padding: '8px 10px',
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.productTitle}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              marginTop: '2px',
                            }}
                          >
                            <span>{item.availableQuantity} units left</span>
                            <span style={{ fontWeight: 600, color: headerColor }}>
                              {item.daysRemaining}d runway
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '30px 0',
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        No items in this risk window
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fast-Moving vs Slow-Moving Variants */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        {/* Fast-Moving */}
        <section className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title-group">
              <h3>Fast-Moving Products (High Velocity)</h3>
              <p>Top products requiring proactive stock monitoring</p>
            </div>
            <Zap size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Daily Sales</th>
                    <th>Stock</th>
                    <th>Runway</th>
                  </tr>
                </thead>
                <tbody>
                  {(velocity?.fastMoving || []).map((v) => (
                    <tr
                      key={v.variantId}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openInventoryById(v.variantId)}
                    >
                      <td>
                        <span style={{ fontWeight: 600 }}>{v.productTitle}</span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {v.variantTitle}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {v.averageDailySales} /day
                        </span>
                      </td>
                      <td>{v.availableQuantity}</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color:
                              v.daysRemaining !== null && v.daysRemaining <= 7
                                ? 'var(--danger)'
                                : 'var(--text-main)',
                          }}
                        >
                          {v.daysRemaining !== null ? `${v.daysRemaining} days` : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Slow-Moving */}
        <section className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title-group">
              <h3>Slow-Moving Products (Low Velocity)</h3>
              <p>Identify capital tied up in slow-turning inventory</p>
            </div>
            <Clock size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Daily Sales</th>
                    <th>Stock</th>
                    <th>Runway</th>
                  </tr>
                </thead>
                <tbody>
                  {(velocity?.slowMoving || []).map((v) => (
                    <tr
                      key={v.variantId}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openInventoryById(v.variantId)}
                    >
                      <td>
                        <span style={{ fontWeight: 600 }}>{v.productTitle}</span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {v.variantTitle}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {v.averageDailySales} /day
                        </span>
                      </td>
                      <td>{v.availableQuantity}</td>
                      <td>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {v.daysRemaining !== null ? `${v.daysRemaining} days` : 'No sales'}
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

      {/* Comprehensive Restock Suggestions Table */}
      <section className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>{t('analytics.restockPlanningTitle')}</h3>
            <p>
              Total replenishment required: <strong>{totalRestockUnits} units</strong> | Est. cost:{' '}
              <strong>${totalRestockInvestment.toLocaleString()}</strong>
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleCopyRestockList}>
            <Copy size={14} />
            <span>{t('common.exportCsv')}</span>
          </button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product & Variant</th>
                  <th>SKU</th>
                  <th>Available</th>
                  <th>Sales Velocity</th>
                  <th>Days Left</th>
                  <th>Lead Time</th>
                  <th>Safety Stock</th>
                  <th>Target Stock</th>
                  <th>Reorder Quantity</th>
                  <th>Est. Cost</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {restockPlan.length > 0 ? (
                  restockPlan.map((r) => (
                    <tr key={r.variantId}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{r.productTitle}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {r.variantTitle}
                          </span>
                        </div>
                      </td>
                      <td>
                        <code style={{ color: 'var(--primary)', fontWeight: 600 }}>{r.sku}</code>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: r.availableQuantity <= 0 ? 'var(--danger)' : 'var(--text-main)',
                          }}
                        >
                          {r.availableQuantity}
                        </span>
                      </td>
                      <td>{r.averageDailySales} /day</td>
                      <td>
                        {r.daysRemaining !== null ? (
                          <span
                            style={{
                              fontWeight: 700,
                              color:
                                r.daysRemaining <= 3
                                  ? 'var(--danger)'
                                  : r.daysRemaining <= 7
                                    ? 'var(--warning)'
                                    : 'var(--text-main)',
                            }}
                          >
                            {r.daysRemaining} days
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>{r.leadTimeDays}d</td>
                      <td>{r.safetyStockDays}d</td>
                      <td style={{ fontWeight: 600 }}>{r.targetStock} units</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '14px',
                            color: 'var(--primary)',
                            backgroundColor: 'var(--primary-subtle)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          +{r.recommendedQuantity} units
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>${r.estimatedCost.toFixed(2)}</span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          @ ${r.unitCost}
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openInventoryById(r.variantId)}
                        >
                          <Eye size={13} />
                          <span>Configure</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={11}
                      style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}
                    >
                      No stock replenishment needed across catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AnalyticsPage;
