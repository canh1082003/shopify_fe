import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';

export const NotFound404: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--critical-bg)',
          color: 'var(--critical)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <AlertCircle size={36} />
      </div>

      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        404 - Trang Không Tồn Tại
      </h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', marginBottom: '1.75rem' }}>
        Đường dẫn bạn yêu cầu không tồn tại hoặc đã được di chuyển trong hệ thống Order Watchdog.
      </p>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Quay lại
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          <Home size={16} /> Về Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound404;
