import { createId, db, nowIso } from '../db'
import type { CommunitySyncQueueItem } from '../db'

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
  markStatus: (id: string, status: CommunitySyncQueueItem['status'], lastError?: string) => Promise<CommunitySyncQueueItem | undefined>
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
    await db.communitySyncQueue.put(item)
    return item
  },

  async listPending() {
    const rows = await db.communitySyncQueue.where('status').equals('pending').toArray()
    const now = nowIso()
    return rows
      .filter((row) => !row.nextAttemptAt || row.nextAttemptAt <= now)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
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
