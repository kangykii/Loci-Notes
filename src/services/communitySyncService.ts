import { createId, db, nowIso } from '../db'
import type { CommunitySyncQueueItem } from '../db'

export type CommunitySyncQueueDraft = Pick<CommunitySyncQueueItem, 'entityType' | 'entityId' | 'operation'> & {
  status?: CommunitySyncQueueItem['status']
  lastError?: string
}

export type CommunitySyncService = {
  enqueue: (draft: CommunitySyncQueueDraft) => Promise<CommunitySyncQueueItem>
  listPending: () => Promise<CommunitySyncQueueItem[]>
  markStatus: (id: string, status: CommunitySyncQueueItem['status'], lastError?: string) => Promise<CommunitySyncQueueItem | undefined>
}

export const communitySyncService: CommunitySyncService = {
  async enqueue(draft) {
    const now = nowIso()
    const item: CommunitySyncQueueItem = {
      id: createId('community_sync'),
      entityType: draft.entityType,
      entityId: draft.entityId,
      operation: draft.operation,
      status: draft.status ?? 'pending',
      attempts: 0,
      lastError: draft.lastError,
      createdAt: now,
      updatedAt: now,
    }
    await db.communitySyncQueue.put(item)
    return item
  },

  async listPending() {
    const rows = await db.communitySyncQueue.where('status').equals('pending').toArray()
    return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },

  async markStatus(id, status, lastError) {
    const row = await db.communitySyncQueue.get(id)
    if (!row) return undefined
    const next: CommunitySyncQueueItem = {
      ...row,
      status,
      attempts: status === 'failed' ? row.attempts + 1 : row.attempts,
      lastError,
      updatedAt: nowIso(),
    }
    await db.communitySyncQueue.put(next)
    return next
  },
}
