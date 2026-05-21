import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Landing from './Landing.tsx'
import { logoSrcForBackground } from './brandLogoAssets'

/* eslint-disable react-refresh/only-export-components */
declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown
  }
}

const forceApp = import.meta.env.DEV && new URLSearchParams(window.location.search).has('app')
const Root = window.__TAURI_INTERNALS__ || forceApp ? App : Landing

function updateFaviconForPageBackground() {
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!icon) return

  const backgroundColor = window.getComputedStyle(document.body).backgroundColor
  icon.href = logoSrcForBackground(backgroundColor)
}

updateFaviconForPageBackground()
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateFaviconForPageBackground)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
