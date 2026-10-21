import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search,
  Eye,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  PackageCheck,
  Clock,
} from 'lucide-react';
import { Order } from '../../types';
import { api } from '../../api';
import { MainLayoutContextType } from '../../layouts/MainLayout';

export interface OrdersPageProps {
  onOpenOrderModal?: (order: Order) => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = (props) => {
  const context = useOutletContext<MainLayoutContextType | null>();
  const onOpenOrderModal = props.onOpenOrderModal || context?.openOrderModal || (() => {});
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'pending' | 'fulfilled'>(
    'all'
  );
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'overdue_desc'>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getOrders({
        status: statusFilter,
        search,
        sortBy,
        page,
        limit: 10,
      });
      setOrders(res.items);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search, sortBy, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleTabChange = (status: 'all' | 'overdue' | 'pending' | 'fulfilled') => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <div>
      {/* Controls: Filter Tabs & Search Bar */}
      <div className="filter-tabs-row">
        <div className="tabs-group">
          <button
            className={`tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            All Orders
          </button>
          <button
            className={`tab-btn ${statusFilter === 'overdue' ? 'active' : ''}`}
            onClick={() => handleTabChange('overdue')}
          >
            Overdue
          </button>
          <button
            className={`tab-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => handleTabChange('pending')}
          >
            Pending
          </button>
          <button
            className={`tab-btn ${statusFilter === 'fulfilled' ? 'active' : ''}`}
            onClick={() => handleTabChange('fulfilled')}
          >
            Fulfilled
          </button>
        </div>

        <div className="filter-controls-group">
          <div className="input-search-box">
            <Search size={15} className="input-search-icon" />
            <input
              type="text"
              placeholder="Search by order # or customer..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <select
            className="select-dropdown"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'overdue_desc')}
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="overdue_desc">Sort: Most Overdue</option>
          </select>
        </div>
      </div>

      {/* Orders Table Panel */}
      <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Order Date</th>
                <th>Payment</th>
                <th>Fulfillment</th>
                <th>Fulfillment Deadline</th>
                <th>Overdue Status</th>
                <th>Total</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}
                  >
                    Loading orders from store...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}
                  >
                    <div
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      No matching orders found
                    </div>
                    <p style={{ fontSize: '0.85rem' }}>
                      Try adjusting your search criteria or switching status tabs.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
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
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
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
                          background: 'rgba(56, 189, 248, 0.12)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {order.financialStatus}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          order.fulfillmentStatus === 'fulfilled'
                            ? 'badge-success'
                            : order.fulfillmentStatus === 'partial'
                              ? 'badge-warning'
                              : 'badge-neutral'
                        }`}
                      >
                        {order.fulfillmentStatus === 'fulfilled' && <PackageCheck size={12} />}
                        {order.fulfillmentStatus === 'partial' && <Clock size={12} />}
                        {order.fulfillmentStatus}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {order.deadline
                        ? new Date(order.deadline).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'N/A'}
                    </td>
                    <td>
                      {order.isOverdue ? (
                        <span className="badge badge-critical">
                          <AlertTriangle size={12} /> +{Math.floor(order.overdueMinutes / 60)}h{' '}
                          {order.overdueMinutes % 60}m
                        </span>
                      ) : order.fulfillmentStatus === 'fulfilled' ? (
                        <span className="badge badge-success">On-Time</span>
                      ) : (
                        <span className="badge badge-neutral">On Track</span>
                      )}
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
                          title="Fulfill in Shopify Admin"
                        >
                          <ExternalLink size={13} />
                          <span>Shopify</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Row */}
        <div
          className="pagination-row"
          style={{ padding: '1rem 1.5rem', background: 'var(--bg-card-subtle)' }}
        >
          <div>
            Showing <strong>{orders.length}</strong> of <strong>{totalCount}</strong> monitored
            orders
          </div>

          <div className="pagination-actions">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 0.5rem',
                fontSize: '0.85rem',
              }}
            >
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
