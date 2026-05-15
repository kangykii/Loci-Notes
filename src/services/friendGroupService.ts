import { createId, db, nowIso } from '../db'
import type { FriendGroup } from '../db'

export type FriendGroupService = {
  listGroups: (ownerAccountId?: string) => Promise<FriendGroup[]>
  createGroup: (name: string, ownerAccountId?: string, memberAccountIds?: string[]) => Promise<FriendGroup>
  renameGroup: (groupId: string, name: string) => Promise<FriendGroup | undefined>
  updateMembers: (groupId: string, memberAccountIds: string[]) => Promise<FriendGroup | undefined>
  addMember: (groupId: string, accountId: string) => Promise<FriendGroup | undefined>
  removeMember: (groupId: string, accountId: string) => Promise<FriendGroup | undefined>
  deleteGroup: (groupId: string) => Promise<void>
}

export const friendGroupService: FriendGroupService = {
  async listGroups(ownerAccountId) {
    const groups = ownerAccountId
      ? await db.friendGroups.where('ownerAccountId').equals(ownerAccountId).toArray()
      : await db.friendGroups.toArray()
    return groups.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async createGroup(name, ownerAccountId, memberAccountIds = []) {
    const now = nowIso()
    const group: FriendGroup = {
      id: createId('group'),
      ownerAccountId,
      name: name.trim() || 'New friend group',
      memberAccountIds: Array.from(new Set(memberAccountIds)),
      createdAt: now,
      updatedAt: now,
    }
    await db.friendGroups.put(group)
    return group
  },

  async addMember(groupId, accountId) {
    const group = await db.friendGroups.get(groupId)
    if (!group) return undefined
    const next: FriendGroup = {
      ...group,
      memberAccountIds: Array.from(new Set([...group.memberAccountIds, accountId])),
      updatedAt: nowIso(),
    }
    await db.friendGroups.put(next)
    return next
  },

  async renameGroup(groupId, name) {
    const group = await db.friendGroups.get(groupId)
    if (!group) return undefined
    const next: FriendGroup = {
      ...group,
      name: name.trim() || group.name,
      updatedAt: nowIso(),
    }
    await db.friendGroups.put(next)
    return next
  },

  async updateMembers(groupId, memberAccountIds) {
    const group = await db.friendGroups.get(groupId)
    if (!group) return undefined
    const next: FriendGroup = {
      ...group,
      memberAccountIds: Array.from(new Set(memberAccountIds)),
      updatedAt: nowIso(),
    }
    await db.friendGroups.put(next)
    return next
  },

  async removeMember(groupId, accountId) {
    const group = await db.friendGroups.get(groupId)
    if (!group) return undefined
    const next: FriendGroup = {
      ...group,
      memberAccountIds: group.memberAccountIds.filter((memberId) => memberId !== accountId),
      updatedAt: nowIso(),
    }
    await db.friendGroups.put(next)
    return next
  },

  async deleteGroup(groupId) {
    await db.friendGroups.delete(groupId)
  },
}
