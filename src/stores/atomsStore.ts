import { db, noteToBody, noteToMediaAssets, noteToMeta } from '../db'
import type { Atom, FlashcardSet, Note } from '../db'

export const atomsStore = {
  listByUpdated: () => db.atoms.orderBy('updatedAt').reverse().toArray(),

  save: (atom: Atom) => db.atoms.put(atom),

  saveMany: (atoms: Atom[]) => db.atoms.bulkPut(atoms),

  deleteManyAndUnlink: (atomIds: string[], touchedNotes: Note[], updatedSets: FlashcardSet[]) =>
    db.transaction('rw', [db.atoms, db.notes, db.noteMetas, db.noteBodies, db.mediaAssets, db.flashcardSets], async () => {
      await db.atoms.bulkDelete(atomIds)
      if (touchedNotes.length) {
        await db.notes.bulkPut(touchedNotes)
        await db.noteMetas.bulkPut(touchedNotes.map(noteToMeta))
        await db.noteBodies.bulkPut(touchedNotes.map(noteToBody))
        await Promise.all(touchedNotes.map((note) => db.mediaAssets.where('noteId').equals(note.id).delete()))
        const assets = touchedNotes.flatMap(noteToMediaAssets)
        if (assets.length) await db.mediaAssets.bulkPut(assets)
      }
      if (updatedSets.length) await db.flashcardSets.bulkPut(updatedSets)
    }),
}
