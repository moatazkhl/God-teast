import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Check if running inside Capacitor or as a client-only mobile build
const isNativeApp = 
  window.location.protocol === 'capacitor:' || 
  window.location.protocol === 'file:' || 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

// Setup dynamic server URL for standard Android/Capacitor builds
const defaultBackend = 'https://ais-pre-4cqcy7ci4xtp542lrh3kfz-807175329121.europe-west2.run.app';
if (!localStorage.getItem('backend_url')) {
  localStorage.setItem('backend_url', defaultBackend);
}

if (isNativeApp) {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    let url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
    
    if (url.startsWith('/api')) {
      const backendUrl = localStorage.getItem('backend_url')?.replace(/\/$/, '') || defaultBackend;
      url = `${backendUrl}${url}`;
      
      if (typeof input === 'string') {
        input = url;
      } else if (input instanceof Request) {
        input = new Request(url, {
          method: input.method,
          headers: input.headers,
          body: input.body,
          mode: input.mode,
          credentials: input.credentials,
          cache: input.cache,
          redirect: input.redirect,
          referrer: input.referrer,
          integrity: input.integrity,
        });
      }
    }
    return originalFetch.call(this, input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

