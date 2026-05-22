import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from './db'

const oldContent = {
  type: 'doc',
  content: [{
    type: 'paragraph',
    content: [{ type: 'text', text: 'Photosynthesis turns light into stored energy.' }],
  }],
}

async function resetDatabase() {
  db.close()
  await Dexie.delete('loci-notes')
}

afterEach(async () => {
  await resetDatabase()
})

async function seedVersion1Workspace() {
  const oldDb = new Dexie('loci-notes')
  oldDb.version(1).stores({
    notes: 'id, title, projectId, updatedAt, *tags',
    atoms: 'id, phrase, updatedAt',
    projects: 'id, name',
  })
  await oldDb.open()
  await oldDb.table('projects').put({
    id: 'project_old',
    name: 'Old Project',
    color: '#2E3440',
    createdAt: '2026-01-01T00:00:00.000Z',
  })
  await oldDb.table('atoms').put({
    id: 'atom_old',
    phrase: 'photosynthesis',
    definition: 'Light energy converted into chemical energy.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    reviewCount: 0,
    knownCount: 0,
  })
  await oldDb.table('notes').put({
    id: 'note_old',
    title: 'Old Note',
    projectId: 'project_old',
    author: 'Tester',
    tags: ['biology'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    content: oldContent,
  })
  oldDb.close()
}

async function seedVersion10Workspace() {
  const oldDb = new Dexie('loci-notes')
  oldDb.version(10).stores({
    notes: 'id, title, projectId, templateId, updatedAt, *tags',
    atoms: 'id, phrase, updatedAt, *tags',
    flashcardSets: 'id, name, updatedAt, lastStudiedAt, *atomIds',
    projects: 'id, name',
    noteSnapshots: 'id, noteId, savedAt',
    userProfiles: 'id',
    userSettings: 'id',
  })
  await oldDb.open()
  await oldDb.table('projects').put({
    id: 'project_v10',
    name: 'Version 10 Project',
    description: 'Existing local project',
    color: '#2E3440',
    createdAt: '2026-02-01T00:00:00.000Z',
  })
  await oldDb.table('atoms').put({
    id: 'atom_v10',
    projectId: 'project_v10',
    phrase: 'migration',
    definition: 'A schema upgrade path.',
    tags: ['release'],
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-02T00:00:00.000Z',
    reviewCount: 1,
    knownCount: 0,
  })
  await oldDb.table('flashcardSets').put({
    id: 'set_v10',
    name: 'Release Set',
    atomIds: ['atom_v10'],
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-02T00:00:00.000Z',
  })
  await oldDb.table('notes').put({
    id: 'note_v10',
    title: 'Version 10 Note',
    projectId: 'project_v10',
    templateId: 'blank',
    templateData: { kind: 'blank', body: oldContent },
    blocks: [{ id: 'block_v10', type: 'paragraph', content: oldContent, createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-02T00:00:00.000Z' }],
    author: 'Tester',
    tags: ['release'],
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-02T00:00:00.000Z',
    content: oldContent,
  })
  await oldDb.table('noteSnapshots').put({
    id: 'snapshot_v10',
    noteId: 'note_v10',
    savedAt: '2026-02-02T00:00:00.000Z',
    title: 'Version 10 Note',
    content: oldContent,
    contentHash: 'old',
  })
  await oldDb.table('userSettings').put({
    id: 'local',
    theme: 'loci',
    defaultAIProvider: 'openai',
    aiProviders: {},
    aiTemperature: 0.2,
    aiMaxTokens: 500,
    aiIncludeNoteTitle: true,
    aiIncludeSelectedText: true,
    aiIncludeNoteExcerpt: true,
    highlighterColor: 'rgba(62, 50, 32, 0.18)',
    reduceMotion: false,
    compactMode: false,
    editorAnimatedTyping: false,
    editorAtomUnderlinesDefault: true,
    editorFocusModeDefault: false,
    editorFocusModeTotalMs: 0,
    editorAuthenticWriterDefault: false,
    editorShowMarginalia: true,
    studyDefaultDirection: 'term',
    studyShuffleDefault: false,
    communityEnabled: false,
    pinnedCommunityRecipientIds: [],
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-02T00:00:00.000Z',
  })
  oldDb.close()
}

async function seedVersion15SharedSnapshot() {
  const oldDb = new Dexie('loci-notes')
  oldDb.version(15).stores({
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
    sharedNoteSnapshots: 'id, shareId, localNoteId, remoteShareId, ownerAccountId, updatedAt',
    collaborationSessions: 'id, localNoteId, shareId, ownerAccountId, status, updatedAt',
    collaborationParticipants: 'id, sessionId, accountId, role, lastSeenAt',
    collaborationEvents: 'id, sessionId, clientId, opId, [clientId+opId], actorAccountId, kind, syncStatus, serverSequence, createdAt',
    communityActivities: 'id, recipientKind, recipientId, [recipientKind+recipientId], actorAccountId, kind, objectType, objectId, syncStatus, createdAt, updatedAt',
    communityWidgets: 'id, kind, recipientKind, recipientId, [recipientKind+recipientId], ownerAccountId, status, syncStatus, createdAt, updatedAt',
    communityReactions: 'id, activityId, actorAccountId, kind, syncStatus, createdAt',
    communityPresetReplies: 'id, activityId, actorAccountId, kind, syncStatus, createdAt',
    communitySyncQueue: 'id, entityType, entityId, operation, status, updatedAt',
    remoteContentItems: 'id, placement, campaignId, startsAt, endsAt, updatedAt',
  })
  await oldDb.open()
  await oldDb.table('sharedNoteExports').put({
    id: 'share_v15',
    localNoteId: 'note_v15',
    ownerAccountId: 'account_v15',
    recipientAccountIds: ['friend_v15'],
    permission: 'view',
    status: 'draft',
    snapshotId: 'shared_snapshot_v15',
    updatedAt: '2026-03-02T00:00:00.000Z',
  })
  await oldDb.table('sharedNoteSnapshots').put({
    id: 'shared_snapshot_v15',
    shareId: 'share_v15',
    localNoteId: 'note_v15',
    ownerAccountId: 'account_v15',
    title: 'Shared Version 15 Note',
    content: oldContent,
    contentHash: 'shared-v15',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-02T00:00:00.000Z',
  })
  oldDb.close()
}

describe('Dexie migrations', () => {
  it('upgrades version 1 notes, atoms, and projects to the current schema', async () => {
    await seedVersion1Workspace()
    await db.open()

    expect(db.verno).toBe(19)
    await expect(db.notes.get('note_old')).resolves.toMatchObject({
      id: 'note_old',
      templateId: 'blank',
      projectId: 'project_old',
    })
    await expect(db.noteMetas.get('note_old')).resolves.toMatchObject({
      id: 'note_old',
      title: 'Old Note',
      hasMedia: false,
    })
    await expect(db.noteBodies.get('note_old')).resolves.toMatchObject({
      noteId: 'note_old',
      templateData: { kind: 'blank', body: oldContent },
    })
    await expect(db.atoms.get('atom_old')).resolves.toMatchObject({
      id: 'atom_old',
      projectId: '__unassigned__',
      tags: [],
    })
    await expect(db.remoteContentItems.count()).resolves.toBe(0)
    await expect(db.surveyPromptStates.count()).resolves.toBe(0)
    await expect(db.flashcardReviewStates.count()).resolves.toBe(0)
  })

  it('preserves version 10 notes, media tables, settings, snapshots, and flashcard sets', async () => {
    await seedVersion10Workspace()
    await db.open()

    expect(db.verno).toBe(19)
    await expect(db.noteMetas.get('note_v10')).resolves.toMatchObject({
      id: 'note_v10',
      projectId: 'project_v10',
      hasMedia: false,
    })
    await expect(db.noteBodies.get('note_v10')).resolves.toMatchObject({
      noteId: 'note_v10',
      blocks: expect.any(Array),
    })
    await expect(db.flashcardSets.get('set_v10')).resolves.toMatchObject({
      id: 'set_v10',
      atomIds: ['atom_v10'],
    })
    await expect(db.noteSnapshots.get('snapshot_v10')).resolves.toMatchObject({
      noteId: 'note_v10',
      title: 'Version 10 Note',
    })
    await expect(db.userSettings.get('local')).resolves.toMatchObject({
      id: 'local',
      defaultAIProvider: 'openai',
    })
    await expect(db.remoteEntityMappings.count()).resolves.toBe(0)
    await expect(db.surveyPromptStates.count()).resolves.toBe(0)
    await expect(db.flashcardReviewStates.count()).resolves.toBe(0)
  })

  it('preserves version 15 shared note snapshots through current schema upgrades', async () => {
    await seedVersion15SharedSnapshot()
    await db.open()

    expect(db.verno).toBe(19)
    await expect(db.sharedNoteExports.get('share_v15')).resolves.toMatchObject({
      id: 'share_v15',
      snapshotId: 'shared_snapshot_v15',
    })
    await expect(db.sharedNoteSnapshots.get('shared_snapshot_v15')).resolves.toMatchObject({
      shareId: 'share_v15',
      title: 'Shared Version 15 Note',
      contentHash: 'shared-v15',
    })
    await expect(db.flashcardReviewStates.count()).resolves.toBe(0)
  })
})
