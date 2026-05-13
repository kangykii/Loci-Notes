import { db } from '../db'
import type { FlashcardSet } from '../db'

export const flashcardSetsStore = {
  listByUpdated: () => db.flashcardSets.orderBy('updatedAt').reverse().toArray(),

  save: (set: FlashcardSet) => db.flashcardSets.put(set),

  saveMany: (sets: FlashcardSet[]) => db.flashcardSets.bulkPut(sets),

  delete: (setId: string) => db.flashcardSets.delete(setId),
}
