import React from 'react'
import ReactDOM from 'react-dom/client'
import { PostHogProvider } from '@posthog/react'
import App from './App.jsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PostHogProvider apiKey={'phc_QW2HooRK1fEbKhxBfA6dFQV4yvr4GGXcfQ7ZAu8NGVn'} options={{
      api_host: 'https://us.i.posthog.com',
      defaults: '2026-01-30',
    }}>
      <App />
    </PostHogProvider>
  </React.StrictMode>,
)
