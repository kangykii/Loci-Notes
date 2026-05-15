import { db, createId, nowIso } from '../db'
import type { FriendGroup, Friendship, SharedNoteExport } from '../db'

export type ShareDraft = {
  localNoteId: string
  ownerAccountId?: string
  recipientAccountIds?: string[]
  permission?: SharedNoteExport['permission']
  snapshotId?: string
  collaborationSessionId?: string
}

export type SharingService = {
  listForNote: (localNoteId: string) => Promise<SharedNoteExport[]>
  listAll: () => Promise<SharedNoteExport[]>
  createDraft: (draft: ShareDraft) => Promise<SharedNoteExport>
  sendNoteToFriend: (localNoteId: string, friend: Friendship, options?: Omit<ShareDraft, 'localNoteId' | 'recipientAccountIds'>) => Promise<SharedNoteExport>
  sendNoteToGroup: (localNoteId: string, group: FriendGroup, options?: Omit<ShareDraft, 'localNoteId' | 'recipientAccountIds'>) => Promise<SharedNoteExport>
  markPublished: (shareId: string, remoteShareId: string) => Promise<SharedNoteExport | undefined>
  revoke: (shareId: string) => Promise<SharedNoteExport | undefined>
}

export const sharingService: SharingService = {
  listForNote: (localNoteId) => db.sharedNoteExports.where('localNoteId').equals(localNoteId).toArray(),

  async listAll() {
    const shares = await db.sharedNoteExports.toArray()
    return shares.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async createDraft(draft) {
    const now = nowIso()
    const share: SharedNoteExport = {
      id: createId('share'),
      localNoteId: draft.localNoteId,
      ownerAccountId: draft.ownerAccountId,
      recipientAccountIds: draft.recipientAccountIds ?? [],
      permission: draft.permission ?? 'view',
      status: 'draft',
      snapshotId: draft.snapshotId,
      collaborationSessionId: draft.collaborationSessionId,
      updatedAt: now,
    }
    await db.sharedNoteExports.put(share)
    return share
  },

  sendNoteToFriend(localNoteId, friend, options = {}) {
    return this.createDraft({
      ...options,
      localNoteId,
      recipientAccountIds: [friend.friendAccountId],
    })
  },

  sendNoteToGroup(localNoteId, group, options = {}) {
    return this.createDraft({
      ...options,
      localNoteId,
      recipientAccountIds: group.memberAccountIds,
    })
  },

  async markPublished(shareId, remoteShareId) {
    const share = await db.sharedNoteExports.get(shareId)
    if (!share) return undefined
    const now = nowIso()
    const next: SharedNoteExport = {
      ...share,
      remoteShareId,
      status: 'published',
      publishedAt: now,
      updatedAt: now,
    }
    await db.sharedNoteExports.put(next)
    return next
  },

  async revoke(shareId) {
    const share = await db.sharedNoteExports.get(shareId)
    if (!share) return undefined
    const now = nowIso()
    const next: SharedNoteExport = {
      ...share,
      status: 'revoked',
      revokedAt: now,
      updatedAt: now,
    }
    await db.sharedNoteExports.put(next)
    return next
  },
}
