import type { Table } from 'dexie'

import {
  deleteNoteFromRust,
  getNoteBodyFromRust,
  listNoteMetasFromRust,
  listNotesFromRust,
  repairSplitNoteStorageFromRust,
  saveNotesBatchToRust,
  shouldUseRustNotes,
} from '../tauri/notesClient'
import { db, noteBodyStore, noteFromMetaAndBody, noteToBody, noteToMediaAssets, noteToMeta } from '../db'
import type { Note, NoteBody, NoteMeta } from '../db'

const noteWriteTables = [db.notes, db.noteMetas, db.noteBodies, db.mediaAssets] as unknown as Table<unknown, string>[]
const noteDeleteTables = [db.notes, db.noteMetas, db.noteBodies, db.mediaAssets, db.noteSnapshots] as unknown as Table<unknown, string>[]
const notesTable = db.notes as unknown as {
  put(item: Note): Promise<unknown>
  bulkPut(items: Note[]): Promise<unknown>
}

export type LocalNoteStorageRepairResult = {
  notesRebuilt: number
  metasRebuilt: number
  bodiesRebuilt: number
  malformedBodies: number
  errors: string[]
}

export async function repairSplitNoteStorage(): Promise<LocalNoteStorageRepairResult> {
  if (shouldUseRustNotes()) {
    return repairSplitNoteStorageFromRust()
  }

  const errors: string[] = []
  const noteBodyPrimaryKey = db.noteBodies.schema.primKey.keyPath
  if (noteBodyPrimaryKey !== 'noteId') {
    errors.push(`noteBodies primary key is ${String(noteBodyPrimaryKey)}, expected noteId.`)
  }

  const [notes, metas, bodies] = await Promise.all([
    db.notes.toArray(),
    db.noteMetas.toArray(),
    db.noteBodies.toArray(),
  ])
  const noteById = new Map(notes.map((note) => [note.id, note]))
  const metaById = new Map(metas.map((meta) => [meta.id, meta]))
  const bodyById = new Map(bodies.map((body) => [body.noteId, body]))
  const notesToPut: Note[] = []
  const metasToPut: NoteMeta[] = []
  const bodiesToPut: NoteBody[] = []
  const malformedBodies = bodies.filter((body) => !body.noteId).length

  for (const note of notes) {
    if (!metaById.has(note.id)) metasToPut.push(noteToMeta(note))
    if (!bodyById.has(note.id)) bodiesToPut.push(noteToBody(note))
  }

  for (const meta of metas) {
    if (noteById.has(meta.id)) continue
    const body = bodyById.get(meta.id)
    if (body) notesToPut.push(noteFromMetaAndBody(meta, body))
  }

  if (!notesToPut.length && !metasToPut.length && !bodiesToPut.length) {
    return {
      notesRebuilt: 0,
      metasRebuilt: 0,
      bodiesRebuilt: 0,
      malformedBodies,
      errors,
    }
  }

  await db.transaction('rw', noteWriteTables, async () => {
    if (notesToPut.length) await notesTable.bulkPut(notesToPut)
    if (metasToPut.length) await db.noteMetas.bulkPut(metasToPut)
    if (bodiesToPut.length) await noteBodyStore.bulkPutNoteBodies(notes.filter((note) => bodiesToPut.some((body) => body.noteId === note.id)))
    for (const note of [...notesToPut, ...notes]) {
      if (!notesToPut.some((repairedNote) => repairedNote.id === note.id) && !bodiesToPut.some((body) => body.noteId === note.id)) continue
      await db.mediaAssets.where('noteId').equals(note.id).delete()
      const assets = noteToMediaAssets(note)
      if (assets.length) await db.mediaAssets.bulkPut(assets)
    }
  })

  return {
    notesRebuilt: notesToPut.length,
    metasRebuilt: metasToPut.length,
    bodiesRebuilt: bodiesToPut.length,
    malformedBodies,
    errors,
  }
}

export const notesRepository = {
  async listByUpdated() {
    if (shouldUseRustNotes()) {
      return listNotesFromRust()
    }

    await repairSplitNoteStorage()
    const [notes, metas] = await Promise.all([
      db.notes.orderBy('updatedAt').reverse().toArray(),
      db.noteMetas.orderBy('updatedAt').reverse().toArray(),
    ])
    const noteById = new Map(notes.map((note) => [note.id, note]))
    const missingMetas = metas.filter((meta) => !noteById.has(meta.id))
    if (!missingMetas.length) return notes

    const bodies = await noteBodyStore.bulkGetNoteBodies(missingMetas.map((meta) => meta.id))
    const hydrated = missingMetas.flatMap((meta, index) => {
      const body = bodies[index]
      if (!body) return []
      return [noteFromMetaAndBody(meta, body)]
    })

    return [...notes, ...hydrated].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  listMetasByUpdated: () => {
    if (shouldUseRustNotes()) return listNoteMetasFromRust()
    return db.noteMetas.orderBy('updatedAt').reverse().toArray()
  },

  getBody: (noteId: string) => {
    if (shouldUseRustNotes()) return getNoteBodyFromRust(noteId)
    return noteBodyStore.getNoteBody(noteId)
  },

  save: async (note: Note) => {
    if (shouldUseRustNotes()) {
      await saveNotesBatchToRust([note])
      return
    }
    await db.transaction('rw', noteWriteTables, async () => {
      await notesTable.put(note)
      await db.noteMetas.put(noteToMeta(note))
      await noteBodyStore.putNoteBody(note)
      await db.mediaAssets.where('noteId').equals(note.id).delete()
      const assets = noteToMediaAssets(note)
      if (assets.length) await db.mediaAssets.bulkPut(assets)
    })
  },

  saveMany: async (notes: Note[]) => {
    if (shouldUseRustNotes()) {
      await saveNotesBatchToRust(notes)
      return
    }
    await db.transaction('rw', noteWriteTables, async () => {
      await notesTable.bulkPut(notes)
      await db.noteMetas.bulkPut(notes.map(noteToMeta))
      await noteBodyStore.bulkPutNoteBodies(notes)
      await Promise.all(notes.map((note) => db.mediaAssets.where('noteId').equals(note.id).delete()))
      const assets = notes.flatMap(noteToMediaAssets)
      if (assets.length) await db.mediaAssets.bulkPut(assets)
    })
  },

  deleteWithSnapshots: async (noteId: string) => {
    if (shouldUseRustNotes()) {
      await deleteNoteFromRust(noteId)
      return
    }
    await db.transaction('rw', noteDeleteTables, async () => {
      await db.notes.delete(noteId)
      await db.noteMetas.delete(noteId)
      await noteBodyStore.deleteNoteBody(noteId)
      await db.mediaAssets.where('noteId').equals(noteId).delete()
      await db.noteSnapshots.where('noteId').equals(noteId).delete()
    })
  },

  repairLocalStorage: repairSplitNoteStorage,
}
