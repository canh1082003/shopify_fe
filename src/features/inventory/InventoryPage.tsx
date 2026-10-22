import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowUpDown,
  Info,
} from 'lucide-react';
import { ProductVariant, StockStatus } from '../../types';
import { api } from '../../api';
import { MainLayoutContextType } from '../../layouts/MainLayout';
import { useTranslation } from '../../i18n';

export const InventoryPage: React.FC = () => {
  const { t } = useTranslation();
  const context = useOutletContext<MainLayoutContextType | null>();
  const openInventoryModal = context?.openInventoryModal || (() => {});

  const [items, setItems] = useState<ProductVariant[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | StockStatus>('all');
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('all');
  const [sortBy, setSortBy] = useState<'quantity' | 'salesVelocity' | 'daysRemaining' | 'name'>(
    'quantity'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInventory = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.inventory.getInventory({
        status: statusFilter,
        search,
        locationId,
        sortBy,
        sortOrder,
        page,
        limit: 10,
      });
      setItems(res.items);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search, locationId, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleTabChange = (status: 'all' | StockStatus) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleSortChange = (newSortBy: 'quantity' | 'salesVelocity' | 'daysRemaining' | 'name') => {
    if (sortBy === newSortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="badge badge-healthy">
            <CheckCircle size={12} /> Healthy
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
      {/* Read-Only Notice Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          backgroundColor: 'var(--primary-subtle)',
          border: '1px solid var(--primary-border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          fontSize: '13px',
          color: 'var(--text-main)',
        }}
      >
        <Info size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span>
          <strong>Shopify Synchronized (Read-Only):</strong> Inventory quantities are mirrored in
          real time from Shopify. StockPilot focuses on velocity calculations, stockout prediction,
          and actionable reorder guidance without modifying your store inventory.
        </span>
      </div>

      {/* Controls & Filter Bar */}
      <div className="controls-bar">
        {/* Status Filter Tabs */}
        <div className="tabs-group">
          <button
            className={`tab-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            {t('inventory.filterAll')}
          </button>
          <button
            className={`tab-pill ${statusFilter === 'healthy' ? 'active' : ''}`}
            onClick={() => handleTabChange('healthy')}
          >
            {t('inventory.filterHealthy')}
          </button>
          <button
            className={`tab-pill ${statusFilter === 'low_stock' ? 'active' : ''}`}
            onClick={() => handleTabChange('low_stock')}
          >
            {t('inventory.filterLowStock')}
          </button>
          <button
            className={`tab-pill ${statusFilter === 'out_of_stock' ? 'active' : ''}`}
            onClick={() => handleTabChange('out_of_stock')}
          >
            {t('inventory.filterOutOfStock')}
          </button>
          <button
            className={`tab-pill ${statusFilter === 'untracked' ? 'active' : ''}`}
            onClick={() => handleTabChange('untracked')}
          >
            {t('inventory.filterUntracked')}
          </button>
        </div>

        {/* Search & Location Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder={t('inventory.searchPlaceholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="search-input"
            />
          </div>

          <select
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              setPage(1);
            }}
            className="search-input"
            style={{ width: 'auto', paddingLeft: '12px', cursor: 'pointer' }}
          >
            <option value="all">{t('inventory.allLocations')}</option>
            <option value="loc-main">Main Warehouse (US East)</option>
            <option value="loc-west">West Coast Fulfillment Center</option>
          </select>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th
                onClick={() => handleSortChange('name')}
                style={{ cursor: 'pointer' }}
                title="Sort by product name"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Product & Variant</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th>SKU</th>
              <th>Location</th>
              <th
                onClick={() => handleSortChange('quantity')}
                style={{ cursor: 'pointer' }}
                title="Sort by available stock"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Available</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th>Committed</th>
              <th>Stock Status</th>
              <th
                onClick={() => handleSortChange('salesVelocity')}
                style={{ cursor: 'pointer' }}
                title="Sort by sales velocity"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Daily Sales</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th
                onClick={() => handleSortChange('daysRemaining')}
                style={{ cursor: 'pointer' }}
                title="Sort by days remaining"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Days Left</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
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
                  Loading inventory catalog from backend...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}
                >
                  No inventory items match the selected filter.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openInventoryModal(item)}
                >
                  <td>
                    <div className="product-cell">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productTitle}
                          className="product-thumb"
                        />
                      ) : (
                        <div
                          className="product-thumb"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Package size={18} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      )}
                      <div className="product-meta">
                        <h4>{item.productTitle}</h4>
                        <span>{item.title}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <code style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      {item.sku || '—'}
                    </code>
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {item.locationName}
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '14.5px',
                        color: item.availableQuantity <= 0 ? 'var(--danger)' : 'var(--text-main)',
                      }}
                    >
                      {item.availableQuantity}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-muted)' }}>{item.committedQuantity}</span>
                  </td>
                  <td>{getStatusBadge(item.status)}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {item.averageDailySales} /day
                    </span>
                  </td>
                  <td>
                    {item.daysRemaining !== null ? (
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            item.daysRemaining <= 3
                              ? 'var(--danger)'
                              : item.daysRemaining <= 7
                                ? 'var(--warning)'
                                : 'var(--text-main)',
                        }}
                      >
                        {item.daysRemaining} days
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {item.tracked ? 'Insufficient data' : 'Untracked'}
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openInventoryModal(item);
                      }}
                    >
                      <Eye size={13} />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Server-Side Pagination Bar */}
        <div className="pagination-bar">
          <div>
            Showing <strong>{items.length}</strong> of <strong>{totalCount}</strong> variants
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

export default InventoryPage;
