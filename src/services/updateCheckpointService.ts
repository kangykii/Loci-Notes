import { getVersion } from '@tauri-apps/api/app'
import { db } from '../db'

const UPDATE_CHECKPOINT_STORE_PATH = 'update-checkpoints.json'
const UPDATE_CHECKPOINT_KEY = 'latest'

export type UpdateCheckpoint = {
  currentAppVersion: string
  targetAppVersion: string
  databaseSchemaVersion: number
  createdAt: string
  note: string
  backupStatus: 'marker-only'
}

async function loadStore() {
  const { Store } = await import('@tauri-apps/plugin-store')
  return await Store.load(UPDATE_CHECKPOINT_STORE_PATH, {
    defaults: {},
    autoSave: true,
  })
}

export async function recordUpdateCheckpoint(targetAppVersion: string): Promise<UpdateCheckpoint> {
  await db.open()
  const checkpoint: UpdateCheckpoint = {
    currentAppVersion: await getVersion(),
    targetAppVersion,
    databaseSchemaVersion: db.verno,
    createdAt: new Date().toISOString(),
    note: 'Marker only: this records update context for diagnostics and is not a data backup or rollback point.',
    backupStatus: 'marker-only',
  }

  const store = await loadStore()
  await store.set(UPDATE_CHECKPOINT_KEY, checkpoint)
  await store.save()
  return checkpoint
}
