import type { Note, NoteMeta } from '../db'
import { noteToMeta } from '../db'
import { sortByUpdated } from './constants'
import {
  createEmptyNoteIndexes,
  createNoteIndexes,
  patchNoteIndexes,
  removeNoteFromIndexes,
  type NoteIndexCacheEntry,
  type NoteIndexes,
} from './noteIndexes'

type WorkspaceListener = () => void

type WorkspaceSnapshot = {
  notes: Note[]
  noteMetas: NoteMeta[]
  indexes: NoteIndexes
  version: number
  metaVersion: number
}

class WorkspaceStore {
  private notes: Note[] = []
  private noteMetas: NoteMeta[] = []
  private indexes: NoteIndexes = createEmptyNoteIndexes()
  private indexCache = new Map<string, NoteIndexCacheEntry>()
  private version = 0
  private metaVersion = 0
  private listeners = new Set<WorkspaceListener>()

  readonly notesRef = { current: [] as Note[] }

  subscribe = (listener: WorkspaceListener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): WorkspaceSnapshot => ({
    notes: this.notes,
    noteMetas: this.noteMetas,
    indexes: this.indexes,
    version: this.version,
    metaVersion: this.metaVersion,
  })

  getNotes = () => this.notes
  getNoteMetas = () => this.noteMetas
  getIndexes = () => this.indexes

  private emit(notifyMeta = true) {
    this.notesRef.current = this.notes
    this.version += 1
    if (notifyMeta) this.metaVersion += 1
    this.listeners.forEach((listener) => listener())
  }

  private syncMetasFromNotes() {
    this.noteMetas = this.notes.map(noteToMeta).sort(sortByUpdated)
  }

  setNotes(notes: Note[], options: { notifyMeta?: boolean; rebuildIndexes?: boolean } = {}) {
    const { notifyMeta = true, rebuildIndexes = true } = options
    this.notes = [...notes].sort(sortByUpdated)
    this.syncMetasFromNotes()
    if (rebuildIndexes) {
      this.indexes = createNoteIndexes(this.notes, this.indexCache)
    }
    this.emit(notifyMeta)
  }

  setNoteMetas(metas: NoteMeta[]) {
    this.noteMetas = [...metas].sort(sortByUpdated)
    this.metaVersion += 1
    this.listeners.forEach((listener) => listener())
  }

  replaceNotesFromRef() {
    this.notes = [...this.notesRef.current].sort(sortByUpdated)
    this.syncMetasFromNotes()
    this.indexes = createNoteIndexes(this.notes, this.indexCache)
    this.emit(true)
  }

  patchNote(next: Note, previous?: Note | null, options: { notifyMeta?: boolean; notifyNotes?: boolean } = {}) {
    const { notifyMeta = true, notifyNotes = true } = options
    const index = this.notes.findIndex((note) => note.id === next.id)
    const oldNote = previous ?? (index >= 0 ? this.notes[index] : null)
    if (index >= 0) this.notes[index] = next
    else this.notes.push(next)
    if (!options.notifyNotes && notifyMeta) {
      // meta-only sidebar refresh
      const meta = noteToMeta(next)
      const metaIndex = this.noteMetas.findIndex((item) => item.id === next.id)
      if (metaIndex >= 0) this.noteMetas[metaIndex] = meta
      else this.noteMetas.push(meta)
      this.noteMetas.sort(sortByUpdated)
    } else if (notifyMeta) {
      this.syncMetasFromNotes()
    }
    patchNoteIndexes(this.indexes, oldNote, next, this.indexCache)
    this.notesRef.current = this.notes
    if (notifyNotes) this.version += 1
    if (notifyMeta) this.metaVersion += 1
    if (notifyNotes || notifyMeta) this.listeners.forEach((listener) => listener())
  }

  patchNotes(updated: Note[], options: { notifyMeta?: boolean } = {}) {
    const { notifyMeta = true } = options
    const byId = new Map(updated.map((note) => [note.id, note]))
    this.notes = this.notes.map((note) => byId.get(note.id) ?? note)
    updated.forEach((note) => {
      if (!this.notes.some((item) => item.id === note.id)) this.notes.push(note)
    })
    this.notes.sort(sortByUpdated)
    updated.forEach((note) => {
      const previous = this.notesRef.current.find((item) => item.id === note.id) ?? null
      patchNoteIndexes(this.indexes, previous, note, this.indexCache)
    })
    if (notifyMeta) this.syncMetasFromNotes()
    this.notesRef.current = this.notes
    this.version += 1
    if (notifyMeta) this.metaVersion += 1
    this.listeners.forEach((listener) => listener())
  }

  removeNote(noteId: string) {
    const note = this.notes.find((item) => item.id === noteId)
    if (!note) return
    this.notes = this.notes.filter((item) => item.id !== noteId)
    this.noteMetas = this.noteMetas.filter((item) => item.id !== noteId)
    removeNoteFromIndexes(this.indexes, note, this.indexCache)
    this.notesRef.current = this.notes
    this.version += 1
    this.metaVersion += 1
    this.listeners.forEach((listener) => listener())
  }

  removeNotes(noteIds: Set<string>) {
    const removed = this.notes.filter((note) => noteIds.has(note.id))
    if (!removed.length) return
    this.notes = this.notes.filter((note) => !noteIds.has(note.id))
    this.noteMetas = this.noteMetas.filter((meta) => !noteIds.has(meta.id))
    removed.forEach((note) => removeNoteFromIndexes(this.indexes, note, this.indexCache))
    this.notesRef.current = this.notes
    this.version += 1
    this.metaVersion += 1
    this.listeners.forEach((listener) => listener())
  }

  upsertNote(note: Note) {
    const existing = this.notes.find((item) => item.id === note.id)
    if (existing) this.patchNote(note, existing)
    else {
      this.notes = [note, ...this.notes].sort(sortByUpdated)
      this.syncMetasFromNotes()
      patchNoteIndexes(this.indexes, null, note, this.indexCache)
      this.notesRef.current = this.notes
      this.version += 1
      this.metaVersion += 1
      this.listeners.forEach((listener) => listener())
    }
  }
}

export const workspaceStore = new WorkspaceStore()

export type { NoteIndexes, NoteIndexCacheEntry }
