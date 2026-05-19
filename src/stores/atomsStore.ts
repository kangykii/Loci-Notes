import { db, noteBodyStore, noteToMediaAssets, noteToMeta } from '../db'
import type { Atom, FlashcardSet, Note } from '../db'
import type { Table } from 'dexie'

export const atomsStore = {
  listByUpdated: () => db.atoms.orderBy('updatedAt').reverse().toArray(),

  save: (atom: Atom) => db.atoms.put(atom),

  saveMany: (atoms: Atom[]) => db.atoms.bulkPut(atoms),

  deleteManyAndUnlink: (atomIds: string[], touchedNotes: Note[], updatedSets: FlashcardSet[]) => {
    const tables = [db.atoms, db.notes, db.noteMetas, db.noteBodies, db.mediaAssets, db.flashcardSets, db.flashcardReviewStates] as unknown as Table<unknown, string>[]
    const notesTable = db.notes as unknown as { bulkPut(items: Note[]): Promise<unknown> }
    return db.transaction('rw', tables, async () => {
      await db.atoms.bulkDelete(atomIds)
      await Promise.all(atomIds.map((atomId) => db.flashcardReviewStates.where('atomId').equals(atomId).delete()))
      if (touchedNotes.length) {
        await notesTable.bulkPut(touchedNotes)
        await db.noteMetas.bulkPut(touchedNotes.map(noteToMeta))
        await noteBodyStore.bulkPutNoteBodies(touchedNotes)
        await Promise.all(touchedNotes.map((note) => db.mediaAssets.where('noteId').equals(note.id).delete()))
        const assets = touchedNotes.flatMap(noteToMediaAssets)
        if (assets.length) await db.mediaAssets.bulkPut(assets)
      }
      if (updatedSets.length) await db.flashcardSets.bulkPut(updatedSets)
    })
  },
}
