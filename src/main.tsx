import { Component, StrictMode } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
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

function agentDebugLog(runId: string, hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  void fetch('http://127.0.0.1:7423/ingest/286192ce-6c82-40f2-8b4a-d1f0bcf75335', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '9bd32d' }, body: JSON.stringify({ sessionId: '9bd32d', runId, hypothesisId, location, message, data, timestamp: Date.now() }) }).catch(() => {})
}

class AgentDebugErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.setState({ hasError: true })
    // #region agent log
    agentDebugLog('initial', 'H3', 'src/main.tsx:29', 'React render error captured', {
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      componentStack: info.componentStack?.slice(0, 1200),
    })
    // #endregion
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 24 }}>App failed to render. Debug logs captured for this session.</div>
    }
    return this.props.children
  }
}

// #region agent log
agentDebugLog('initial', 'H2,H3,H4', 'src/main.tsx:48', 'Frontend entry selected root', {
  hasTauriInternals: !!window.__TAURI_INTERNALS__,
  forceApp,
  rootName: Root === App ? 'App' : 'Landing',
  href: window.location.href,
})
// #endregion

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
    <AgentDebugErrorBoundary>
      <Root />
    </AgentDebugErrorBoundary>
  </StrictMode>,
)

// #region agent log
agentDebugLog('initial', 'H3,H4', 'src/main.tsx:74', 'React render scheduled', {
  rootElementPresent: !!document.getElementById('root'),
})
// #endregion
