import type { JSONContent, Note } from '../db'
import { collectAtomIds, collectNotePreviewLines, collectText } from '../editor/blocks'
import { emptyDoc } from '../notes/templates'
import { sortByUpdated } from './constants'

export type NoteIndexes = {
  noteTextById: Map<string, string>
  notePreviewLinesById: Map<string, string[]>
  notesByProjectId: Map<string, Note[]>
  noteIdsByAtomId: Map<string, Set<string>>
  atomIdsByProjectId: Map<string, Set<string>>
  projectIdsByAtomId: Map<string, Set<string>>
}

export type NoteIndexCacheEntry = {
  content: JSONContent
  text: string
  previewLines: string[]
  atomIds: string[]
}

function indexEntryForNote(note: Note, cache: Map<string, NoteIndexCacheEntry>, maxPreviewLines: number): NoteIndexCacheEntry {
  const cached = cache.get(note.id)
  if (cached?.content === note.content) return cached
  const entry: NoteIndexCacheEntry = {
    content: note.content,
    text: collectText(note.content ?? emptyDoc),
    previewLines: collectNotePreviewLines(note.content, maxPreviewLines),
    atomIds: collectAtomIds(note.content),
  }
  cache.set(note.id, entry)
  return entry
}

function removeFromSetMap(map: Map<string, Set<string>>, key: string, value: string) {
  const set = map.get(key)
  if (!set) return
  set.delete(value)
  if (!set.size) map.delete(key)
}

function removeNoteFromIndexMaps(indexes: NoteIndexes, note: Note, entry: NoteIndexCacheEntry) {
  const projectNotes = indexes.notesByProjectId.get(note.projectId)
  if (projectNotes) {
    const next = projectNotes.filter((item) => item.id !== note.id)
    if (next.length) indexes.notesByProjectId.set(note.projectId, next)
    else indexes.notesByProjectId.delete(note.projectId)
  }

  entry.atomIds.forEach((atomId) => {
    removeFromSetMap(indexes.noteIdsByAtomId, atomId, note.id)
    removeFromSetMap(indexes.atomIdsByProjectId, note.projectId, atomId)
    removeFromSetMap(indexes.projectIdsByAtomId, atomId, note.projectId)
  })

  indexes.noteTextById.delete(note.id)
  indexes.notePreviewLinesById.delete(note.id)
}

function addNoteToIndexMaps(indexes: NoteIndexes, note: Note, entry: NoteIndexCacheEntry) {
  indexes.noteTextById.set(note.id, entry.text)
  indexes.notePreviewLinesById.set(note.id, entry.previewLines)

  const projectNotes = indexes.notesByProjectId.get(note.projectId) ?? []
  const nextProjectNotes = projectNotes.filter((item) => item.id !== note.id)
  nextProjectNotes.push(note)
  nextProjectNotes.sort((a, b) => {
    const byUpdated = sortByUpdated(a, b)
    if (byUpdated !== 0) return byUpdated
    return a.id.localeCompare(b.id)
  })
  indexes.notesByProjectId.set(note.projectId, nextProjectNotes)

  entry.atomIds.forEach((atomId) => {
    const atomNoteIds = indexes.noteIdsByAtomId.get(atomId) ?? new Set<string>()
    atomNoteIds.add(note.id)
    indexes.noteIdsByAtomId.set(atomId, atomNoteIds)

    const projectAtomIds = indexes.atomIdsByProjectId.get(note.projectId) ?? new Set<string>()
    projectAtomIds.add(atomId)
    indexes.atomIdsByProjectId.set(note.projectId, projectAtomIds)

    const atomProjectIds = indexes.projectIdsByAtomId.get(atomId) ?? new Set<string>()
    atomProjectIds.add(note.projectId)
    indexes.projectIdsByAtomId.set(atomId, atomProjectIds)
  })
}

export function createEmptyNoteIndexes(): NoteIndexes {
  return {
    noteTextById: new Map(),
    notePreviewLinesById: new Map(),
    notesByProjectId: new Map(),
    noteIdsByAtomId: new Map(),
    atomIdsByProjectId: new Map(),
    projectIdsByAtomId: new Map(),
  }
}

export function createNoteIndexes(
  notes: Note[],
  cache = new Map<string, NoteIndexCacheEntry>(),
  maxPreviewLines = 6,
): NoteIndexes {
  const indexes = createEmptyNoteIndexes()
  notes.forEach((note) => {
    const entry = indexEntryForNote(note, cache, maxPreviewLines)
    addNoteToIndexMaps(indexes, note, entry)
  })
  const liveNoteIds = new Set(notes.map((note) => note.id))
  cache.forEach((_, noteId) => {
    if (!liveNoteIds.has(noteId)) cache.delete(noteId)
  })
  return indexes
}

export function patchNoteIndexes(
  indexes: NoteIndexes,
  previous: Note | null,
  next: Note,
  cache: Map<string, NoteIndexCacheEntry>,
  maxPreviewLines = 6,
) {
  if (previous) {
    const previousEntry = cache.get(previous.id)
    if (previousEntry) removeNoteFromIndexMaps(indexes, previous, previousEntry)
  }
  const entry = indexEntryForNote(next, cache, maxPreviewLines)
  addNoteToIndexMaps(indexes, next, entry)
}

export function removeNoteFromIndexes(
  indexes: NoteIndexes,
  note: Note,
  cache: Map<string, NoteIndexCacheEntry>,
) {
  const entry = cache.get(note.id)
  if (entry) removeNoteFromIndexMaps(indexes, note, entry)
  cache.delete(note.id)
}
