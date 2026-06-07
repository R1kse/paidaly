import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import 'leaflet/dist/leaflet.css';
import './styles.css';

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, r) {
      if (r) {
        // Check for updates every 60 seconds
        setInterval(() => r.update(), 60_000);
      }
    },
  });
  // Force reload when a new SW takes control so stale JS/CSS is never served
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
