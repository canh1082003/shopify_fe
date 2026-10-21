import React from 'react';
import { X, ExternalLink, Clock, PackageCheck, AlertTriangle } from 'lucide-react';
import { Order } from '../types';

interface OrderDetailsModalProps {
  order: Order | null;
  onClose: () => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h3>Order {order.orderNumber}</h3>
            {order.isOverdue ? (
              <span className="badge badge-critical">
                <AlertTriangle size={12} /> Overdue
              </span>
            ) : order.fulfillmentStatus === 'fulfilled' ? (
              <span className="badge badge-success">
                <PackageCheck size={12} /> Fulfilled
              </span>
            ) : (
              <span className="badge badge-neutral">
                <Clock size={12} /> Pending Fulfillment
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.3rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Quick Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.85rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                background: 'var(--bg-card-subtle)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Value
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                ${order.totalAmount.toFixed(2)} {order.currencyCode}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-card-subtle)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Payment Status
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.2rem', textTransform: 'capitalize' }}>
                {order.financialStatus}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-card-subtle)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Fulfillable Items
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: order.fulfillableQuantity > 0 ? '#f59e0b' : '#10b981', marginTop: '0.2rem' }}>
                {order.fulfillableQuantity} / {order.totalItems}
              </div>
            </div>
          </div>

          {/* Timeline & SLA */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '0.75rem' }}>
              Fulfillment Timeline &amp; SLA
            </h4>
            <div
              style={{
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Order Placed:</span>
                <span style={{ fontWeight: 600 }}>{formatDate(order.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Fulfillment Deadline:</span>
                <span style={{ fontWeight: 600, color: order.isOverdue ? 'var(--critical)' : 'inherit' }}>
                  {formatDate(order.deadline)}
                </span>
              </div>
              {order.isOverdue && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--critical)', fontWeight: 700 }}>
                  <span>Overdue Duration:</span>
                  <span>+{Math.floor(order.overdueMinutes / 60)}h {order.overdueMinutes % 60}m</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer info */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '0.75rem' }}>
              Customer Details
            </h4>
            <div
              style={{
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                {order.customerName || 'Anonymous Customer'}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                {order.customerEmail || 'No email provided on order'}
              </div>
            </div>
          </div>

          {/* Line items table */}
          <div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '0.75rem' }}>
              Line Items ({order.lineItems.length})
            </h4>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Fulfillable</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lineItems.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.title}</td>
                      <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {item.sku || 'N/A'}
                      </td>
                      <td>{item.quantity}</td>
                      <td>
                        <span
                          className={`badge ${
                            item.fulfillableQuantity > 0 ? 'badge-warning' : 'badge-success'
                          }`}
                        >
                          {item.fulfillableQuantity > 0
                            ? `${item.fulfillableQuantity} remaining`
                            : 'Fulfilled'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>${item.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <a
            href={order.shopifyUrl || `https://admin.shopify.com/store/quickstart-watchdog/orders`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <ExternalLink size={15} />
            <span>Open in Shopify Admin</span>
          </a>
        </div>
      </div>
    </div>
  );
};
