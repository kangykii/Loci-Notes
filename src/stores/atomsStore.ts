import { db } from '../db'
import type { Atom, FlashcardSet, Note } from '../db'

export const atomsStore = {
  listByUpdated: () => db.atoms.orderBy('updatedAt').reverse().toArray(),

  save: (atom: Atom) => db.atoms.put(atom),

  saveMany: (atoms: Atom[]) => db.atoms.bulkPut(atoms),

  deleteManyAndUnlink: (atomIds: string[], touchedNotes: Note[], updatedSets: FlashcardSet[]) =>
    db.transaction('rw', db.atoms, db.notes, db.flashcardSets, async () => {
      await db.atoms.bulkDelete(atomIds)
      if (touchedNotes.length) await db.notes.bulkPut(touchedNotes)
      if (updatedSets.length) await db.flashcardSets.bulkPut(updatedSets)
    }),
}
