import type { RecordSubscription, UnsubscribeFunc } from 'pocketbase'
import { db, nowIso } from '../db'
import type {
  AccountProfile,
  CollaborationEvent,
  CollaborationParticipant,
  CollaborationSession,
  CommunityActivity,
  CommunityPresetReply,
  CommunityReaction,
  CommunitySyncQueueItem,
  CommunityWidget,
  FriendGroup,
  Friendship,
  RemoteAsset,
  RemoteContentItem,
  SharedNoteExport,
} from '../db'
import { pb } from '../integrations/pocketbase/client'

export type CommunitySyncPushResult = {
  remoteId?: string
  status: 'synced' | 'failed'
  error?: string
}

export type CommunitySyncAdapter = {
  pushActivity: (activity: CommunityActivity, queueItem: CommunitySyncQueueItem) => Promise<CommunitySyncPushResult>
  pushWidget: (widget: CommunityWidget, queueItem: CommunitySyncQueueItem) => Promise<CommunitySyncPushResult>
}

type SyncEntity =
  | AccountProfile
  | Friendship
  | FriendGroup
  | RemoteAsset
  | SharedNoteExport
  | CollaborationSession
  | CollaborationParticipant
  | CollaborationEvent
  | CommunityActivity
  | CommunityWidget
  | CommunityReaction
  | CommunityPresetReply
  | RemoteContentItem

type SyncTable = {
  get: (id: string) => Promise<SyncEntity | undefined>
  put: (row: SyncEntity) => Promise<unknown>
  delete: (id: string) => Promise<void>
}

type SyncTarget = {
  collection: string
  table: SyncTable
}

const MAX_SYNC_ATTEMPTS = 3

const queueTargets: Record<CommunitySyncQueueItem['entityType'], SyncTarget> = {
  activity: { collection: 'community_activities', table: db.communityActivities as SyncTable },
  widget: { collection: 'community_widgets', table: db.communityWidgets as SyncTable },
  reaction: { collection: 'community_reactions', table: db.communityReactions as SyncTable },
  presetReply: { collection: 'community_preset_replies', table: db.communityPresetReplies as SyncTable },
  share: { collection: 'shared_note_exports', table: db.sharedNoteExports as SyncTable },
  collaborationEvent: { collection: 'collaboration_events', table: db.collaborationEvents as SyncTable },
}

const subscribedTargets: SyncTarget[] = [
  { collection: 'account_profiles', table: db.accountProfiles as SyncTable },
  { collection: 'friend_requests', table: db.friendships as SyncTable },
  { collection: 'friend_groups', table: db.friendGroups as SyncTable },
  { collection: 'remote_assets', table: db.remoteAssets as SyncTable },
  { collection: 'shared_note_exports', table: db.sharedNoteExports as SyncTable },
  { collection: 'collaboration_sessions', table: db.collaborationSessions as SyncTable },
  { collection: 'collaboration_participants', table: db.collaborationParticipants as SyncTable },
  { collection: 'collaboration_events', table: db.collaborationEvents as SyncTable },
  { collection: 'community_activities', table: db.communityActivities as SyncTable },
  { collection: 'community_widgets', table: db.communityWidgets as SyncTable },
  { collection: 'community_reactions', table: db.communityReactions as SyncTable },
  { collection: 'community_preset_replies', table: db.communityPresetReplies as SyncTable },
  { collection: 'remote_content_items', table: db.remoteContentItems as SyncTable },
]

let syncStarted = false
let syncUnsubscribers: UnsubscribeFunc[] = []

function remoteTimestamp(record: Record<string, unknown>) {
  const value = record.updatedAt ?? record.updated ?? record.createdAt ?? record.created
  return typeof value === 'string' ? value : nowIso()
}

function normalizeRemoteRecord(record: Record<string, unknown>): SyncEntity {
  const { collectionId: _collectionId, collectionName: _collectionName, expand: _expand, ...data } = record
  const timestamp = remoteTimestamp(record)
  return {
    ...data,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : timestamp,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : typeof data.created === 'string' ? data.created : timestamp,
  } as SyncEntity
}

function isRemoteNewer(local: SyncEntity | undefined, remote: SyncEntity) {
  if (!local) return true
  const localUpdatedAt = 'updatedAt' in local && typeof local.updatedAt === 'string' ? local.updatedAt : ''
  const remoteUpdatedAt = 'updatedAt' in remote && typeof remote.updatedAt === 'string' ? remote.updatedAt : ''
  return !localUpdatedAt || !remoteUpdatedAt || remoteUpdatedAt >= localUpdatedAt
}

async function upsertRemoteRecord(target: SyncTarget, record: Record<string, unknown>) {
  if (typeof record.id !== 'string') return
  const remote = normalizeRemoteRecord(record)
  const local = await target.table.get(record.id)
  if (isRemoteNewer(local, remote)) await target.table.put(remote)
}

async function applyRemoteChange(target: SyncTarget, event: RecordSubscription<Record<string, unknown>>) {
  if (event.action === 'delete') {
    if (typeof event.record.id === 'string') await target.table.delete(event.record.id)
    return
  }
  await upsertRemoteRecord(target, event.record)
}

function serializeForPocketBase(record: SyncEntity) {
  const { id, ...data } = record as SyncEntity & { id: string }
  return { id, ...data }
}

async function deleteRemoteRecord(collection: string, entityId: string) {
  await pb.collection(collection).delete(entityId)
}

async function pushRemoteRecord(target: SyncTarget, queueItem: CommunitySyncQueueItem) {
  if (queueItem.operation === 'delete') {
    await deleteRemoteRecord(target.collection, queueItem.entityId)
    return undefined
  }

  const local = await target.table.get(queueItem.entityId)
  if (!local) throw new Error(`Missing local ${queueItem.entityType} record ${queueItem.entityId}.`)

  const payload = serializeForPocketBase(local)
  if (queueItem.operation === 'update') {
    return await pb.collection(target.collection).update(queueItem.entityId, payload)
  }
  return await pb.collection(target.collection).create(payload)
}

async function markQueueSynced(queueItem: CommunitySyncQueueItem) {
  await db.communitySyncQueue.put({
    ...queueItem,
    status: 'synced',
    lastError: undefined,
    updatedAt: nowIso(),
  })
}

async function markQueueFailure(queueItem: CommunitySyncQueueItem, error: unknown) {
  const attempts = queueItem.attempts + 1
  await db.communitySyncQueue.put({
    ...queueItem,
    status: attempts >= MAX_SYNC_ATTEMPTS ? 'failed' : 'pending',
    attempts,
    lastError: error instanceof Error ? error.message : 'PocketBase sync failed.',
    updatedAt: nowIso(),
  })
}

async function pushQueueItem(queueItem: CommunitySyncQueueItem): Promise<CommunitySyncPushResult> {
  const target = queueTargets[queueItem.entityType]
  if (!target) return { status: 'failed', error: `Unsupported sync entity type ${queueItem.entityType}.` }
  if (queueItem.attempts >= MAX_SYNC_ATTEMPTS) {
    await markQueueFailure(queueItem, 'Maximum PocketBase sync attempts reached.')
    return { status: 'failed', error: 'Maximum PocketBase sync attempts reached.' }
  }

  try {
    const remote = await pushRemoteRecord(target, queueItem)
    await markQueueSynced(queueItem)
    return { status: 'synced', remoteId: typeof remote?.id === 'string' ? remote.id : queueItem.entityId }
  } catch (error) {
    await markQueueFailure(queueItem, error)
    return { status: 'failed', error: error instanceof Error ? error.message : 'PocketBase sync failed.' }
  }
}

export async function flushPendingSyncQueue() {
  const queue = await db.communitySyncQueue.where('status').equals('pending').toArray()
  queue.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const results: CommunitySyncPushResult[] = []
  for (const item of queue) results.push(await pushQueueItem(item))
  return results
}

export async function startSync() {
  if (syncStarted) return
  syncStarted = true
  await flushPendingSyncQueue()
  const unsubscribers: UnsubscribeFunc[] = []

  try {
    for (const target of subscribedTargets) {
      const unsubscribe = await pb.collection(target.collection).subscribe('*', (event) => {
        void applyRemoteChange(target, event as RecordSubscription<Record<string, unknown>>)
      })
      unsubscribers.push(unsubscribe)
    }
    syncUnsubscribers = unsubscribers
  } catch (error) {
    syncStarted = false
    await Promise.allSettled(unsubscribers.map((unsubscribe) => unsubscribe()))
    throw error
  }
}

export async function stopSync() {
  const unsubscribers = syncUnsubscribers
  syncUnsubscribers = []
  syncStarted = false
  await Promise.allSettled(unsubscribers.map((unsubscribe) => unsubscribe()))
}

export const pocketBaseCommunitySyncAdapter: CommunitySyncAdapter = {
  async pushActivity(_activity, queueItem) {
    return await pushQueueItem(queueItem)
  },

  async pushWidget(_widget, queueItem) {
    return await pushQueueItem(queueItem)
  },
}

export const localOnlyCommunitySyncAdapter = pocketBaseCommunitySyncAdapter
