import React, { useState, useEffect } from 'react';
import { Save, Info, Send, Key, ShieldCheck, RefreshCw } from 'lucide-react';
import { Settings, ShopifyIntegrationStatus } from '../../types';
import { api, TokenStatusInfo } from '../../services/api';
import { toast } from 'sonner';

interface SettingsPageProps {
  onToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onToast }) => {
  const [, setSettings] = useState<Settings | null>(null);
  const [integration, setIntegration] = useState<ShopifyIntegrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenStatusInfo | null>(null);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);

  // Form State
  const [thresholdPreset, setThresholdPreset] = useState<'12' | '24' | '48' | 'custom'>('24');
  const [customThreshold, setCustomThreshold] = useState('24');
  const [warningLeadTime, setWarningLeadTime] = useState('4');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [digestFrequency, setDigestFrequency] = useState<'immediate' | 'daily' | 'hourly'>('immediate');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const [settData, integData, tokData] = await Promise.all([
          api.getSettings(),
          api.getShopifyStatus(),
          api.verifyToken().catch(() => null),
        ]);
        setSettings(settData);
        setIntegration(integData);
        if (tokData) setTokenInfo(tokData);

        // Populate form
        const th = settData.overdueThresholdHours;
        if (th === 12 || th === 24 || th === 48) {
          setThresholdPreset(String(th) as '12' | '24' | '48');
        } else {
          setThresholdPreset('custom');
          setCustomThreshold(String(th));
        }
        setWarningLeadTime(String(settData.warningLeadTimeHours));
        setEmailEnabled(settData.emailEnabled);
        setNotificationEmail(settData.notificationEmail);
        setDigestFrequency(settData.digestFrequency);
      } catch (err) {
        console.error('Failed to load settings:', err);
        onToast('error', 'Error', 'Failed to load store settings from backend.');
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [onToast]);

  const handleVerifyToken = async () => {
    try {
      setIsVerifyingToken(true);
      const res = await api.verifyToken();
      setTokenInfo(res);
      if (res.valid) {
        toast.success('Xác thực Token thành công', {
          description: `Shop: ${res.shop?.domain || 'Shopify'} | Thời hạn còn lại: ${res.remainingSeconds ?? '—'} giây`,
        });
      } else {
        toast.error('Token không hợp lệ hoặc đã hết hạn', {
          description: res.error || 'Vui lòng bấm làm mới token.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kiểm tra token';
      toast.error('Lỗi kiểm tra token', { description: msg });
    } finally {
      setIsVerifyingToken(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setIsRefreshingToken(true);
      await api.refreshAccessToken();
      const res = await api.verifyToken();
      setTokenInfo(res);
      if (!res.valid) {
        toast.error('Token vẫn không hợp lệ sau khi làm mới', {
          description: res.error || 'Vui lòng thử lại.',
        });
        return;
      }
      toast.success('Làm mới token thành công', {
        description: `Thời hạn: ${res.remainingSeconds ?? '—'} giây.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể làm mới token';
      toast.error('Lỗi làm mới token', { description: msg });
    } finally {
      setIsRefreshingToken(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const thresholdHours =
      thresholdPreset === 'custom' ? Number(customThreshold) : Number(thresholdPreset);

    if (isNaN(thresholdHours) || thresholdHours <= 0) {
      onToast('error', 'Validation Error', 'Please specify a valid positive overdue threshold.');
      return;
    }

    const leadHours = Number(warningLeadTime);
    if (isNaN(leadHours) || leadHours < 0 || leadHours >= thresholdHours) {
      onToast(
        'error',
        'Validation Error',
        `Warning lead time must be between 0 and less than threshold (${thresholdHours}h).`
      );
      return;
    }

    try {
      setIsSaving(true);
      const updated = await api.updateSettings({
        overdueThresholdHours: thresholdHours,
        warningLeadTimeHours: leadHours,
        emailEnabled,
        notificationEmail,
        digestFrequency,
      });
      setSettings(updated);
      onToast('success', 'Settings Saved', 'Order fulfillment thresholds and notification rules updated.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      onToast('error', 'Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      setIsSendingTest(true);
      const res = await api.sendTestNotification(notificationEmail);
      if (res.isSimulated) {
        onToast(
          'info',
          'Notification Logged (Sandbox)',
          res.message
        );
      } else {
        onToast('success', 'Email Dispatched', res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send test email';
      onToast('error', 'Delivery Error', msg);
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading configuration from backend...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '880px' }}>
      <form onSubmit={handleSave}>
        {/* Section 1: Store & Shopify Integration */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Store &amp; Shopify Integration</h3>
              <p className="panel-subtitle">Shopify connection parameters and multi-tenant environment</p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Store Domain
              </span>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {integration?.shopDomain || 'quickstart-watchdog.myshopify.com'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Connection Status
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                <span className={`status-dot ${integration?.isShopifyConnected ? 'connected' : 'demo'}`} />
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {integration?.isShopifyConnected ? 'App Bridge Connected' : 'Sandbox Demo Mode'}
                </span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                API Scopes
              </span>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {integration?.scopes.join(', ') || 'read_orders, read_fulfillments'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Overdue SLA Thresholds */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Fulfillment SLA &amp; Overdue Detection</h3>
              <p className="panel-subtitle">Define when an unfulfilled order qualifies as overdue</p>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.65rem' }}>
              Overdue Threshold (Hours after Order Placement)
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
              {(['12', '24', '48', 'custom'] as const).map((preset) => (
                <button
                  type="button"
                  key={preset}
                  className={`btn ${thresholdPreset === preset ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setThresholdPreset(preset)}
                >
                  {preset === 'custom' ? 'Custom Hours' : `${preset} Hours`}
                </button>
              ))}
            </div>

            {thresholdPreset === 'custom' && (
              <div style={{ maxWidth: '280px', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Enter custom hours:
                </label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  className="form-input"
                  value={customThreshold}
                  onChange={(e) => setCustomThreshold(e.target.value)}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.55rem 0.85rem',
                    color: 'var(--text-main)',
                    width: '100%',
                  }}
                  required
                />
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.75rem', maxWidth: '320px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Warning Lead Time (Hours before SLA deadline)
            </label>
            <input
              type="number"
              min="0"
              max="48"
              className="form-input"
              value={warningLeadTime}
              onChange={(e) => setWarningLeadTime(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.55rem 0.85rem',
                color: 'var(--text-main)',
                width: '100%',
              }}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
              Triggers a Warning state (e.g. 4h before 24h deadline = alert at 20h)
            </span>
          </div>

          {/* SLA Calculation Rules Documentation Banner */}
          <div
            style={{
              background: 'var(--primary-subtle)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '1.15rem 1.35rem',
              fontSize: '0.825rem',
              lineHeight: 1.6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.4rem' }}>
              <Info size={16} /> Order Watchdog SLA Calculation Rules
            </div>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)' }}>
              <li>
                <strong>Elapsed Time:</strong> Calculated from the Shopify order creation timestamp (<code>createdAt</code>) using UTC server time as the canonical source of truth.
              </li>
              <li>
                <strong>Financial Eligibility:</strong> Only orders with <code>paid</code> or <code>authorized</code> payment status are monitored for delivery delays. Unpaid/pending orders are excluded.
              </li>
              <li>
                <strong>Canceled Orders:</strong> Orders marked <code>cancelledAt</code> in Shopify are immediately excluded and any active alerts are resolved.
              </li>
              <li>
                <strong>Partial Fulfillment:</strong> Orders with outstanding unfulfilled quantities (<code>fulfillableQuantity &gt; 0</code>) are NOT treated as fully fulfilled and will trigger alerts if delayed.
              </li>
            </ul>
          </div>
        </div>

        {/* Section 3: Email Notifications */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Automated Email Notifications</h3>
              <p className="panel-subtitle">Receive instant or digest alerts when orders become overdue</p>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Enable Automated Email Alerts
              </span>
            </label>
          </div>

          {emailEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Notification Recipient Email *
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', maxWidth: '520px' }}>
                  <input
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    placeholder="merchant@yourstore.com"
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.55rem 0.85rem',
                      color: 'var(--text-main)',
                      flex: 1,
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleTestEmail}
                    disabled={isSendingTest}
                    title="Send a real test notification to verify delivery"
                  >
                    <Send size={13} />
                    <span>{isSendingTest ? 'Sending...' : 'Send Test'}</span>
                  </button>
                </div>
              </div>

              <div style={{ maxWidth: '320px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Delivery Frequency
                </label>
                <select
                  className="select-dropdown"
                  value={digestFrequency}
                  onChange={(e) => setDigestFrequency(e.target.value as 'immediate' | 'daily' | 'hourly')}
                  style={{ width: '100%' }}
                >
                  <option value="immediate">Immediate (Real-time as orders become overdue)</option>
                  <option value="daily">Daily Digest Summary (Every morning at 09:00)</option>
                  <option value="hourly">Hourly Rollup</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Save Button Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button
            id="btn-save-settings"
            type="submit"
            className="btn btn-primary"
            disabled={isSaving}
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving Settings...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Token Authentication & Refresh Diagnostics Panel */}
      <div className="panel-card" style={{ marginTop: '2rem' }}>
        <div className="panel-header">
          <div>
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={18} color="var(--primary)" /> Token Authentication &amp; Session Diagnostics
            </h3>
            <p className="panel-subtitle">
              Kiểm tra tính hợp lệ của JWT token, cơ chế tự động refetch / refresh token và nhận diện HTTP Status
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleVerifyToken}
              disabled={isVerifyingToken}
              title="Gửi token hiện tại lên BE /api/auth/verify để kiểm tra"
            >
              <ShieldCheck size={14} />
              <span>{isVerifyingToken ? 'Đang kiểm tra...' : 'Kiểm tra Token (Verify)'}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRefreshToken}
              disabled={isRefreshingToken}
              title="Gọi BE /api/auth/refresh để lấy Access Token mới"
            >
              <RefreshCw size={14} className={isRefreshingToken ? 'spin-animation' : ''} />
              <span>{isRefreshingToken ? 'Đang làm mới...' : 'Làm mới Token (Refresh)'}</span>
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            background: 'var(--bg-card-subtle)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Trạng thái Token
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontWeight: 700 }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: tokenInfo?.valid ? 'var(--success)' : 'var(--critical)',
                }}
              />
              <span style={{ color: tokenInfo?.valid ? 'var(--success)' : 'var(--critical)' }}>
                {tokenInfo?.valid ? 'Hợp lệ & Hoạt động (Valid)' : 'Chưa xác thực hoặc đã hết hạn'}
              </span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Định dạng chuẩn
            </span>
            <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>
              Bearer JWT (RFC 7519 HMAC-SHA256)
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Thời hạn còn lại
            </span>
            <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>
              {tokenInfo?.remainingSeconds !== undefined
                ? `${tokenInfo.remainingSeconds} giây (~${Math.round(tokenInfo.remainingSeconds / 60)} phút)`
                : '—'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Tự động phục hồi khi lỗi 401
            </span>
            <div style={{ color: 'var(--text-link)', fontWeight: 600, marginTop: '0.25rem' }}>
              Tự động dùng Refresh Token (Seamless Auto-Retry)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
