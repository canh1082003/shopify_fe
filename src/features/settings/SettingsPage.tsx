import React, { useState, useEffect } from 'react';
import {
  Save,
  Send,
  Store,
  Sliders,
  Bell,
  Trash2,
  CheckCircle,
  ShieldCheck,
  RefreshCw,
  Globe,
  Key,
} from 'lucide-react';
import { ShopifyIntegrationStatus } from '../../types';
import { api, TokenStatusInfo } from '../../api';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import { MainLayoutContextType } from '../../layouts/MainLayout';
import { useTranslation } from '../../i18n';

export const SettingsPage: React.FC = () => {
  const { language, setLanguage, t } = useTranslation();
  const context = useOutletContext<MainLayoutContextType | null>();
  const refreshSummary = context?.refreshSummary || (async () => {});

  const [integration, setIntegration] = useState<ShopifyIntegrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenStatusInfo | null>(null);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);

  // Form State
  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState<number>(10);
  const [defaultLeadTimeDays, setDefaultLeadTimeDays] = useState<number>(7);
  const [defaultSafetyStockDays, setDefaultSafetyStockDays] = useState<number>(5);
  const [salesVelocityDays, setSalesVelocityDays] = useState<number>(30);
  const [locationScope, setLocationScope] = useState<string>('all');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [dailyDigest, setDailyDigest] = useState(true);
  const [productOverrides, setProductOverrides] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const [settData, integData, tokData] = await Promise.all([
          api.settings.getSettings(),
          api.integrations.getShopifyStatus(),
          api.auth.verifyToken().catch(() => null),
        ]);
        setIntegration(integData);
        if (tokData) setTokenInfo(tokData);

        // Populate Form
        setDefaultLowStockThreshold(settData.defaultLowStockThreshold ?? 10);
        setDefaultLeadTimeDays(settData.defaultLeadTimeDays ?? 7);
        setDefaultSafetyStockDays(settData.defaultSafetyStockDays ?? 5);
        setSalesVelocityDays(settData.salesVelocityDays ?? 30);
        setLocationScope(settData.locationScope ?? 'all');
        setEmailEnabled(settData.emailEnabled ?? true);
        setNotificationEmail(settData.notificationEmail ?? '');
        setDailyDigest(settData.dailyDigest ?? true);
        setProductOverrides(settData.productOverrides ?? {});
      } catch (err) {
        console.error('Failed to load settings:', err);
        toast.error('Lỗi tải cài đặt từ máy chủ');
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.settings.updateSettings({
        defaultLowStockThreshold: Number(defaultLowStockThreshold),
        defaultLeadTimeDays: Number(defaultLeadTimeDays),
        defaultSafetyStockDays: Number(defaultSafetyStockDays),
        salesVelocityDays: Number(salesVelocityDays),
        locationScope,
        emailEnabled,
        notificationEmail,
        dailyDigest,
        productOverrides,
      });
      toast.success('Cập nhật cấu hình thành công', {
        description: 'Các quy tắc dự báo tồn kho đã được áp dụng và lưu trữ an toàn.',
      });
      refreshSummary();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật cấu hình';
      toast.error('Lưu cấu hình thất bại', { description: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestNotification = async () => {
    try {
      setIsSendingTest(true);
      const res = await api.notifications.sendTestNotification();
      if (res.isSimulated) {
        toast.info('Email thử nghiệm (Môi trường phát triển)', {
          description: `Chế độ mô phỏng: ${res.message}. Đã ghi log hệ thống.`,
        });
      } else {
        toast.success('Gửi email thử nghiệm thành công', { description: res.message });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi gửi thông báo';
      toast.error('Gửi email thử nghiệm thất bại', { description: msg });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleRemoveOverride = async (variantId: string) => {
    const updated = { ...productOverrides };
    delete updated[variantId];
    setProductOverrides(updated);
    try {
      await api.settings.updateSettings({ productOverrides: updated });
      toast.success(`Đã xóa quy tắc ghi đè cho sản phẩm ${variantId}`);
      refreshSummary();
    } catch {
      toast.error('Lỗi khi xóa ghi đè');
    }
  };

  const handleVerifyToken = async () => {
    try {
      setIsVerifyingToken(true);
      const res = await api.auth.verifyToken();
      setTokenInfo(res);
      if (res.valid) {
        toast.success('Xác thực Token thành công', {
          description: `Shop: ${res.shop?.domain || 'Shopify'} | Thời hạn còn lại: ${res.remainingSeconds ?? '—'}s`,
        });
      } else {
        toast.error('Token không hợp lệ hoặc đã hết hạn');
      }
    } catch {
      toast.error('Lỗi kiểm tra token');
    } finally {
      setIsVerifyingToken(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
        Loading StockPilot application settings...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      <form onSubmit={handleSaveSettings}>
        {/* Section 1: Store Information */}
        <section className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Store Information & Shopify Connection</h3>
              <p>Details of the connected Shopify merchant account and synchronization status</p>
            </div>
            <Store size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="card-body">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                backgroundColor: 'var(--bg-card-subtle)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Shopify Store Domain
                </span>
                <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '3px' }}>
                  {integration?.shopDomain || 'stockpilot-demo.myshopify.com'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Connection State
                </span>
                <div style={{ marginTop: '3px' }}>
                  {integration?.isShopifyConnected ? (
                    <span className="badge badge-healthy">
                      <CheckCircle size={12} /> Connected
                    </span>
                  ) : (
                    <span className="badge badge-low_stock">Demo Mode (Offline)</span>
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Last Store Sync
                </span>
                <div style={{ fontWeight: 500, fontSize: '13px', marginTop: '3px' }}>
                  {integration?.lastSyncedAt
                    ? new Date(integration.lastSyncedAt).toLocaleString()
                    : 'Just now'}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '13.5px' }}>
                  Cấp quyền truy cập dữ liệu Shopify (OAuth Handshake)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Mở màn hình phân quyền chính thức của Shopify để cấp phép đọc danh mục sản phẩm, biến thể và đơn hàng.
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const targetDomain = integration?.shopDomain || 'conganh-test-lab.myshopify.com';
                  const clientId = 'ff20213b7fd3fb4fc9ebd655aed73abd';
                  const scopes = 'read_products,read_inventory,read_orders,read_locations';
                  const redirectUri = 'https://shopify-be-3jd9.onrender.com/api/integrations/shopify/callback';
                  const authUrl = `https://${targetDomain}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
                    redirectUri
                  )}`;
                  window.open(authUrl, '_blank');
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Key size={14} />
                <span>Cấp quyền kết nối Shopify</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Token & API Security */}
        <section className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Shopify Session & Security Verification</h3>
              <p>In-memory JWT token authentication and tenant boundary verification</p>
            </div>
            <ShieldCheck size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Session Token Status: {tokenInfo?.valid ? 'Active & Valid' : 'Validating'}
                </span>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Remaining validity:{' '}
                  <strong>
                    {tokenInfo?.remainingSeconds ? `${tokenInfo.remainingSeconds}s` : '24 hours'}
                  </strong>{' '}
                  • Tenant: {tokenInfo?.shop?.domain || integration?.shopDomain}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleVerifyToken}
                disabled={isVerifyingToken}
              >
                <RefreshCw size={13} className={isVerifyingToken ? 'spin-animation' : ''} />
                <span>Verify Token Security</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section 3: Inventory Forecasting Rules */}
        <section className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Inventory Rules & Forecasting Parameters</h3>
              <p>Configure default thresholds, lead times, safety stocks, and velocity windows</p>
            </div>
            <Sliders size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div
            className="card-body"
            style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}
                >
                  Default Low Stock Threshold (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={defaultLowStockThreshold}
                  onChange={(e) => setDefaultLowStockThreshold(Number(e.target.value))}
                  className="search-input"
                  style={{ paddingLeft: '12px' }}
                />
                <span
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    display: 'block',
                  }}
                >
                  Triggers low stock warnings when available quantity reaches or falls below this
                  number.
                </span>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}
                >
                  Sales Velocity Calculation Window
                </label>
                <select
                  value={salesVelocityDays}
                  onChange={(e) => setSalesVelocityDays(Number(e.target.value))}
                  className="search-input"
                  style={{ paddingLeft: '12px', cursor: 'pointer' }}
                >
                  <option value={7}>Last 7 Days (Short-term surge)</option>
                  <option value={14}>Last 14 Days (Bi-weekly cadence)</option>
                  <option value={30}>Last 30 Days (Recommended default)</option>
                  <option value={60}>Last 60 Days (Extended smoothing)</option>
                  <option value={90}>Last 90 Days (Quarterly average)</option>
                </select>
                <span
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    display: 'block',
                  }}
                >
                  Duration used to calculate average daily unit sales for runway forecasting.
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}
                >
                  Default Restock Lead Time (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={defaultLeadTimeDays}
                  onChange={(e) => setDefaultLeadTimeDays(Number(e.target.value))}
                  className="search-input"
                  style={{ paddingLeft: '12px' }}
                />
                <span
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    display: 'block',
                  }}
                >
                  Estimated calendar days from purchase order placement until warehouse receipt.
                </span>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}
                >
                  Safety Stock Buffer (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={defaultSafetyStockDays}
                  onChange={(e) => setDefaultSafetyStockDays(Number(e.target.value))}
                  className="search-input"
                  style={{ paddingLeft: '12px' }}
                />
                <span
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    display: 'block',
                  }}
                >
                  Extra cushion days to prevent stockouts caused by transit delays or sudden sales
                  spikes.
                </span>
              </div>
            </div>

            <div>
              <label
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Inventory Location Scope
              </label>
              <select
                value={locationScope}
                onChange={(e) => setLocationScope(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '12px', cursor: 'pointer' }}
              >
                <option value="all">Consolidated Across All Warehouse Locations</option>
                <option value="loc-main">Main Warehouse (US East) Only</option>
                <option value="loc-west">West Coast Fulfillment Center Only</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section 4: Merchant Notifications */}
        <section className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Stock Alerts & Email Notifications</h3>
              <p>Configure email digests and automated low stock alerts</p>
            </div>
            <Bell size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div
            className="card-body"
            style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                id="emailEnabled"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label
                htmlFor="emailEnabled"
                style={{ fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}
              >
                Enable email notifications for low-stock and stockout alerts
              </label>
            </div>

            {emailEnabled && (
              <>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      marginBottom: '6px',
                    }}
                  >
                    Merchant Notification Email Address
                  </label>
                  <input
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    placeholder="merchant@example.com"
                    className="search-input"
                    style={{ paddingLeft: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    id="dailyDigest"
                    checked={dailyDigest}
                    onChange={(e) => setDailyDigest(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="dailyDigest" style={{ fontSize: '13px', cursor: 'pointer' }}>
                    Send Daily Morning Digest (summary of urgent restock recommendations)
                  </label>
                </div>

                <div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleSendTestNotification}
                    disabled={isSendingTest}
                  >
                    <Send size={14} />
                    <span>{isSendingTest ? 'Sending Test...' : 'Send Test Alert Email'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Section 5: Product Overrides List */}
        <section className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Variant-Level Overrides</h3>
              <p>
                Specific products configured with customized low stock thresholds and lead times
              </p>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {Object.keys(productOverrides).length > 0 ? (
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Variant ID</th>
                      <th>Custom Threshold</th>
                      <th>Custom Lead Time</th>
                      <th>Custom Safety Stock</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.entries(productOverrides) as [string, any][]).map(([vid, o]) => (
                      <tr key={vid}>
                        <td>
                          <code style={{ color: 'var(--primary)', fontWeight: 600 }}>{vid}</code>
                        </td>
                        <td>{o.lowStockThreshold ? `${o.lowStockThreshold} units` : 'Default'}</td>
                        <td>{o.leadTimeDays ? `${o.leadTimeDays} days` : 'Default'}</td>
                        <td>{o.safetyStockDays ? `${o.safetyStockDays} days` : 'Default'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRemoveOverride(vid)}
                            title="Remove override and reset to store defaults"
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}
              >
                No variant-level overrides configured. All products use the global store rules
                above.
              </div>
            )}
          </div>
        </section>

        {/* Section: Language Configuration */}
        <section className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>{t('settings.languageTitle')}</h3>
              <p>{t('settings.languageDesc')}</p>
            </div>
            <Globe size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button
                type="button"
                className={`btn ${language === 'vi' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setLanguage('vi')}
                style={{ minWidth: '150px' }}
              >
                <span>🇻🇳 {t('settings.vietnamese')}</span>
              </button>
              <button
                type="button"
                className={`btn ${language === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setLanguage('en')}
                style={{ minWidth: '150px' }}
              >
                <span>🇺🇸 {t('settings.english')}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSaving}
            style={{ padding: '10px 24px' }}
          >
            <Save size={16} />
            <span>{isSaving ? t('settings.saving') : t('settings.saveSettings')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
