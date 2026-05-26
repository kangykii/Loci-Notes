import { createId, db, nowIso } from '../db'
import type { CommunitySyncQueueItem } from '../db'
import {
  listCommunitySyncQueueFromRust,
  putCommunitySyncQueueItemsToRust,
  shouldUseRustJsonEntities,
} from '../tauri/jsonEntitiesClient'

export type CommunitySyncQueueDraft = Pick<CommunitySyncQueueItem, 'entityType' | 'entityId' | 'operation'> & {
  accountId?: string
  workspaceId?: string
  remoteId?: string
  idempotencyKey?: string
  baseRemoteRevision?: string
  localRevision?: string
  payloadHash?: string
  dependencyIds?: string[]
  nextAttemptAt?: string
  status?: CommunitySyncQueueItem['status']
  lastError?: string
}

export type CommunitySyncService = {
  enqueue: (draft: CommunitySyncQueueDraft) => Promise<CommunitySyncQueueItem>
  listPending: () => Promise<CommunitySyncQueueItem[]>
  listFailed: () => Promise<CommunitySyncQueueItem[]>
  saveItem: (item: CommunitySyncQueueItem) => Promise<void>
  markStatus: (id: string, status: CommunitySyncQueueItem['status'], lastError?: string) => Promise<CommunitySyncQueueItem | undefined>
}

async function listCommunitySyncQueue(): Promise<CommunitySyncQueueItem[]> {
  if (shouldUseRustJsonEntities()) {
    return (await listCommunitySyncQueueFromRust()) as CommunitySyncQueueItem[]
  }
  return db.communitySyncQueue.toArray()
}

async function putCommunitySyncQueueItem(item: CommunitySyncQueueItem) {
  if (shouldUseRustJsonEntities()) {
    await putCommunitySyncQueueItemsToRust([item])
    return
  }
  await db.communitySyncQueue.put(item)
}

export const communitySyncService: CommunitySyncService = {
  async enqueue(draft) {
    const now = nowIso()
    const item: CommunitySyncQueueItem = {
      id: createId('community_sync'),
      accountId: draft.accountId,
      workspaceId: draft.workspaceId,
      entityType: draft.entityType,
      entityId: draft.entityId,
      remoteId: draft.remoteId,
      operation: draft.operation,
      idempotencyKey: draft.idempotencyKey ?? `${draft.entityType}:${draft.entityId}:${draft.operation}:${now}`,
      baseRemoteRevision: draft.baseRemoteRevision,
      localRevision: draft.localRevision ?? now,
      payloadHash: draft.payloadHash,
      dependencyIds: draft.dependencyIds,
      nextAttemptAt: draft.nextAttemptAt,
      status: draft.status ?? 'pending',
      attempts: 0,
      lastError: draft.lastError,
      createdAt: now,
      updatedAt: now,
    }
    await putCommunitySyncQueueItem(item)
    return item
  },

  async listPending() {
    const rows = await listCommunitySyncQueue()
    const now = nowIso()
    return rows
      .filter((row) => row.status === 'pending')
      .filter((row) => !row.nextAttemptAt || row.nextAttemptAt <= now)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },

  async listFailed() {
    const rows = await listCommunitySyncQueue()
    return rows.filter((row) => row.status === 'failed')
  },

  async saveItem(item) {
    await putCommunitySyncQueueItem(item)
  },

  async markStatus(id, status, lastError) {
    const rows = await listCommunitySyncQueue()
    const row = rows.find((item) => item.id === id)
    if (!row) return undefined
    const next: CommunitySyncQueueItem = {
      ...row,
      status,
      attempts: status === 'failed' ? row.attempts + 1 : row.attempts,
      lastError,
      updatedAt: nowIso(),
    }
    await putCommunitySyncQueueItem(next)
    return next
  },
}
