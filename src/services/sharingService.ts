import { db, createId, noteSnapshotContentHash, nowIso } from '../db'
import type { FriendGroup, Friendship, Note, SharedNoteExport, SharedNoteSnapshot } from '../db'

export type ShareDraft = {
  localNoteId: string
  note?: Pick<Note, 'id' | 'title' | 'content'>
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
  createSharedSnapshot: (share: SharedNoteExport, note: Pick<Note, 'id' | 'title' | 'content'>) => Promise<SharedNoteSnapshot>
  sendNoteToFriend: (localNoteId: string, friend: Friendship, options?: Omit<ShareDraft, 'localNoteId' | 'recipientAccountIds'>) => Promise<SharedNoteExport>
  sendNoteToGroup: (localNoteId: string, group: FriendGroup, options?: Omit<ShareDraft, 'localNoteId' | 'recipientAccountIds'>) => Promise<SharedNoteExport>
  markPublished: (shareId: string, remoteShareId: string) => Promise<SharedNoteExport | undefined>
  attachCollaborationSession: (shareId: string, collaborationSessionId: string) => Promise<SharedNoteExport | undefined>
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
    const snapshotId = draft.snapshotId ?? createId('share_snapshot')
    const share: SharedNoteExport = {
      id: createId('share'),
      localNoteId: draft.localNoteId,
      ownerAccountId: draft.ownerAccountId,
      recipientAccountIds: draft.recipientAccountIds ?? [],
      permission: draft.permission ?? 'view',
      status: 'draft',
      snapshotId,
      collaborationSessionId: draft.collaborationSessionId,
      updatedAt: now,
    }
    await db.transaction('rw', db.sharedNoteExports, db.sharedNoteSnapshots, async () => {
      await db.sharedNoteExports.put(share)
      if (draft.note) await this.createSharedSnapshot(share, draft.note)
    })
    return share
  },

  async createSharedSnapshot(share, note) {
    const now = nowIso()
    const snapshot: SharedNoteSnapshot = {
      id: share.snapshotId ?? createId('share_snapshot'),
      shareId: share.id,
      localNoteId: note.id,
      remoteShareId: share.remoteShareId,
      ownerAccountId: share.ownerAccountId,
      title: note.title,
      content: note.content,
      contentHash: noteSnapshotContentHash(note),
      createdAt: now,
      updatedAt: now,
    }
    await db.sharedNoteSnapshots.put(snapshot)
    return snapshot
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

  async attachCollaborationSession(shareId, collaborationSessionId) {
    const share = await db.sharedNoteExports.get(shareId)
    if (!share) return undefined
    const next: SharedNoteExport = {
      ...share,
      collaborationSessionId,
      updatedAt: nowIso(),
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
