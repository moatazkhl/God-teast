import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Check if running inside an external client (like an APK, a local machine, or local file)
const productionHost = 'ais-pre-4cqcy7ci4xtp542lrh3kfz-807175329121.europe-west2.run.app';
const developmentHost = 'ais-dev-4cqcy7ci4xtp542lrh3kfz-807175329121.europe-west2.run.app';

const isNativeApp = 
  window.location.hostname !== productionHost && 
  window.location.hostname !== developmentHost;

// Setup dynamic server URL for standard Android/Capacitor builds
const defaultBackend = 'https://ais-pre-4cqcy7ci4xtp542lrh3kfz-807175329121.europe-west2.run.app';
if (!localStorage.getItem('backend_url')) {
  localStorage.setItem('backend_url', defaultBackend);
}

if (isNativeApp) {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    let url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
    
    // Check if it's an API route in any form (relative path, localhost full path, or custom scheme)
    const isApi = url.startsWith('/api') || 
                  url.includes('://localhost/api') || 
                  url.includes('://127.0.0.1/api') ||
                  url.includes('capacitor://localhost/api');
    
    if (isApi) {
      const backendUrl = localStorage.getItem('backend_url')?.replace(/\/$/, '') || defaultBackend;
      
      // Extract the path from the URL starting with /api
      let apiPath = '';
      if (url.startsWith('/api')) {
        apiPath = url;
      } else {
        const match = url.match(/(\/api\/.*)$/);
        if (match) {
          apiPath = match[1];
        } else {
          apiPath = url; // fallback
        }
      }
      
      url = `${backendUrl}${apiPath}`;
      console.log(`[Capacitor Fetch Redirect] ${input} -> ${url}`);
      
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

