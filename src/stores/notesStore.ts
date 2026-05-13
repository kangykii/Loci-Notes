import { db } from '../db'
import type { Note } from '../db'

export const notesStore = {
  listByUpdated: () => db.notes.orderBy('updatedAt').reverse().toArray(),

  save: (note: Note) => db.notes.put(note),

  saveMany: (notes: Note[]) => db.notes.bulkPut(notes),

  deleteWithSnapshots: (noteId: string) =>
    db.transaction('rw', db.notes, db.noteSnapshots, async () => {
      await db.notes.delete(noteId)
      await db.noteSnapshots.where('noteId').equals(noteId).delete()
    }),
}
