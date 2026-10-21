import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppRoutes } from './routes';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      {/* Interactive Sonner Toast Notification Center */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
          },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
