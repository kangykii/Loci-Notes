import { workspaceDomain } from '../domain/workspaceDomain'
import { atomsRepository } from '../repositories/atomsRepository'
import type { FlashcardSet, Note } from '../db'

export const atomsStore = {
  ...atomsRepository,

  deleteManyAndUnlink: (atomIds: string[], touchedNotes: Note[], updatedSets: FlashcardSet[]) =>
    workspaceDomain.deleteAtomsAndUnlink({ atomIds, touchedNotes, updatedSets }),
}
