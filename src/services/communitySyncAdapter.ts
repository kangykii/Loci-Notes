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
  SharedNoteSnapshot,
} from '../db'
import { pb } from '../integrations/pocketbase/client'
import { validateRemoteSyncRecord } from './remoteRecordValidation'

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
  | SharedNoteSnapshot
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

function assertAuthenticatedForSync() {
  if (!pb.authStore.isValid) throw new Error('Cannot sync without a valid authenticated session.')
}

function currentAccountId() {
  const id = (pb.authStore.model as { id?: unknown } | null | undefined)?.id
  return typeof id === 'string' && id.trim() ? id : undefined
}

function assertQueueItemAccountScope(queueItem: CommunitySyncQueueItem) {
  const accountId = currentAccountId()
  if (!accountId) throw new Error('Cannot sync without a signed-in account id.')
  if (queueItem.accountId && queueItem.accountId !== accountId) {
    throw new Error('Cannot sync a queue item owned by a different account.')
  }
  return accountId
}

function hasOwnerScope(record: SyncEntity, accountId: string) {
  const scoped = record as SyncEntity & {
    accountId?: string
    ownerAccountId?: string
    actorAccountId?: string
    recipientAccountIds?: string[]
    memberAccountIds?: string[]
  }
  return scoped.accountId === accountId
    || scoped.ownerAccountId === accountId
    || scoped.actorAccountId === accountId
    || scoped.recipientAccountIds?.includes(accountId) === true
    || scoped.memberAccountIds?.includes(accountId) === true
}

async function isVisibleShare(shareId: string | undefined, accountId: string) {
  if (!shareId) return false
  const share = await db.sharedNoteExports.get(shareId)
  return share ? hasOwnerScope(share, accountId) : false
}

async function isVisibleSession(sessionId: string | undefined, accountId: string) {
  if (!sessionId) return false
  const session = await db.collaborationSessions.get(sessionId)
  if (session && (hasOwnerScope(session, accountId) || await isVisibleShare(session.shareId, accountId))) return true
  const participant = await db.collaborationParticipants
    .where('sessionId')
    .equals(sessionId)
    .and((row) => row.accountId === accountId)
    .first()
  return Boolean(participant)
}

async function isVisibleActivity(activityId: string | undefined, accountId: string) {
  if (!activityId) return false
  const activity = await db.communityActivities.get(activityId)
  return activity ? await isRemoteRecordInAccountScope({ collection: 'community_activities', table: db.communityActivities as SyncTable }, activity, accountId) : false
}

async function isVisibleGroup(groupId: string | undefined, accountId: string) {
  if (!groupId) return false
  const group = await db.friendGroups.get(groupId)
  return group ? hasOwnerScope(group, accountId) : false
}

async function isRemoteRecordInAccountScope(target: SyncTarget, record: SyncEntity, accountId: string): Promise<boolean> {
  if (target.collection === 'remote_content_items') return true
  if (hasOwnerScope(record, accountId)) return true

  if (target.collection === 'shared_note_snapshots') {
    const snapshot = record as SharedNoteSnapshot
    return await isVisibleShare(snapshot.shareId, accountId)
  }

  if (target.collection === 'collaboration_sessions') {
    const session = record as CollaborationSession
    return await isVisibleShare(session.shareId, accountId)
  }

  if (target.collection === 'collaboration_participants') {
    const participant = record as CollaborationParticipant
    return participant.accountId === accountId || await isVisibleSession(participant.sessionId, accountId)
  }

  if (target.collection === 'collaboration_events') {
    const event = record as CollaborationEvent
    return await isVisibleSession(event.sessionId, accountId)
  }

  if (target.collection === 'community_activities') {
    const activity = record as CommunityActivity
    if (activity.recipientKind === 'friend') return activity.recipientId === accountId
    if (activity.recipientKind === 'group') return await isVisibleGroup(activity.recipientId, accountId)
  }

  if (target.collection === 'community_widgets') {
    const widget = record as CommunityWidget
    if (widget.recipientKind === 'friend') return widget.recipientId === accountId
    if (widget.recipientKind === 'group') return await isVisibleGroup(widget.recipientId, accountId)
  }

  if (target.collection === 'community_reactions') {
    const reaction = record as CommunityReaction
    return await isVisibleActivity(reaction.activityId, accountId)
  }

  if (target.collection === 'community_preset_replies') {
    const reply = record as CommunityPresetReply
    return await isVisibleActivity(reply.activityId, accountId)
  }

  return false
}

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
  { collection: 'shared_note_snapshots', table: db.sharedNoteSnapshots as SyncTable },
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
  const { collectionId, collectionName, expand, ...data } = record
  void collectionId
  void collectionName
  void expand
  const timestamp = remoteTimestamp(record)
  return {
    ...data,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : timestamp,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : typeof data.created === 'string' ? data.created : timestamp,
  } as SyncEntity
}

function validateNormalizedRemoteRecord(target: SyncTarget, record: Record<string, unknown>) {
  const remote = normalizeRemoteRecord(record) as SyncEntity & { cachedAt?: string }
  if (target.collection === 'remote_content_items' && typeof remote.cachedAt !== 'string') {
    remote.cachedAt = nowIso()
  }
  const validation = validateRemoteSyncRecord(target.collection, remote)
  if (!validation.ok) {
    console.warn(validation.reason)
    return undefined
  }
  return validation.value
}

function isRemoteNewer(local: SyncEntity | undefined, remote: SyncEntity) {
  if (!local) return true
  const localUpdatedAt = 'updatedAt' in local && typeof local.updatedAt === 'string' ? local.updatedAt : ''
  const remoteUpdatedAt = 'updatedAt' in remote && typeof remote.updatedAt === 'string' ? remote.updatedAt : ''
  return !localUpdatedAt || !remoteUpdatedAt || remoteUpdatedAt >= localUpdatedAt
}

async function upsertRemoteRecord(target: SyncTarget, record: Record<string, unknown>) {
  const accountId = currentAccountId()
  if (!accountId) return
  if (typeof record.id !== 'string') return
  const remote = validateNormalizedRemoteRecord(target, record)
  if (!remote) return
  if (!await isRemoteRecordInAccountScope(target, remote, accountId)) {
    console.warn(`Skipped ${target.collection} record outside the current account scope.`)
    return
  }
  const local = await target.table.get(record.id)
  if (isRemoteNewer(local, remote)) await target.table.put(remote)
}

async function applyRemoteChange(target: SyncTarget, event: RecordSubscription<Record<string, unknown>>) {
  const accountId = currentAccountId()
  if (!accountId) return
  if (event.action === 'delete') {
    if (typeof event.record.id === 'string') {
      const local = await target.table.get(event.record.id)
      if (!local || await isRemoteRecordInAccountScope(target, local, accountId)) await target.table.delete(event.record.id)
    }
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
  const accountId = assertQueueItemAccountScope(queueItem)
  if (queueItem.operation === 'delete') {
    await deleteRemoteRecord(target.collection, queueItem.remoteId ?? queueItem.entityId)
    return undefined
  }

  const local = await target.table.get(queueItem.entityId)
  if (!local) throw new Error(`Missing local ${queueItem.entityType} record ${queueItem.entityId}.`)
  if (!await isRemoteRecordInAccountScope(target, local, accountId)) {
    throw new Error(`Cannot sync ${queueItem.entityType} record outside the current account scope.`)
  }

  const payload = serializeForPocketBase(local)
  const remoteId = queueItem.remoteId ?? queueItem.entityId
  if (queueItem.operation === 'update') {
    return await pb.collection(target.collection).update(remoteId, payload)
  }
  return await pb.collection(target.collection).create(payload)
}

async function markQueueSynced(queueItem: CommunitySyncQueueItem) {
  await db.communitySyncQueue.put({
    ...queueItem,
    status: 'synced',
    lastError: undefined,
    remoteId: queueItem.remoteId ?? queueItem.entityId,
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
  assertAuthenticatedForSync()
  assertQueueItemAccountScope(queueItem)
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
  assertAuthenticatedForSync()
  const queue = await db.communitySyncQueue.where('status').equals('pending').toArray()
  const now = nowIso()
  const readyQueue = queue
    .filter((item) => !item.nextAttemptAt || item.nextAttemptAt <= now)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const results: CommunitySyncPushResult[] = []
  for (const item of readyQueue) {
    results.push(await pushQueueItem(item))
  }
  return results
}

export async function startSync() {
  if (syncStarted) return
  assertAuthenticatedForSync()
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

export const localOnlyCommunitySyncAdapter: CommunitySyncAdapter = {
  async pushActivity() {
    return { status: 'failed', error: 'Community sync is disabled in local-only mode.' }
  },

  async pushWidget() {
    return { status: 'failed', error: 'Community sync is disabled in local-only mode.' }
  },
}
