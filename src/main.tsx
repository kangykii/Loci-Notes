import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Landing from './Landing.tsx'

/* eslint-disable react-refresh/only-export-components */
declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown
  }
}

const forceApp = import.meta.env.DEV && new URLSearchParams(window.location.search).has('app')
const Root = window.__TAURI_INTERNALS__ || forceApp ? App : Landing

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
