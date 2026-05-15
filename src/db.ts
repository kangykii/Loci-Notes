import Dexie from 'dexie'

export type JSONContent = {
  type?: string
  attrs?: Record<string, unknown>
  content?: JSONContent[]
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  text?: string
  [key: string]: unknown
}

export type Project = {
  id: string
  name: string
  description?: string
  color: string
  createdAt: string
}

export type UserProfile = {
  id: 'local'
  displayName: string
  initials: string
  avatarColor: string
  createdAt: string
  updatedAt: string
}

export type AIProviderId = 'openai' | 'gemini' | 'claude' | 'kimi'

export type AIProviderSettings = {
  enabled: boolean
  apiKey: string
  model: string
  baseUrl?: string
}

export type UserSettings = {
  id: 'local'
  defaultAIProvider: AIProviderId
  aiProviders: Record<AIProviderId, AIProviderSettings>
  aiTemperature: number
  aiMaxTokens: number
  aiTimeoutMs?: number
  aiIncludeNoteTitle: boolean
  aiIncludeSelectedText: boolean
  aiIncludeNoteExcerpt: boolean
  aiLastStatus?: 'idle' | 'success' | 'error' | 'timeout'
  aiLastProvider?: AIProviderId
  aiLastError?: string
  aiLastUsage?: {
    inputTokens?: number
    outputTokens?: number
    cachedTokens?: number
  }
  aiLastRequestAt?: string
  highlighterColor: string
  reduceMotion: boolean
  compactMode: boolean
  preferredAtomSubView?: 'atoms' | 'sets'
  pinnedCommunityRecipientIds: string[]
  createdAt: string
  updatedAt: string
}

export type AuthSession = {
  id: 'current'
  status: 'signed-out' | 'signed-in' | 'offline'
  provider?: string
  accountId?: string
  accessTokenExpiresAt?: string
  lastCheckedAt: string
  updatedAt: string
}

export type AccountProfile = {
  accountId: string
  displayName: string
  handle?: string
  tag?: string
  email?: string
  avatarAssetId?: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

export type FriendshipStatus = 'pending-outgoing' | 'pending-incoming' | 'accepted' | 'blocked'

export type Friendship = {
  id: string
  accountId: string
  friendAccountId: string
  friendDisplayName: string
  friendHandle?: string
  friendAvatarAssetId?: string
  status: FriendshipStatus
  requestedAt: string
  updatedAt: string
}

export type FriendGroup = {
  id: string
  ownerAccountId?: string
  name: string
  memberAccountIds: string[]
  createdAt: string
  updatedAt: string
}

export type RemoteAsset = {
  id: string
  ownerAccountId?: string
  kind: 'profile-avatar' | 'banner-image' | 'note-share-asset'
  localUrl?: string
  remoteUrl?: string
  mimeType?: string
  width?: number
  height?: number
  updatedAt: string
}

export type SharedNoteExport = {
  id: string
  localNoteId: string
  remoteShareId?: string
  ownerAccountId?: string
  recipientAccountIds: string[]
  permission: 'view' | 'comment' | 'edit'
  status: 'draft' | 'published' | 'revoked' | 'deleted'
  snapshotId?: string
  collaborationSessionId?: string
  publishedAt?: string
  revokedAt?: string
  updatedAt: string
}

export type CollaborationSession = {
  id: string
  localNoteId: string
  shareId?: string
  ownerAccountId?: string
  title: string
  status: 'draft' | 'active' | 'paused' | 'closed'
  createdAt: string
  updatedAt: string
}

export type CollaborationParticipant = {
  id: string
  sessionId: string
  accountId: string
  displayName: string
  handle?: string
  role: 'owner' | 'editor' | 'viewer'
  joinedAt: string
  lastSeenAt?: string
}

export type CollaborationEvent = {
  id: string
  sessionId: string
  clientId: string
  actorAccountId?: string
  kind: 'presence' | 'content-op' | 'comment' | 'system'
  payload: JSONContent
  syncStatus: 'local' | 'pending' | 'synced' | 'failed'
  createdAt: string
}

export type CommunityRecipientKind = 'friend' | 'group'
export type CommunitySyncStatus = 'local' | 'pending' | 'synced' | 'failed'

export type CommunityActivityKind =
  | 'note-shared'
  | 'edit-session-created'
  | 'access-requested'
  | 'study-timer-started'
  | 'study-ranking-updated'
  | 'reaction-added'
  | 'preset-reply-added'
  | 'system'

export type CommunityObjectType =
  | 'note'
  | 'sharedNoteExport'
  | 'collaborationSession'
  | 'studyTimer'
  | 'ranking'
  | 'flashcardChallenge'
  | 'groupGoal'
  | 'reaction'
  | 'presetReply'
  | 'system'

export type CommunityActivity = {
  id: string
  recipientKind: CommunityRecipientKind
  recipientId: string
  actorAccountId?: string
  kind: CommunityActivityKind
  objectType: CommunityObjectType
  objectId?: string
  payload?: JSONContent
  syncStatus: CommunitySyncStatus
  createdAt: string
  updatedAt: string
}

export type CommunityWidgetKind = 'study-timer' | 'ranking' | 'flashcard-challenge' | 'group-goal'
export type CommunityWidgetStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'

export type CommunityWidget = {
  id: string
  kind: CommunityWidgetKind
  ownerAccountId?: string
  recipientKind: CommunityRecipientKind
  recipientId: string
  status: CommunityWidgetStatus
  payload: JSONContent
  syncStatus: CommunitySyncStatus
  createdAt: string
  updatedAt: string
}

export type CommunityReactionKind = 'seen' | 'helpful' | 'done' | 'question'

export type CommunityReaction = {
  id: string
  activityId: string
  actorAccountId?: string
  kind: CommunityReactionKind
  syncStatus: CommunitySyncStatus
  createdAt: string
}

export type CommunityPresetReplyKind = 'reviewing' | 'looks-good' | 'send-again' | 'done'

export type CommunityPresetReply = {
  id: string
  activityId: string
  actorAccountId?: string
  kind: CommunityPresetReplyKind
  syncStatus: CommunitySyncStatus
  createdAt: string
}

export type CommunitySyncQueueItem = {
  id: string
  entityType: 'activity' | 'widget' | 'reaction' | 'presetReply' | 'share' | 'collaborationEvent'
  entityId: string
  operation: 'create' | 'update' | 'delete'
  status: Exclude<CommunitySyncStatus, 'local'>
  attempts: number
  lastError?: string
  createdAt: string
  updatedAt: string
}

export type RemoteContentPlacement = 'landing' | 'app-banner' | 'settings' | 'dev-notification'

export type RemoteContentItem = {
  id: string
  placement: RemoteContentPlacement
  campaignId?: string
  title: string
  body?: string
  imageAssetId?: string
  href?: string
  startsAt?: string
  endsAt?: string
  cachedAt: string
  updatedAt: string
}

export type Atom = {
  id: string
  projectId: string
  phrase: string
  definition: string
  tags: string[]
  createdAt: string
  updatedAt: string
  reviewCount: number
  knownCount: number
}

export type FlashcardSet = {
  id: string
  name: string
  description?: string
  atomIds: string[]
  createdAt: string
  updatedAt: string
  lastStudiedAt?: string
}

export type NoteTemplateId = 'blank' | 'report' | 'planner' | 'slideshow'

export type LociBlockType =
  | 'paragraph'
  | 'heading'
  | 'checklist'
  | 'table'
  | 'flashcard'
  | 'bulletList'
  | 'numberedList'
  | 'quote'
  | 'image'
  | 'divider'
  | 'callout'
  | 'template'

export type LociBlock = {
  id: string
  type: LociBlockType
  content: JSONContent
  attrs?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type TemplateTask = {
  id: string
  text: string
  done: boolean
}

export type TemplateScheduleItem = {
  id: string
  time: string
  text: string
}

export type TemplateSlide = {
  id: string
  title: string
  body: JSONContent
  speakerNotes: string
}

export type NoteTemplateData =
  | { kind: 'blank'; body: JSONContent }
  | {
      kind: 'report'
      subtitle: string
      summary: string
      findings: string
      recommendations: string
      appendix: JSONContent
    }
  | {
      kind: 'planner'
      date: string
      priorities: string[]
      tasks: TemplateTask[]
      schedule: TemplateScheduleItem[]
      notes: JSONContent
    }
  | {
      kind: 'slideshow'
      activeSlideId: string
      slides: TemplateSlide[]
    }

export type Note = {
  id: string
  title: string
  projectId: string
  templateId: NoteTemplateId
  templateData: NoteTemplateData
  blocks?: LociBlock[]
  author: string
  tags: string[]
  content: JSONContent
  createdAt: string
  updatedAt: string
}

export type NoteMeta = {
  id: string
  title: string
  projectId: string
  templateId: NoteTemplateId
  tags: string[]
  updatedAt: string
  preview: string
  hasMedia: boolean
}

export type NoteBody = {
  noteId: string
  content: JSONContent
  templateData: NoteTemplateData
  blocks?: LociBlock[]
  updatedAt: string
}

export type MediaAsset = {
  id: string
  noteId: string
  kind: 'image'
  thumbSrc: string
  fullSrc: string
  width?: number
  height?: number
  updatedAt: string
}

/** Point-in-time title + body for restore. */
export type NoteSnapshot = {
  id: string
  noteId: string
  savedAt: string
  title: string
  content: JSONContent
  contentHash: string
}

export const NOTE_SNAPSHOT_MAX_PER_NOTE = 25

function snapshotContentHash(note: Pick<Note, 'title' | 'content'>) {
  return `${note.title.length}:${JSON.stringify(note.content)}`
}

class LociNotesDatabase extends Dexie {
  notes!: Dexie.Table<Note, string>
  atoms!: Dexie.Table<Atom, string>
  flashcardSets!: Dexie.Table<FlashcardSet, string>
  projects!: Dexie.Table<Project, string>
  noteMetas!: Dexie.Table<NoteMeta, string>
  noteBodies!: Dexie.Table<NoteBody, string>
  mediaAssets!: Dexie.Table<MediaAsset, string>
  noteSnapshots!: Dexie.Table<NoteSnapshot, string>
  userProfiles!: Dexie.Table<UserProfile, string>
  userSettings!: Dexie.Table<UserSettings, string>
  authSessions!: Dexie.Table<AuthSession, string>
  accountProfiles!: Dexie.Table<AccountProfile, string>
  friendships!: Dexie.Table<Friendship, string>
  friendGroups!: Dexie.Table<FriendGroup, string>
  remoteAssets!: Dexie.Table<RemoteAsset, string>
  sharedNoteExports!: Dexie.Table<SharedNoteExport, string>
  collaborationSessions!: Dexie.Table<CollaborationSession, string>
  collaborationParticipants!: Dexie.Table<CollaborationParticipant, string>
  collaborationEvents!: Dexie.Table<CollaborationEvent, string>
  communityActivities!: Dexie.Table<CommunityActivity, string>
  communityWidgets!: Dexie.Table<CommunityWidget, string>
  communityReactions!: Dexie.Table<CommunityReaction, string>
  communityPresetReplies!: Dexie.Table<CommunityPresetReply, string>
  communitySyncQueue!: Dexie.Table<CommunitySyncQueueItem, string>
  remoteContentItems!: Dexie.Table<RemoteContentItem, string>

  constructor() {
    super('loci-notes')
    this.version(1).stores({
      notes: 'id, title, projectId, updatedAt, *tags',
      atoms: 'id, phrase, updatedAt',
      projects: 'id, name',
    })
    this.version(2)
      .stores({
        notes: 'id, title, projectId, updatedAt, *tags',
        atoms: 'id, phrase, updatedAt, *tags',
        projects: 'id, name',
      })
      .upgrade(async (tx) => {
        await tx
          .table('atoms')
          .toCollection()
          .modify((atom) => {
            atom.tags = atom.tags ?? []
          })
      })
    this.version(3).stores({
      notes: 'id, title, projectId, updatedAt, *tags',
      atoms: 'id, phrase, updatedAt, *tags',
      projects: 'id, name',
      noteSnapshots: 'id, noteId, savedAt',
    })
    this.version(4)
      .stores({
        notes: 'id, title, projectId, templateId, updatedAt, *tags',
        atoms: 'id, phrase, updatedAt, *tags',
        projects: 'id, name',
        noteSnapshots: 'id, noteId, savedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('notes')
          .toCollection()
          .modify((note) => {
            note.templateId = note.templateId ?? 'blank'
          })
      })
    this.version(5)
      .stores({
        notes: 'id, title, projectId, templateId, updatedAt, *tags',
        atoms: 'id, phrase, updatedAt, *tags',
        projects: 'id, name',
        noteSnapshots: 'id, noteId, savedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('notes')
          .toCollection()
          .modify((note) => {
            note.templateId = note.templateId ?? 'blank'
            note.templateData = note.templateData ?? { kind: 'blank', body: note.content }
          })
      })
    this.version(6).stores({
      notes: 'id, title, projectId, templateId, updatedAt, *tags',
      atoms: 'id, phrase, updatedAt, *tags',
      projects: 'id, name',
      noteSnapshots: 'id, noteId, savedAt',
      userProfiles: 'id',
    })
    this.version(7).stores({
      notes: 'id, title, projectId, templateId, updatedAt, *tags',
      atoms: 'id, phrase, updatedAt, *tags',
      projects: 'id, name',
      noteSnapshots: 'id, noteId, savedAt',
      userProfiles: 'id',
      userSettings: 'id',
    })
    this.version(8)
      .stores({
        notes: 'id, title, projectId, templateId, updatedAt, *tags',
        atoms: 'id, phrase, updatedAt, *tags',
        projects: 'id, name',
        noteSnapshots: 'id, noteId, savedAt',
        userProfiles: 'id',
        userSettings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('projects')
          .toCollection()
          .modify((project) => {
            project.description = project.description ?? ''
          })
      })
    this.version(9)
      .stores({
        notes: 'id, title, projectId, templateId, updatedAt, *tags',
        atoms: 'id, phrase, updatedAt, *tags',
        projects: 'id, name',
        noteSnapshots: 'id, noteId, savedAt',
        userProfiles: 'id',
        userSettings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('notes')
          .toCollection()
          .modify((note) => {
            note.blocks = note.blocks ?? contentToSeedBlocks(note.content)
          })
      })
    this.version(10).stores({
      notes: 'id, title, projectId, templateId, updatedAt, *tags',
      atoms: 'id, phrase, updatedAt, *tags',
      flashcardSets: 'id, name, updatedAt, lastStudiedAt, *atomIds',
      projects: 'id, name',
      noteSnapshots: 'id, noteId, savedAt',
      userProfiles: 'id',
      userSettings: 'id',
    })
    this.version(11)
      .stores({
        notes: 'id, title, projectId, templateId, updatedAt, *tags',
        noteMetas: 'id, title, projectId, templateId, updatedAt, *tags, hasMedia',
        noteBodies: 'noteId, updatedAt',
        mediaAssets: 'id, noteId, kind, updatedAt',
        atoms: 'id, phrase, updatedAt, *tags',
        flashcardSets: 'id, name, updatedAt, lastStudiedAt, *atomIds',
        projects: 'id, name',
        noteSnapshots: 'id, noteId, savedAt',
        userProfiles: 'id',
        userSettings: 'id',
      })
      .upgrade(async (tx) => {
        const notes = await tx.table('notes').toArray() as Note[]
        await tx.table('noteMetas').bulkPut(notes.map(noteToMeta))
        await tx.table('noteBodies').bulkPut(notes.map(noteToBody))
        const assets = notes.flatMap(noteToMediaAssets)
        if (assets.length) await tx.table('mediaAssets').bulkPut(assets)
      })
    this.version(12)
      .stores({
        notes: 'id, title, projectId, templateId, updatedAt, *tags',
        noteMetas: 'id, title, projectId, templateId, updatedAt, *tags, hasMedia',
        noteBodies: 'noteId, updatedAt',
        mediaAssets: 'id, noteId, kind, updatedAt',
        atoms: 'id, projectId, phrase, [projectId+phrase], updatedAt, *tags',
        flashcardSets: 'id, name, updatedAt, lastStudiedAt, *atomIds',
        projects: 'id, name',
        noteSnapshots: 'id, noteId, savedAt',
        userProfiles: 'id',
        userSettings: 'id',
      })
      .upgrade(async (tx) => {
        const atomsTable = tx.table('atoms')
        const bodyTable = tx.table('noteBodies')
        const setTable = tx.table('flashcardSets')
        const atoms = await atomsTable.toArray() as Atom[]
        const bodies = await bodyTable.toArray() as NoteBody[]
        const noteMetas = await tx.table('noteMetas').toArray() as NoteMeta[]
        const noteProjectById = new Map(noteMetas.map((note) => [note.id, note.projectId]))
        const usageByAtomId = new Map<string, Set<string>>()

        bodies.forEach((body) => {
          const projectId = noteProjectById.get(body.noteId) ?? '__unassigned__'
          collectAtomIdsFromContent(body.content).forEach((atomId) => {
            const projects = usageByAtomId.get(atomId) ?? new Set<string>()
            projects.add(projectId)
            usageByAtomId.set(atomId, projects)
          })
        })

        const atomIdProjectMap = new Map<string, Map<string, string>>()
        const migratedAtoms: Atom[] = []

        atoms.forEach((atom) => {
          const projects = Array.from(usageByAtomId.get(atom.id) ?? [])
          const scopedProjects = projects.length ? projects : [atom.projectId ?? '__unassigned__']
          const projectMap = new Map<string, string>()
          scopedProjects.forEach((projectId, index) => {
            const scopedAtom: Atom = {
              ...atom,
              id: index === 0 ? atom.id : createId('atom'),
              projectId,
            }
            projectMap.set(projectId, scopedAtom.id)
            migratedAtoms.push(scopedAtom)
          })
          atomIdProjectMap.set(atom.id, projectMap)
        })

        const migratedBodies = bodies.map((body) => {
          const projectId = noteProjectById.get(body.noteId) ?? '__unassigned__'
          const idMap = new Map<string, string>()
          atomIdProjectMap.forEach((projectMap, atomId) => {
            const mappedId = projectMap.get(projectId)
            if (mappedId && mappedId !== atomId) idMap.set(atomId, mappedId)
          })
          if (!idMap.size) return body
          const content = remapAtomIdsInContent(body.content, idMap)
          const templateData = remapAtomIdsInTemplateData(body.templateData, idMap)
          const blocks = body.blocks?.map((block) => ({
            ...block,
            content: remapAtomIdsInContent(block.content, idMap),
          }))
          return { ...body, content, templateData, blocks }
        })

        const sets = await setTable.toArray() as FlashcardSet[]
        const migratedSets = sets.map((set) => {
          const atomIds = set.atomIds.flatMap((atomId) => {
            const projectMap = atomIdProjectMap.get(atomId)
            return projectMap ? Array.from(projectMap.values()) : [atomId]
          })
          return { ...set, atomIds: Array.from(new Set(atomIds)) }
        })

        await atomsTable.clear()
        if (migratedAtoms.length) await atomsTable.bulkPut(migratedAtoms)
        if (migratedBodies.length) await bodyTable.bulkPut(migratedBodies)
        if (migratedSets.length) await setTable.bulkPut(migratedSets)
      })
    this.version(13).stores({
      notes: 'id, title, projectId, templateId, updatedAt, *tags',
      noteMetas: 'id, title, projectId, templateId, updatedAt, *tags, hasMedia',
      noteBodies: 'noteId, updatedAt',
      mediaAssets: 'id, noteId, kind, updatedAt',
      atoms: 'id, projectId, phrase, [projectId+phrase], updatedAt, *tags',
      flashcardSets: 'id, name, updatedAt, lastStudiedAt, *atomIds',
      projects: 'id, name',
      noteSnapshots: 'id, noteId, savedAt',
      userProfiles: 'id',
      userSettings: 'id',
      authSessions: 'id, status, accountId, updatedAt',
      accountProfiles: 'accountId, handle, updatedAt',
      friendships: 'id, accountId, friendAccountId, status, updatedAt',
      remoteAssets: 'id, ownerAccountId, kind, updatedAt',
      sharedNoteExports: 'id, localNoteId, remoteShareId, ownerAccountId, status, updatedAt, *recipientAccountIds',
      remoteContentItems: 'id, placement, campaignId, startsAt, endsAt, updatedAt',
    })
    this.version(14).stores({
      notes: 'id, title, projectId, templateId, updatedAt, *tags',
      noteMetas: 'id, title, projectId, templateId, updatedAt, *tags, hasMedia',
      noteBodies: 'noteId, updatedAt',
      mediaAssets: 'id, noteId, kind, updatedAt',
      atoms: 'id, projectId, phrase, [projectId+phrase], updatedAt, *tags',
      flashcardSets: 'id, name, updatedAt, lastStudiedAt, *atomIds',
      projects: 'id, name',
      noteSnapshots: 'id, noteId, savedAt',
      userProfiles: 'id',
      userSettings: 'id',
      authSessions: 'id, status, accountId, updatedAt',
      accountProfiles: 'accountId, handle, tag, updatedAt',
      friendships: 'id, accountId, friendAccountId, status, updatedAt',
      friendGroups: 'id, ownerAccountId, name, updatedAt, *memberAccountIds',
      remoteAssets: 'id, ownerAccountId, kind, updatedAt',
      sharedNoteExports: 'id, localNoteId, remoteShareId, ownerAccountId, status, collaborationSessionId, updatedAt, *recipientAccountIds',
      collaborationSessions: 'id, localNoteId, shareId, ownerAccountId, status, updatedAt',
      collaborationParticipants: 'id, sessionId, accountId, role, lastSeenAt',
      collaborationEvents: 'id, sessionId, clientId, actorAccountId, kind, syncStatus, createdAt',
      remoteContentItems: 'id, placement, campaignId, startsAt, endsAt, updatedAt',
    })
    this.version(15).stores({
      notes: 'id, title, projectId, templateId, updatedAt, *tags',
      noteMetas: 'id, title, projectId, templateId, updatedAt, *tags, hasMedia',
      noteBodies: 'noteId, updatedAt',
      mediaAssets: 'id, noteId, kind, updatedAt',
      atoms: 'id, projectId, phrase, [projectId+phrase], updatedAt, *tags',
      flashcardSets: 'id, name, updatedAt, lastStudiedAt, *atomIds',
      projects: 'id, name',
      noteSnapshots: 'id, noteId, savedAt',
      userProfiles: 'id',
      userSettings: 'id',
      authSessions: 'id, status, accountId, updatedAt',
      accountProfiles: 'accountId, handle, tag, updatedAt',
      friendships: 'id, accountId, friendAccountId, status, updatedAt',
      friendGroups: 'id, ownerAccountId, name, updatedAt, *memberAccountIds',
      remoteAssets: 'id, ownerAccountId, kind, updatedAt',
      sharedNoteExports: 'id, localNoteId, remoteShareId, ownerAccountId, status, collaborationSessionId, updatedAt, *recipientAccountIds',
      collaborationSessions: 'id, localNoteId, shareId, ownerAccountId, status, updatedAt',
      collaborationParticipants: 'id, sessionId, accountId, role, lastSeenAt',
      collaborationEvents: 'id, sessionId, clientId, actorAccountId, kind, syncStatus, createdAt',
      communityActivities: 'id, recipientKind, recipientId, [recipientKind+recipientId], actorAccountId, kind, objectType, objectId, syncStatus, createdAt, updatedAt',
      communityWidgets: 'id, kind, recipientKind, recipientId, [recipientKind+recipientId], ownerAccountId, status, syncStatus, createdAt, updatedAt',
      communityReactions: 'id, activityId, actorAccountId, kind, syncStatus, createdAt',
      communityPresetReplies: 'id, activityId, actorAccountId, kind, syncStatus, createdAt',
      communitySyncQueue: 'id, entityType, entityId, operation, status, updatedAt',
      remoteContentItems: 'id, placement, campaignId, startsAt, endsAt, updatedAt',
    })
  }
}

export const db = new LociNotesDatabase()

export const nowIso = () => new Date().toISOString()

export const createId = (prefix: string) =>
  `${prefix}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`

function blockTypeForNode(node: JSONContent): LociBlockType {
  if (node.type === 'doc') return blockTypeForNode(node.content?.[0] ?? { type: 'paragraph' })
  if (node.type === 'heading') return 'heading'
  if (node.type === 'taskList') return 'checklist'
  if (node.type === 'table') return 'table'
  if (node.type === 'lociFlashcard') return 'flashcard'
  if (node.type === 'lociQuote') return 'quote'
  if (node.type === 'bulletList') return 'bulletList'
  if (node.type === 'orderedList') return 'numberedList'
  if (node.type === 'blockquote') return 'quote'
  if (node.type === 'image') return 'image'
  if (node.type === 'horizontalRule') return 'divider'
  return 'paragraph'
}

function contentToSeedBlocks(content?: JSONContent): LociBlock[] {
  const now = nowIso()
  const nodes = content?.type === 'doc' ? content.content ?? [] : []
  const sourceNodes = nodes.length ? nodes : [{ type: 'paragraph', content: [] }]
  return [{
    id: createId('block'),
    type: blockTypeForNode(sourceNodes[0] ?? { type: 'paragraph' }),
    content: { type: 'doc', content: sourceNodes },
    createdAt: now,
    updatedAt: now,
  }]
}

function collectAtomIdsFromContent(content: JSONContent): string[] {
  const attrAtomId = typeof content.attrs?.atomId === 'string' ? [content.attrs.atomId] : []
  const markAtomIds = (content.marks ?? [])
    .filter((mark) => mark.type === 'atom' && typeof mark.attrs?.atomId === 'string')
    .map((mark) => mark.attrs?.atomId as string)
  return [...attrAtomId, ...markAtomIds, ...(content.content ?? []).flatMap(collectAtomIdsFromContent)]
}

function remapAtomIdsInContent(content: JSONContent, atomIdMap: Map<string, string>): JSONContent {
  const next: JSONContent = { ...content }
  if (content.attrs && typeof content.attrs.atomId === 'string') {
    const mappedAtomId = atomIdMap.get(content.attrs.atomId)
    if (mappedAtomId) next.attrs = { ...content.attrs, atomId: mappedAtomId }
  }
  if (content.marks) {
    next.marks = content.marks.map((mark) => {
      if (mark.type !== 'atom' || typeof mark.attrs?.atomId !== 'string') return mark
      const mappedAtomId = atomIdMap.get(mark.attrs.atomId)
      return mappedAtomId ? { ...mark, attrs: { ...mark.attrs, atomId: mappedAtomId } } : mark
    })
  }
  if (content.content) next.content = content.content.map((child) => remapAtomIdsInContent(child, atomIdMap))
  return next
}

function remapAtomIdsInTemplateData(templateData: NoteTemplateData, atomIdMap: Map<string, string>): NoteTemplateData {
  if (templateData.kind === 'blank') return { ...templateData, body: remapAtomIdsInContent(templateData.body, atomIdMap) }
  if (templateData.kind === 'report') return { ...templateData, appendix: remapAtomIdsInContent(templateData.appendix, atomIdMap) }
  if (templateData.kind === 'planner') return { ...templateData, notes: remapAtomIdsInContent(templateData.notes, atomIdMap) }
  if (templateData.kind === 'slideshow') {
    return {
      ...templateData,
      slides: templateData.slides.map((slide) => ({ ...slide, body: remapAtomIdsInContent(slide.body, atomIdMap) })),
    }
  }
  return templateData
}

function collectPlainText(content: JSONContent | undefined): string {
  if (!content) return ''
  if (typeof content.text === 'string') return content.text
  return (content.content ?? []).map(collectPlainText).join(' ').replace(/\s+/g, ' ').trim()
}

function truncatePreview(value: string, max = 180) {
  const text = value.replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 3))}...`
}

function collectImageAssets(note: Pick<Note, 'id' | 'updatedAt' | 'content'>): MediaAsset[] {
  const assets: MediaAsset[] = []
  const visit = (node: JSONContent) => {
    if (node.type === 'image' && typeof node.attrs?.src === 'string') {
      const src = node.attrs.src
      assets.push({
        id: `${note.id}_image_${assets.length}`,
        noteId: note.id,
        kind: 'image',
        thumbSrc: src,
        fullSrc: src,
        width: typeof node.attrs.width === 'number' ? node.attrs.width : undefined,
        height: typeof node.attrs.height === 'number' ? node.attrs.height : undefined,
        updatedAt: note.updatedAt,
      })
    }
    ;(node.content ?? []).forEach(visit)
  }
  visit(note.content)
  return assets
}

export function noteToMeta(note: Note): NoteMeta {
  const mediaAssets = collectImageAssets(note)
  return {
    id: note.id,
    title: note.title,
    projectId: note.projectId,
    templateId: note.templateId,
    tags: note.tags ?? [],
    updatedAt: note.updatedAt,
    preview: truncatePreview(collectPlainText(note.content)),
    hasMedia: mediaAssets.length > 0,
  }
}

export function noteToBody(note: Note): NoteBody {
  return {
    noteId: note.id,
    content: note.content,
    templateData: note.templateData,
    blocks: note.blocks,
    updatedAt: note.updatedAt,
  }
}

export function noteToMediaAssets(note: Note): MediaAsset[] {
  return collectImageAssets(note)
}

/** Skip if identical to latest snapshot; drop oldest past cap. */
export async function appendNoteSnapshot(note: Pick<Note, 'id' | 'title' | 'content'>) {
  const contentHash = snapshotContentHash(note)
  const existing = await db.noteSnapshots.where('noteId').equals(note.id).toArray()
  existing.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  if (existing[0]?.contentHash === contentHash) return

  const row: NoteSnapshot = {
    id: createId('snap'),
    noteId: note.id,
    savedAt: nowIso(),
    title: note.title,
    content: note.content,
    contentHash,
  }
  await db.noteSnapshots.add(row)

  const total = existing.length + 1
  const surplus = total - NOTE_SNAPSHOT_MAX_PER_NOTE
  if (surplus <= 0) return
  existing.sort((a, b) => a.savedAt.localeCompare(b.savedAt))
  await db.noteSnapshots.bulkDelete(existing.slice(0, surplus).map((s) => s.id))
}

export async function loadNoteSnapshots(noteId: string): Promise<NoteSnapshot[]> {
  const rows = await db.noteSnapshots.where('noteId').equals(noteId).toArray()
  rows.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  return rows
}

export const initialProjects: Project[] = [
  {
    id: 'project_database',
    name: 'System Database',
    description: 'Course notes, database concepts, and study material.',
    color: '#111111',
    createdAt: nowIso(),
  },
  {
    id: 'project_design',
    name: 'Design Studio',
    description: 'Design references, experiments, and loose creative work.',
    color: '#ece8dc',
    createdAt: nowIso(),
  },
]

export const initialAtoms: Atom[] = [
  {
    id: 'atom_normalization',
    projectId: 'project_database',
    phrase: 'Normalization',
    definition:
      'A database design process that organizes data to reduce redundancy and improve consistency.',
    tags: ['Database', 'Study'],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    reviewCount: 0,
    knownCount: 0,
  },
  {
    id: 'atom_5nf',
    projectId: 'project_database',
    phrase: '5NF',
    definition:
      'Fifth normal form, a database normalization level focused on decomposing tables to remove join dependencies.',
    tags: ['Database'],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    reviewCount: 0,
    knownCount: 0,
  },
]

const seedInitialNotes: Array<Omit<Note, 'templateData'>> = [
  {
    id: 'note_database_week_4',
    title: 'Database Systems Week 4',
    projectId: 'project_database',
    templateId: 'blank',
    author: 'Floyd Lawton',
    tags: ['College', 'Lecture', 'Daily', 'Productivity', 'Database'],
    createdAt: '2026-04-19T10:39:00.000Z',
    updatedAt: '2026-04-19T10:39:00.000Z',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [
            {
              type: 'text',
              text: 'Normalization',
              marks: [
                {
                  type: 'atom',
                  attrs: {
                    atomId: 'atom_normalization',
                    phrase: 'Normalization',
                    definition:
                      'A database design process that organizes data to reduce redundancy and improve consistency.',
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Normalization is the process of ordering basic data structures to ensure that the basic data created is of good quality. Used to minimize data redundancy and data inconsistencies. Normalization stage starts from the lightest stage (1NF) to the strictest (',
            },
            {
              type: 'text',
              text: '5NF',
              marks: [
                {
                  type: 'atom',
                  attrs: {
                    atomId: 'atom_5nf',
                    phrase: '5NF',
                    definition:
                      'Fifth normal form, a database normalization level focused on decomposing tables to remove join dependencies.',
                  },
                },
              ],
            },
            {
              type: 'text',
              text: '). Usually only up to the 3NF or BCNF level as they are sufficient to produce good quality tables.',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'note_exploration',
    title: 'Exploration Ideas',
    projectId: 'project_design',
    templateId: 'blank',
    author: 'Floyd Lawton',
    tags: ['Design', 'Productivity', 'Training'],
    createdAt: '2026-04-20T08:15:00.000Z',
    updatedAt: '2026-04-20T08:15:00.000Z',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Blandit pharetra tellus metus fermentum pellentesque augue sit. Donec senectus ideas for future study flows.',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'note_grocery',
    title: 'Grocery List',
    projectId: 'project_design',
    templateId: 'blank',
    author: 'Floyd Lawton',
    tags: ['Shopping', 'List'],
    createdAt: '2026-04-18T09:05:00.000Z',
    updatedAt: '2026-04-18T09:05:00.000Z',
    content: {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Coffee beans' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Notebook tabs' }] }] },
          ],
        },
      ],
    },
  },
]

export const initialNotes: Note[] = seedInitialNotes.map((note) => ({
  ...note,
  templateData: { kind: 'blank', body: note.content },
}))

export const initialAccountProfiles: AccountProfile[] = [
  {
    accountId: 'demo_devi',
    displayName: 'Devi K',
    handle: 'devik',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    accountId: 'demo_vijay',
    displayName: 'Vijay',
    handle: 'vijay',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    accountId: 'demo_ananya',
    displayName: 'Ananya',
    handle: 'ananya',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    accountId: 'demo_siddarth',
    displayName: 'Siddarth Bruh',
    handle: 'siddarth',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
]

export const initialFriendships: Friendship[] = initialAccountProfiles.map((profile) => ({
  id: `local_${profile.accountId}`,
  accountId: 'local',
  friendAccountId: profile.accountId,
  friendDisplayName: profile.displayName,
  friendHandle: profile.handle,
  status: 'accepted',
  requestedAt: nowIso(),
  updatedAt: nowIso(),
}))

export const initialFriendGroups: FriendGroup[] = [
  {
    id: 'group_study_circle',
    ownerAccountId: 'local',
    name: 'Study circle',
    memberAccountIds: ['demo_devi', 'demo_vijay', 'demo_ananya'],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
]

export async function ensureSeedData() {
  const noteCount = await db.notes.count()
  await ensureCommunitySeedData()
  if (noteCount > 0) return

  await db.transaction('rw', [db.projects, db.atoms, db.notes, db.noteMetas, db.noteBodies, db.mediaAssets, db.noteSnapshots], async () => {
    await db.projects.bulkPut(initialProjects)
    await db.atoms.bulkPut(initialAtoms)
    await db.notes.bulkPut(initialNotes)
    await db.noteMetas.bulkPut(initialNotes.map(noteToMeta))
    await db.noteBodies.bulkPut(initialNotes.map(noteToBody))
    const assets = initialNotes.flatMap(noteToMediaAssets)
    if (assets.length) await db.mediaAssets.bulkPut(assets)
  })
}

async function ensureCommunitySeedData() {
  const existingProfiles = await db.accountProfiles.bulkGet(initialAccountProfiles.map((profile) => profile.accountId))
  const missingProfiles = initialAccountProfiles.filter((_, index) => !existingProfiles[index])
  const existingFriendships = await db.friendships.bulkGet(initialFriendships.map((friendship) => friendship.id))
  const missingFriendships = initialFriendships.filter((_, index) => !existingFriendships[index])
  const existingGroups = await db.friendGroups.bulkGet(initialFriendGroups.map((group) => group.id))
  const missingGroups = initialFriendGroups.filter((_, index) => !existingGroups[index])

  if (!missingProfiles.length && !missingFriendships.length && !missingGroups.length) return

  await db.transaction('rw', [db.accountProfiles, db.friendships, db.friendGroups], async () => {
    if (missingProfiles.length) await db.accountProfiles.bulkPut(missingProfiles)
    if (missingFriendships.length) await db.friendships.bulkPut(missingFriendships)
    if (missingGroups.length) await db.friendGroups.bulkPut(missingGroups)
  })
}
