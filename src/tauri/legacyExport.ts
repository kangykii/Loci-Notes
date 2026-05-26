import { db } from '../db'
import type {
  Atom,
  FlashcardReviewState,
  FlashcardSet,
  Note,
  NoteBody,
  NoteMeta,
  NoteSnapshot,
  Project,
  UserProfile,
  UserSettings,
} from '../db'
import { importLegacyDexie, fetchDbStatus } from './dbClient'
import { isTauriDesktop } from './env'

const COMMUNITY_TABLES = [
  'authSessions',
  'accountProfiles',
  'friendships',
  'friendGroups',
  'remoteAssets',
  'sharedNoteExports',
  'sharedNoteSnapshots',
  'collaborationSessions',
  'collaborationParticipants',
  'collaborationEvents',
  'communityActivities',
  'communityWidgets',
  'communityReactions',
  'communityPresetReplies',
  'communitySyncQueue',
  'remoteContentItems',
  'surveyPromptStates',
  'remoteEntityMappings',
] as const

export type LegacyExport = {
  notes: Note[]
  noteMetas: NoteMeta[]
  noteBodies: NoteBody[]
  mediaAssets: Awaited<ReturnType<typeof db.mediaAssets.toArray>>
  projects: Project[]
  atoms: Atom[]
  flashcardSets: FlashcardSet[]
  flashcardReviewStates: FlashcardReviewState[]
  noteSnapshots: NoteSnapshot[]
  userProfiles: UserProfile[]
  userSettings: UserSettings[]
  jsonEntities: Array<{
    tableName: string
    id: string
    payload: unknown
    updatedAt?: string
  }>
}

async function dexieHasWorkspaceData() {
  const [projectCount, noteCount, atomCount] = await Promise.all([
    db.projects.count(),
    db.notes.count(),
    db.atoms.count(),
  ])
  return projectCount > 0 || noteCount > 0 || atomCount > 0
}

async function exportCommunityJsonEntities() {
  const jsonEntities: LegacyExport['jsonEntities'] = []
  for (const tableName of COMMUNITY_TABLES) {
    const table = (db as unknown as Record<string, { toArray: () => Promise<Array<Record<string, unknown>>> }>)[tableName]
    if (!table?.toArray) continue
    const rows = await table.toArray()
    for (const row of rows) {
      const id = String(row.id ?? row.accountId ?? row.noteId ?? crypto.randomUUID())
      jsonEntities.push({
        tableName,
        id,
        payload: row,
        updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : undefined,
      })
    }
  }
  return jsonEntities
}

export async function exportLegacyDexieSnapshot(): Promise<LegacyExport> {
  const [
    notes,
    noteMetas,
    noteBodies,
    mediaAssets,
    projects,
    atoms,
    flashcardSets,
    flashcardReviewStates,
    noteSnapshots,
    userProfiles,
    userSettings,
    jsonEntities,
  ] = await Promise.all([
    db.notes.toArray(),
    db.noteMetas.toArray(),
    db.noteBodies.toArray(),
    db.mediaAssets.toArray(),
    db.projects.toArray(),
    db.atoms.toArray(),
    db.flashcardSets.toArray(),
    db.flashcardReviewStates.toArray(),
    db.noteSnapshots.toArray(),
    db.userProfiles.toArray(),
    db.userSettings.toArray(),
    exportCommunityJsonEntities(),
  ])

  return {
    notes,
    noteMetas,
    noteBodies,
    mediaAssets,
    projects,
    atoms,
    flashcardSets,
    flashcardReviewStates,
    noteSnapshots,
    userProfiles,
    userSettings,
    jsonEntities,
  }
}

export async function ensureRustBackendReady() {
  if (!isTauriDesktop()) return

  const status = await fetchDbStatus()
  if (status.legacyImportDone) return

  const hasDexieData = await dexieHasWorkspaceData()
  if (!hasDexieData) {
    return
  }

  const snapshot = await exportLegacyDexieSnapshot()
  await importLegacyDexie(snapshot)
}
