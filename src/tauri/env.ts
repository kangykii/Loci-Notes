export function isTauriDesktop() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__)
}
