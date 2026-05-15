import { db, noteToBody, noteToMediaAssets, noteToMeta } from '../db'
import type { Note } from '../db'

export const notesStore = {
  listByUpdated: () => db.notes.orderBy('updatedAt').reverse().toArray(),

  listMetasByUpdated: () => db.noteMetas.orderBy('updatedAt').reverse().toArray(),

  getBody: (noteId: string) => db.noteBodies.get(noteId),

  save: (note: Note) =>
    db.transaction('rw', db.notes, db.noteMetas, db.noteBodies, db.mediaAssets, async () => {
      await db.notes.put(note)
      await db.noteMetas.put(noteToMeta(note))
      await db.noteBodies.put(noteToBody(note))
      await db.mediaAssets.where('noteId').equals(note.id).delete()
      const assets = noteToMediaAssets(note)
      if (assets.length) await db.mediaAssets.bulkPut(assets)
    }),

  saveMany: (notes: Note[]) =>
    db.transaction('rw', db.notes, db.noteMetas, db.noteBodies, db.mediaAssets, async () => {
      await db.notes.bulkPut(notes)
      await db.noteMetas.bulkPut(notes.map(noteToMeta))
      await db.noteBodies.bulkPut(notes.map(noteToBody))
      await Promise.all(notes.map((note) => db.mediaAssets.where('noteId').equals(note.id).delete()))
      const assets = notes.flatMap(noteToMediaAssets)
      if (assets.length) await db.mediaAssets.bulkPut(assets)
    }),

  deleteWithSnapshots: (noteId: string) =>
    db.transaction('rw', [db.notes, db.noteMetas, db.noteBodies, db.mediaAssets, db.noteSnapshots], async () => {
      await db.notes.delete(noteId)
      await db.noteMetas.delete(noteId)
      await db.noteBodies.delete(noteId)
      await db.mediaAssets.where('noteId').equals(noteId).delete()
      await db.noteSnapshots.where('noteId').equals(noteId).delete()
    }),
}
