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
  // 1. If explicitly set in env, use it
  if (import.meta.env.VITE_TONCONNECT_MANIFEST_URL) {
    return import.meta.env.VITE_TONCONNECT_MANIFEST_URL;
  }

  const origin = window.location.origin;
  
  // 2. Try to derive from VITE_API_URL if it's an absolute URL
  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (apiUrl.startsWith('http')) {
    // If API is on a different domain, use the backend's dynamic manifest endpoint
    // We strip /api/v1 or /v1 or /api from the end to get the root
    const baseUrl = apiUrl.replace(/\/(api\/v1|v1|api)\/?$/, '');
    return `${baseUrl}/api/tonconnect-manifest.json?origin=${encodeURIComponent(origin)}`;
  }

  // 3. Fallback: assume API is on the same origin (local or proxied)
  // If the origin already ends with something, we just append. 
  // But usually origin is clean.
  return `${origin}/api/tonconnect-manifest.json?origin=${encodeURIComponent(origin)}`;
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




