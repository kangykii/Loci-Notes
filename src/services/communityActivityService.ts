import { createId, db, nowIso } from '../db'
import type {
  CommunityActivity,
  CommunityActivityKind,
  CommunityObjectType,
  CommunityPresetReply,
  CommunityPresetReplyKind,
  CommunityReaction,
  CommunityReactionKind,
  CommunityRecipientKind,
  CommunitySyncStatus,
  JSONContent,
} from '../db'

export type CommunityActivityDraft = {
  recipientKind: CommunityRecipientKind
  recipientId: string
  actorAccountId?: string
  kind: CommunityActivityKind
  objectType: CommunityObjectType
  objectId?: string
  payload?: JSONContent
  syncStatus?: CommunitySyncStatus
}

export type CommunityActivityService = {
  listForRecipient: (recipientKind: CommunityRecipientKind, recipientId: string) => Promise<CommunityActivity[]>
  create: (draft: CommunityActivityDraft) => Promise<CommunityActivity>
  markSyncStatus: (activityId: string, syncStatus: CommunitySyncStatus) => Promise<CommunityActivity | undefined>
  addReaction: (activityId: string, kind: CommunityReactionKind, actorAccountId?: string) => Promise<CommunityReaction>
  addPresetReply: (activityId: string, kind: CommunityPresetReplyKind, actorAccountId?: string) => Promise<CommunityPresetReply>
}

export const communityActivityService: CommunityActivityService = {
  async listForRecipient(recipientKind, recipientId) {
    const activities = await db.communityActivities
      .where('[recipientKind+recipientId]')
      .equals([recipientKind, recipientId])
      .toArray()
    return activities.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },

  async create(draft) {
    const now = nowIso()
    const activity: CommunityActivity = {
      id: createId('community_activity'),
      recipientKind: draft.recipientKind,
      recipientId: draft.recipientId,
      actorAccountId: draft.actorAccountId,
      kind: draft.kind,
      objectType: draft.objectType,
      objectId: draft.objectId,
      payload: draft.payload,
      syncStatus: draft.syncStatus ?? 'local',
      createdAt: now,
      updatedAt: now,
    }
    await db.communityActivities.put(activity)
    return activity
  },

  async markSyncStatus(activityId, syncStatus) {
    const activity = await db.communityActivities.get(activityId)
    if (!activity) return undefined
    const next: CommunityActivity = { ...activity, syncStatus, updatedAt: nowIso() }
    await db.communityActivities.put(next)
    return next
  },

  async addReaction(activityId, kind, actorAccountId) {
    const reaction: CommunityReaction = {
      id: createId('community_reaction'),
      activityId,
      actorAccountId,
      kind,
      syncStatus: 'local',
      createdAt: nowIso(),
    }
    await db.communityReactions.put(reaction)
    return reaction
  },

  async addPresetReply(activityId, kind, actorAccountId) {
    const reply: CommunityPresetReply = {
      id: createId('community_reply'),
      activityId,
      actorAccountId,
      kind,
      syncStatus: 'local',
      createdAt: nowIso(),
    }
    await db.communityPresetReplies.put(reply)
    return reply
  },
}
