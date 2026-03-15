import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { Toaster } from 'react-hot-toast';

import App from './App';
import './index.css';
import './i18n'; // Initialize i18n


// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// TonConnect manifest URL - используем текущий хост
// Манифест должен быть доступен по HTTPS
const getManifestUrl = () => {
  // Если указана переменная окружения, используем её
  if (import.meta.env.VITE_TONCONNECT_MANIFEST_URL) {
    return import.meta.env.VITE_TONCONNECT_MANIFEST_URL;
  }

  // Иначе используем текущий хост
  const origin = window.location.origin;
  return `${origin}/tonconnect-manifest.json`;
};

const manifestUrl = getManifestUrl();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#321e19',
                color: '#fff',
                borderRadius: '12px',
                padding: '12px 16px',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </TonConnectUIProvider>
  </React.StrictMode>
);




