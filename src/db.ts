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
  createdAt: string
  updatedAt: string
}

export type Atom = {
  id: string
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
  noteSnapshots!: Dexie.Table<NoteSnapshot, string>
  userProfiles!: Dexie.Table<UserProfile, string>
  userSettings!: Dexie.Table<UserSettings, string>

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

export async function ensureSeedData() {
  const noteCount = await db.notes.count()
  if (noteCount > 0) return

  await db.transaction('rw', db.projects, db.atoms, db.notes, db.noteSnapshots, async () => {
    await db.projects.bulkPut(initialProjects)
    await db.atoms.bulkPut(initialAtoms)
    await db.notes.bulkPut(initialNotes)
  })
}
