import { useCallback, useMemo, useState } from 'react'
import type { AuthSession, FriendGroup, Friendship, Note, SharedNoteExport, UserSettings } from '../db'
import { collaborationService } from '../services/collaborationService'
import { communityActivityService } from '../services/communityActivityService'
import { communityRecipientId } from '../services/communityRecipientService'
import { friendGroupService } from '../services/friendGroupService'
import { friendService } from '../services/friendService'
import type { FriendSearchResult } from '../services/friendService'
import { sharingService } from '../services/sharingService'
import type { CommunityTarget, GroupDialogDraft } from './types'

type UseCommunityControllerOptions = {
  authSession: AuthSession
  notes: Note[]
  userSettings: UserSettings
  saveUserSettings: (next: UserSettings) => Promise<void>
  showNotice: (message: string) => void
}

export function useCommunityController({
  authSession,
  notes,
  userSettings,
  saveUserSettings,
  showNotice,
}: UseCommunityControllerOptions) {
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [friendGroups, setFriendGroups] = useState<FriendGroup[]>([])
  const [sharedNoteExports, setSharedNoteExports] = useState<SharedNoteExport[]>([])
  const [communitySearchQuery, setCommunitySearchQuery] = useState('')
  const [communitySearchResults, setCommunitySearchResults] = useState<FriendSearchResult[]>([])
  const [communityTarget, setCommunityTarget] = useState<CommunityTarget | null>(null)
  const [groupDialogDraft, setGroupDialogDraft] = useState<GroupDialogDraft | null>(null)

  const acceptedFriendCount = useMemo(
    () => friendships.filter((friendship) => friendship.status === 'accepted').length,
    [friendships],
  )
  const pendingFriendCount = useMemo(
    () => friendships.filter((friendship) => friendship.status !== 'accepted').length,
    [friendships],
  )
  const selectedCommunityFriend = useMemo(
    () => communityTarget?.kind === 'friend'
      ? friendships.find((friendship) => friendship.id === communityTarget.id)
      : undefined,
    [communityTarget, friendships],
  )
  const selectedCommunityGroup = useMemo(
    () => communityTarget?.kind === 'group'
      ? friendGroups.find((group) => group.id === communityTarget.id)
      : undefined,
    [communityTarget, friendGroups],
  )
  const selectedCommunityRecipientIds = selectedCommunityFriend
    ? [selectedCommunityFriend.friendAccountId]
    : selectedCommunityGroup?.memberAccountIds ?? []
  const selectedCommunityShares = useMemo(
    () => selectedCommunityRecipientIds.length
      ? sharedNoteExports.filter((share) =>
        selectedCommunityRecipientIds.some((accountId) => share.recipientAccountIds.includes(accountId)))
      : [],
    [selectedCommunityRecipientIds, sharedNoteExports],
  )
  const acceptedFriendships = useMemo(
    () => friendships.filter((friendship) => friendship.status === 'accepted'),
    [friendships],
  )

  const setInitialCommunityData = useCallback((data: {
    friendships: Friendship[]
    friendGroups: FriendGroup[]
    sharedNoteExports: SharedNoteExport[]
  }) => {
    setFriendships(data.friendships)
    setFriendGroups(data.friendGroups)
    setSharedNoteExports(data.sharedNoteExports)
  }, [])

  const searchCommunityUsers = async () => {
    const results = await friendService.searchAccounts(communitySearchQuery)
    setCommunitySearchResults(results)
  }

  const addCommunitySearchResult = async (result: FriendSearchResult) => {
    if (!authSession.accountId) {
      showNotice('Sign in before sending friend requests.')
      return
    }
    const friendship = await friendService.sendRequest(authSession.accountId, result)
    setFriendships((current) => [friendship, ...current])
    setCommunityTarget({ kind: 'friend', id: friendship.id })
    setCommunitySearchResults([])
    setCommunitySearchQuery('')
    showNotice(`${result.handle ? `@${result.handle}` : result.displayName} request pending.`)
  }

  const removePinnedCommunityRecipient = (target: CommunityTarget) => {
    const targetId = communityRecipientId(target.kind, target.id)
    if (!userSettings.pinnedCommunityRecipientIds.includes(targetId)) return
    void saveUserSettings({
      ...userSettings,
      pinnedCommunityRecipientIds: userSettings.pinnedCommunityRecipientIds.filter((id) => id !== targetId),
    })
  }

  const togglePinnedCommunityRecipient = (target: CommunityTarget) => {
    const targetId = communityRecipientId(target.kind, target.id)
    const pinned = userSettings.pinnedCommunityRecipientIds.includes(targetId)
    const pinnedCommunityRecipientIds = pinned
      ? userSettings.pinnedCommunityRecipientIds.filter((id) => id !== targetId)
      : [targetId, ...userSettings.pinnedCommunityRecipientIds]
    void saveUserSettings({ ...userSettings, pinnedCommunityRecipientIds })
  }

  const acceptCommunityFriend = async (friendshipId: string) => {
    const friendship = await friendService.acceptRequest(friendshipId)
    if (!friendship) return
    setFriendships((current) => current.map((item) => item.id === friendshipId ? friendship : item))
    showNotice(`${friendship.friendDisplayName} accepted.`)
  }

  const rejectCommunityFriend = async (friendshipId: string) => {
    await friendService.declineRequest(friendshipId)
    setFriendships((current) => current.filter((friendship) => friendship.id !== friendshipId))
    setCommunityTarget((current) => current?.kind === 'friend' && current.id === friendshipId ? null : current)
    removePinnedCommunityRecipient({ kind: 'friend', id: friendshipId })
    showNotice('Request removed.')
  }

  const removeCommunityFriend = async (friendshipId: string) => {
    await friendService.declineRequest(friendshipId)
    setFriendships((current) => current.filter((friendship) => friendship.id !== friendshipId))
    setCommunityTarget((current) => current?.kind === 'friend' && current.id === friendshipId ? null : current)
    removePinnedCommunityRecipient({ kind: 'friend', id: friendshipId })
    showNotice('User removed.')
  }

  const openCreateGroupDialog = () => {
    setGroupDialogDraft({
      name: '',
      memberAccountIds: acceptedFriendships.map((friendship) => friendship.friendAccountId),
    })
  }

  const updateGroupDialogName = (name: string) => {
    setGroupDialogDraft((current) => current ? { ...current, name } : current)
  }

  const toggleGroupDialogMember = (accountId: string) => {
    setGroupDialogDraft((current) => {
      if (!current) return current
      const memberAccountIds = current.memberAccountIds.includes(accountId)
        ? current.memberAccountIds.filter((id) => id !== accountId)
        : [...current.memberAccountIds, accountId]
      return { ...current, memberAccountIds }
    })
  }

  const closeGroupDialog = () => setGroupDialogDraft(null)

  const saveFriendGroupDialog = async () => {
    if (!groupDialogDraft?.name.trim()) return
    const group = await friendGroupService.createGroup(
      groupDialogDraft.name,
      authSession.accountId,
      groupDialogDraft.memberAccountIds,
    )
    setFriendGroups((current) => [group, ...current])
    setCommunityTarget({ kind: 'group', id: group.id })
    setGroupDialogDraft(null)
    showNotice('Friend group created.')
  }

  const createTargetedShareForSelectedNote = async (
    permission: SharedNoteExport['permission'] = 'view',
    noteId?: string,
  ) => {
    if (!noteId) {
      showNotice('Search for a note, then press Send or Enter.')
      return
    }
    const noteToShare = notes.find((note) => note.id === noteId)
    if (!noteToShare) {
      showNotice('That note could not be found.')
      return
    }
    if (!selectedCommunityFriend && !selectedCommunityGroup) {
      showNotice('Choose a friend or group before sending a note.')
      return
    }
    const options = { ownerAccountId: authSession.accountId, permission }
    const share = selectedCommunityFriend
      ? await sharingService.sendNoteToFriend(noteToShare.id, selectedCommunityFriend, options)
      : await sharingService.sendNoteToGroup(noteToShare.id, selectedCommunityGroup as FriendGroup, options)
    await communityActivityService.create({
      recipientKind: selectedCommunityFriend ? 'friend' : 'group',
      recipientId: selectedCommunityFriend?.id ?? (selectedCommunityGroup as FriendGroup).id,
      actorAccountId: authSession.accountId,
      kind: 'note-shared',
      objectType: 'sharedNoteExport',
      objectId: share.id,
      payload: {
        noteId: noteToShare.id,
        title: noteToShare.title || 'Untitled Note',
        permission,
      },
    })
    setSharedNoteExports((current) => [share, ...current])
    showNotice(permission === 'edit' ? 'Editable note share prepared.' : 'Note share prepared.')
  }

  const createCollaborationForSelectedNote = async (noteId?: string) => {
    if (!noteId) {
      showNotice('Search for a note, then choose Edit together.')
      return
    }
    const note = notes.find((n) => n.id === noteId)
    if (!note) {
      showNotice('That note could not be found.')
      return
    }
    if (!selectedCommunityFriend && !selectedCommunityGroup) {
      showNotice('Choose a friend or group before starting edit-together.')
      return
    }
    const options = { ownerAccountId: authSession.accountId, permission: 'edit' as const }
    const share = selectedCommunityFriend
      ? await sharingService.sendNoteToFriend(note.id, selectedCommunityFriend, options)
      : await sharingService.sendNoteToGroup(note.id, selectedCommunityGroup as FriendGroup, options)
    const session = await collaborationService.createSession({
      localNoteId: note.id,
      shareId: share.id,
      ownerAccountId: authSession.accountId,
      title: note.title || 'Untitled collaboration',
    })
    await communityActivityService.create({
      recipientKind: selectedCommunityFriend ? 'friend' : 'group',
      recipientId: selectedCommunityFriend?.id ?? (selectedCommunityGroup as FriendGroup).id,
      actorAccountId: authSession.accountId,
      kind: 'edit-session-created',
      objectType: 'collaborationSession',
      objectId: session.id,
      payload: {
        noteId: note.id,
        shareId: share.id,
        title: session.title,
      },
    })
    setSharedNoteExports((current) => [{ ...share, collaborationSessionId: session.id }, ...current])
    showNotice('Edit-together foundation created for this note.')
  }

  return {
    acceptedFriendCount,
    acceptedFriendships,
    addCommunitySearchResult,
    closeGroupDialog,
    communitySearchQuery,
    communitySearchResults,
    communityTarget,
    createCollaborationForSelectedNote,
    createTargetedShareForSelectedNote,
    friendGroups,
    friendships,
    groupDialogDraft,
    openCreateGroupDialog,
    pendingFriendCount,
    rejectCommunityFriend,
    removeCommunityFriend,
    saveFriendGroupDialog,
    searchCommunityUsers,
    selectedCommunityFriend,
    selectedCommunityGroup,
    selectedCommunityShares,
    setCommunitySearchQuery,
    setCommunityTarget,
    setInitialCommunityData,
    toggleGroupDialogMember,
    togglePinnedCommunityRecipient,
    acceptCommunityFriend,
    updateGroupDialogName,
  }
}
