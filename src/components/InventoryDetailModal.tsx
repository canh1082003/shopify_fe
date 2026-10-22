import React, { useState } from 'react';
import {
  X,
  Package,
  MapPin,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Save,
} from 'lucide-react';
import { InventoryItemDetail } from '../types';
import { api } from '../api';
import { toast } from 'sonner';

interface InventoryDetailModalProps {
  item: InventoryItemDetail;
  onClose: () => void;
  onUpdated?: () => void;
}

export const InventoryDetailModal: React.FC<InventoryDetailModalProps> = ({
  item,
  onClose,
  onUpdated,
}) => {
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(item.lowStockThreshold);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(item.leadTimeDays);
  const [safetyStockDays, setSafetyStockDays] = useState<number>(item.safetyStockDays);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveOverrides = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.inventory.updateVariantOverride(item.id, {
        lowStockThreshold: Number(lowStockThreshold),
        leadTimeDays: Number(leadTimeDays),
        safetyStockDays: Number(safetyStockDays),
      });
      toast.success('Đã lưu cấu hình dự báo', {
        description: `Quy tắc tồn kho cho ${item.sku || item.title} đã được cập nhật thành công.`,
      });
      if (onUpdated) onUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật cấu hình';
      toast.error('Lưu cấu hình thất bại', { description: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="badge badge-healthy">
            <CheckCircle size={12} /> Healthy Stock
          </span>
        );
      case 'low_stock':
        return (
          <span className="badge badge-low_stock">
            <AlertTriangle size={12} /> Low Stock
          </span>
        );
      case 'out_of_stock':
        return (
          <span className="badge badge-out_of_stock">
            <AlertTriangle size={12} /> Out of Stock
          </span>
        );
      case 'restock_soon':
        return (
          <span className="badge badge-restock_soon">
            <Clock size={12} /> Restock Soon
          </span>
        );
      default:
        return (
          <span className="badge badge-untracked">
            <HelpCircle size={12} /> Untracked
          </span>
        );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {item.productImage ? (
              <img
                src={item.productImage}
                alt={item.productTitle}
                className="product-thumb"
                style={{ width: '48px', height: '48px' }}
              />
            ) : (
              <div
                className="product-thumb"
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package size={22} style={{ color: 'var(--text-muted)' }} />
              </div>
            )}
            <div>
              <h3>{item.productTitle}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Variant: <strong>{item.title}</strong>
                </span>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  SKU: <code style={{ color: 'var(--primary)' }}>{item.sku || 'N/A'}</code>
                </span>
                {getStatusBadge(item.status)}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            style={{ border: 'none', background: 'transparent' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="modal-body"
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          {/* Key Intelligence Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              backgroundColor: 'var(--bg-card-subtle)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
                Available Stock
              </span>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  marginTop: '2px',
                }}
              >
                {item.availableQuantity} units
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Committed: {item.committedQuantity}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
                Daily Sales Velocity
              </span>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  marginTop: '2px',
                }}
              >
                {item.averageDailySales} /day
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {item.salesHistory30d} units in 30d
              </span>
            </div>

            <div>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
                Days Remaining
              </span>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color:
                    item.daysRemaining !== null && item.daysRemaining <= 7
                      ? 'var(--danger)'
                      : 'var(--text-main)',
                  marginTop: '2px',
                }}
              >
                {item.daysRemaining !== null ? `${item.daysRemaining} days` : 'No sales data'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Replenish window: {item.leadTimeDays + item.safetyStockDays}d
              </span>
            </div>

            <div>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
                Restock Suggestion
              </span>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: item.recommendedRestockQuantity > 0 ? 'var(--warning)' : 'var(--success)',
                  marginTop: '2px',
                }}
              >
                {item.recommendedRestockQuantity > 0
                  ? `+${item.recommendedRestockQuantity} units`
                  : 'Adequate'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Target: {item.targetStockLevel} units
              </span>
            </div>
          </div>

          {/* Location Breakdown */}
          <div>
            <h4
              style={{
                fontSize: '13.5px',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <MapPin size={16} style={{ color: 'var(--primary)' }} />
              Multi-Location Stock Breakdown
            </h4>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Location Name</th>
                    <th>Available Quantity</th>
                    <th>Committed Quantity</th>
                    <th>Incoming / On-Order</th>
                    <th>Last Synced</th>
                  </tr>
                </thead>
                <tbody>
                  {item.locationLevels.map((loc) => (
                    <tr key={loc.locationId}>
                      <td style={{ fontWeight: 600 }}>{loc.locationName}</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color:
                              loc.availableQuantity <= 0 ? 'var(--danger)' : 'var(--text-main)',
                          }}
                        >
                          {loc.availableQuantity}
                        </span>
                      </td>
                      <td>{loc.committedQuantity}</td>
                      <td>
                        {loc.incomingQuantity > 0 ? (
                          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            +{loc.incomingQuantity}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>0</span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(loc.lastSyncedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Forecasting & Lead Time Overrides Form */}
          <form onSubmit={handleSaveOverrides}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <h4
                style={{
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
                Product-Level Forecasting Rules & Overrides
              </h4>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Overrides global shop defaults for this variant
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                  }}
                >
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  className="search-input"
                  style={{ paddingLeft: '12px' }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    display: 'block',
                  }}
                >
                  Triggers alert when stock ≤ threshold
                </span>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                  }}
                >
                  Restock Lead Time (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                  className="search-input"
                  style={{ paddingLeft: '12px' }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    display: 'block',
                  }}
                >
                  Days required for supplier delivery
                </span>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                  }}
                >
                  Safety Stock (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={safetyStockDays}
                  onChange={(e) => setSafetyStockDays(Number(e.target.value))}
                  className="search-input"
                  style={{ paddingLeft: '12px' }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    display: 'block',
                  }}
                >
                  Buffer days to avoid sudden stockouts
                </span>
              </div>
            </div>

            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
                <Save size={14} />
                <span>{isSaving ? 'Saving Changes...' : 'Save Forecasting Rules'}</span>
              </button>
            </div>
          </form>

          {/* Pricing & Financial Reference */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-card-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              Unit Cost: <strong>${item.costPrice.toFixed(2)}</strong> | Selling Price:{' '}
              <strong>${item.price.toFixed(2)}</strong>
            </div>
            <div>
              Est. Reorder Cost: <strong>${item.estimatedReorderCost.toFixed(2)}</strong> (
              {item.recommendedRestockQuantity} units)
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryDetailModal;
