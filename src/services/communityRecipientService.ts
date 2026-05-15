import type { CommunityRecipientKind, FriendshipStatus, FriendGroup, Friendship } from '../db'

export type CommunityRecipient = {
  kind: CommunityRecipientKind
  id: string
  accountIds: string[]
  title: string
  subtitle: string
  initials: string
  status?: FriendshipStatus
}

function initialsFromName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  const initials = words.length === 1 ? words[0].slice(0, 2) : `${words[0][0]}${words[words.length - 1][0]}`
  return initials.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase()
}

export function communityRecipientId(kind: CommunityRecipientKind, id: string) {
  return `${kind}:${id}`
}

export function buildCommunityRecipients(friendships: Friendship[], friendGroups: FriendGroup[], pinnedRecipientIds: string[]) {
  const recipients: CommunityRecipient[] = [
    ...friendships.map((friendship) => ({
      kind: 'friend' as const,
      id: friendship.id,
      accountIds: [friendship.friendAccountId],
      title: friendship.friendDisplayName,
      subtitle: friendship.status === 'accepted' ? '' : 'Pending',
      initials: initialsFromName(friendship.friendDisplayName) || '?',
      status: friendship.status,
    })),
    ...friendGroups.map((group) => ({
      kind: 'group' as const,
      id: group.id,
      accountIds: group.memberAccountIds,
      title: group.name,
      subtitle: `${group.memberAccountIds.length} member${group.memberAccountIds.length === 1 ? '' : 's'}`,
      initials: initialsFromName(group.name) || '?',
    })),
  ]

  return recipients.sort((left, right) => {
    const leftPinned = pinnedRecipientIds.includes(communityRecipientId(left.kind, left.id))
    const rightPinned = pinnedRecipientIds.includes(communityRecipientId(right.kind, right.id))
    if (leftPinned !== rightPinned) return leftPinned ? -1 : 1
    return left.title.localeCompare(right.title)
  })
}
