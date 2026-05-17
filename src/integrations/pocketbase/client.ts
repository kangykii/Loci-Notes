import PocketBase, { AsyncAuthStore } from 'pocketbase'

declare global {
  interface Window {
    __TAURI__?: unknown
  }
}

const POCKETBASE_AUTH_STORE_PATH = 'pocketbase-auth.json'
const POCKETBASE_AUTH_STORE_KEY = 'auth'

function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI__)
}

async function loadTauriAuthStoreValue() {
  if (!isTauriRuntime()) return ''
  const { Store } = await import('@tauri-apps/plugin-store')
  const store = await Store.load(POCKETBASE_AUTH_STORE_PATH, {
    defaults: {},
    autoSave: true,
  })
  return await store.get<string>(POCKETBASE_AUTH_STORE_KEY) ?? ''
}

async function saveTauriAuthStoreValue(serialized: string) {
  const { Store } = await import('@tauri-apps/plugin-store')
  const store = await Store.load(POCKETBASE_AUTH_STORE_PATH, {
    defaults: {},
    autoSave: true,
  })
  await store.set(POCKETBASE_AUTH_STORE_KEY, serialized)
  await store.save()
}

async function clearTauriAuthStoreValue() {
  const { Store } = await import('@tauri-apps/plugin-store')
  const store = await Store.load(POCKETBASE_AUTH_STORE_PATH, {
    defaults: {},
    autoSave: true,
  })
  await store.delete(POCKETBASE_AUTH_STORE_KEY)
  await store.save()
}

function createTauriAuthStore() {
  return new AsyncAuthStore({
    initial: loadTauriAuthStoreValue(),
    save: saveTauriAuthStoreValue,
    clear: clearTauriAuthStoreValue,
  })
}

const pocketBaseUrl = import.meta.env.VITE_POCKETBASE_URL

export const pb = new PocketBase(
  pocketBaseUrl,
  isTauriRuntime() ? createTauriAuthStore() : undefined,
)

export function isAuthenticated(): boolean {
  return pb.authStore.isValid
}
