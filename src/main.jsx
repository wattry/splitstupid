import React from 'react';
import ReactDOM from 'react-dom/client';
import { PostHogProvider } from '@posthog/react';

import App from './App.jsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {(import.meta.env.PROD || import.meta.env.VITE_PROD)
      ? <PostHogProvider
        apiKey={import.meta.env.VITE_POSTHOG_KEY}
        options={{
          api_host: import.meta.env.VITE_POSTHOG_DOMAIN,
          defaults: '2026-01-30',
          name: 'splitstupid'
        }}>
        <App />
      </PostHogProvider>
      : <App />
    }
  </React.StrictMode>,
)

// Register the service worker for PWA install + offline (production only).
if ((import.meta.env.PROD || import.meta.env.VITE_PROD) && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('SW registration failed:', err)
    })
  })
}
