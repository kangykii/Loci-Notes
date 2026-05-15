import { db, nowIso } from '../db'
import type { AccountProfile, Friendship } from '../db'

export type FriendSearchResult = Pick<AccountProfile, 'accountId' | 'displayName' | 'handle' | 'avatarAssetId'>

export type FriendService = {
  listFriends: (accountId?: string) => Promise<Friendship[]>
  searchAccounts: (query: string) => Promise<FriendSearchResult[]>
  sendRequest: (accountId: string, friend: FriendSearchResult, status?: Friendship['status']) => Promise<Friendship>
  acceptRequest: (friendshipId: string) => Promise<Friendship | undefined>
  declineRequest: (friendshipId: string) => Promise<void>
}

export function normalizeUserHandle(value: string) {
  return value.trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9._-]/g, '')
}

export const friendService: FriendService = {
  async listFriends(accountId) {
    const rows = accountId
      ? await db.friendships.where('accountId').equals(accountId).toArray()
      : await db.friendships.toArray()
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async searchAccounts(query) {
    const needle = normalizeUserHandle(query)
    if (!needle) return []
    const profiles = await db.accountProfiles.toArray()
    return profiles
      .filter((profile) =>
        normalizeUserHandle(profile.handle ?? '') === needle ||
        normalizeUserHandle(profile.handle ?? '').includes(needle) ||
        profile.displayName.toLowerCase().includes(needle)
      )
      .map(({ accountId, displayName, handle, avatarAssetId }) => ({ accountId, displayName, handle, avatarAssetId }))
  },

  async sendRequest(accountId, friend, status = 'pending-outgoing') {
    const now = nowIso()
    const friendship: Friendship = {
      id: `${accountId}_${friend.accountId}`,
      accountId,
      friendAccountId: friend.accountId,
      friendDisplayName: friend.displayName,
      friendHandle: friend.handle,
      friendAvatarAssetId: friend.avatarAssetId,
      status,
      requestedAt: now,
      updatedAt: now,
    }
    await db.friendships.put(friendship)
    return friendship
  },

  async acceptRequest(friendshipId) {
    const friendship = await db.friendships.get(friendshipId)
    if (!friendship) return undefined
    const next: Friendship = { ...friendship, status: 'accepted', updatedAt: nowIso() }
    await db.friendships.put(next)
    return next
  },

  async declineRequest(friendshipId) {
    await db.friendships.delete(friendshipId)
  },
}
