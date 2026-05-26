import { invoke } from '@tauri-apps/api/core'

import { isTauriDesktop } from './env'

export async function listJsonEntitiesFromRust(tableName: string): Promise<unknown[]> {
  return invoke<unknown[]>('list_json_entities', { tableName })
}

export async function putJsonEntitiesBatchToRust(tableName: string, items: unknown[]): Promise<void> {
  if (!items.length) return
  await invoke('put_json_entities_batch', { tableName, items })
}

export async function deleteJsonEntityFromRust(tableName: string, id: string): Promise<void> {
  await invoke('delete_json_entity', { tableName, id })
}

export function shouldUseRustJsonEntities() {
  return isTauriDesktop()
}

const COMMUNITY_SYNC_TABLE = 'communitySyncQueue'

export async function listCommunitySyncQueueFromRust() {
  return listJsonEntitiesFromRust(COMMUNITY_SYNC_TABLE)
}

export async function putCommunitySyncQueueItemsToRust(items: unknown[]) {
  return putJsonEntitiesBatchToRust(COMMUNITY_SYNC_TABLE, items)
}
