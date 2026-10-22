import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';
import { useTranslation } from '../i18n';

export const NotFound404: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
        {t('errors.pageNotFound')}
      </h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', marginBottom: '1.75rem' }}>
        {t('errors.pageNotFoundDesc')}
      </p>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> {t('errors.back')}
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          <Home size={16} /> {t('errors.backHome')}
        </button>
      </div>
    </div>
  );
};

export default NotFound404;
