import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react';
import { Order, FulfillmentStatus } from '../../types';
import { api } from '../../api';
import { MainLayoutContextType } from '../../layouts/MainLayout';
import { useTranslation } from '../../i18n';

export const OrdersPage: React.FC = () => {
  const { t } = useTranslation();
  const context = useOutletContext<MainLayoutContextType | null>();
  const openOrderModal = context?.openOrderModal || (() => {});

  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | FulfillmentStatus>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'total_desc'>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.orders.getOrders({
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

  const handleTabChange = (status: 'all' | FulfillmentStatus) => {
    setStatusFilter(status);
    setPage(1);
  };

  const getFulfillmentBadge = (status: FulfillmentStatus) => {
    switch (status) {
      case 'fulfilled':
        return (
          <span className="badge badge-healthy">
            <CheckCircle size={12} /> Fulfilled
          </span>
        );
      case 'partial':
        return (
          <span className="badge badge-restock_soon">
            <Clock size={12} /> Partially Fulfilled
          </span>
        );
      case 'unfulfilled':
        return (
          <span className="badge badge-low_stock">
            <AlertTriangle size={12} /> Unfulfilled
          </span>
        );
      case 'cancelled':
        return (
          <span className="badge badge-out_of_stock">
            <XCircle size={12} /> Canceled
          </span>
        );
      default:
        return <span className="badge badge-untracked">{status}</span>;
    }
  };

  return (
    <div>
      {/* Notice Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          fontSize: '13px',
          color: 'var(--text-main)',
        }}
      >
        <Info size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span>{t('orders.readOnlyNotice')}</span>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        {/* Fulfillment Tabs */}
        <div className="tabs-group">
          <button
            className={`tab-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            {t('orders.filterAll')}
          </button>
          <button
            className={`tab-pill ${statusFilter === 'unfulfilled' ? 'active' : ''}`}
            onClick={() => handleTabChange('unfulfilled')}
          >
            {t('orders.filterUnfulfilled')}
          </button>
          <button
            className={`tab-pill ${statusFilter === 'partial' ? 'active' : ''}`}
            onClick={() => handleTabChange('partial')}
          >
            {t('orders.filterPartial')}
          </button>
          <button
            className={`tab-pill ${statusFilter === 'fulfilled' ? 'active' : ''}`}
            onClick={() => handleTabChange('fulfilled')}
          >
            {t('orders.filterFulfilled')}
          </button>
          <button
            className={`tab-pill ${statusFilter === 'cancelled' ? 'active' : ''}`}
            onClick={() => handleTabChange('cancelled')}
          >
            {t('orders.filterCanceled')}
          </button>
        </div>

        {/* Search & Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder={t('orders.searchPlaceholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="search-input"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setPage(1);
            }}
            className="search-input"
            style={{ width: 'auto', paddingLeft: '12px', cursor: 'pointer' }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="total_desc">Highest Amount</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Customer</th>
              <th>Created Date</th>
              <th>Payment Status</th>
              <th>Fulfillment Status</th>
              <th>Total Items</th>
              <th>Order Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}
                >
                  Loading orders from backend...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}
                >
                  No orders match the selected filter.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openOrderModal(order)}
                >
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '14px' }}>
                      {order.orderNumber}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>
                        {order.customerName || 'Anonymous Customer'}
                      </span>
                      {order.customerEmail && (
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {order.customerEmail}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor:
                          order.financialStatus === 'paid'
                            ? 'var(--success-bg)'
                            : order.financialStatus === 'refunded'
                              ? 'var(--danger-bg)'
                              : 'var(--warning-bg)',
                        color:
                          order.financialStatus === 'paid'
                            ? 'var(--success)'
                            : order.financialStatus === 'refunded'
                              ? 'var(--danger)'
                              : 'var(--warning)',
                      }}
                    >
                      {order.financialStatus}
                    </span>
                  </td>
                  <td>{getFulfillmentBadge(order.fulfillmentStatus)}</td>
                  <td>
                    <span>{order.totalItems} items</span>
                    {order.fulfillableQuantity > 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--warning)', display: 'block' }}>
                        ({order.fulfillableQuantity} unfulfilled)
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700 }}>
                      ${order.totalAmount.toFixed(2)} {order.currencyCode}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openOrderModal(order);
                      }}
                    >
                      <Eye size={13} />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Server Pagination */}
        <div className="pagination-bar">
          <div>
            Showing <strong>{orders.length}</strong> of <strong>{totalCount}</strong> orders
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

export default OrdersPage;
