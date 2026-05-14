import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import './i18n' // Inicialitzar i18n abans de qualsevol component
import App from './App.jsx'
import './styles/tokens.css'
import './styles/ui.css'
import './index.css'
import './styles/components/toolbar.css'
import { initSentry } from './lib/sentry'

// Boot error monitoring before React mounts so we capture render errors too.
// No-ops automatically when VITE_SENTRY_DSN is unset (e.g. local dev).
initSentry()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

