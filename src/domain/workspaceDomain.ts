import type { Table } from 'dexie'
import { db, noteBodyStore, noteToMediaAssets, noteToMeta } from '../db'
import type { FlashcardSet, Note } from '../db'

const atomUnlinkTables = [db.atoms, db.notes, db.noteMetas, db.noteBodies, db.mediaAssets, db.flashcardSets, db.flashcardReviewStates] as unknown as Table<unknown, string>[]
const projectDeleteTables = [db.projects, db.notes, db.noteMetas, db.noteBodies, db.mediaAssets, db.atoms, db.noteSnapshots, db.flashcardSets, db.flashcardReviewStates] as unknown as Table<unknown, string>[]
const notesTable = db.notes as unknown as { bulkPut(items: Note[]): Promise<unknown> }

export type DeleteAtomsAndUnlinkInput = {
  atomIds: string[]
  touchedNotes: Note[]
  updatedSets: FlashcardSet[]
}

export type DeleteProjectDataInput = {
  projectId: string
  projectNotes: Note[]
  snapshotIdsToDelete: string[]
  atomIdsToDelete: string[]
  updatedSets: FlashcardSet[]
}

export const workspaceDomain = {
  deleteAtomsAndUnlink({ atomIds, touchedNotes, updatedSets }: DeleteAtomsAndUnlinkInput) {
    return db.transaction('rw', atomUnlinkTables, async () => {
      await db.atoms.bulkDelete(atomIds)
      if (touchedNotes.length) {
        await notesTable.bulkPut(touchedNotes)
        await db.noteMetas.bulkPut(touchedNotes.map(noteToMeta))
        await noteBodyStore.bulkPutNoteBodies(touchedNotes)
        await Promise.all(touchedNotes.map((note) => db.mediaAssets.where('noteId').equals(note.id).delete()))
        const assets = touchedNotes.flatMap(noteToMediaAssets)
        if (assets.length) await db.mediaAssets.bulkPut(assets)
      }
      if (updatedSets.length) await db.flashcardSets.bulkPut(updatedSets)
      if (atomIds.length) {
        await Promise.all(atomIds.map((atomId) => db.flashcardReviewStates.where('atomId').equals(atomId).delete()))
      }
    })
  },

  deleteProjectData({ projectId, projectNotes, snapshotIdsToDelete, atomIdsToDelete, updatedSets }: DeleteProjectDataInput) {
    return db.transaction('rw', projectDeleteTables, async () => {
      await db.projects.delete(projectId)
      const noteIds = projectNotes.map((note) => note.id)
      if (noteIds.length) {
        await db.notes.bulkDelete(noteIds)
        await db.noteMetas.bulkDelete(noteIds)
        await noteBodyStore.bulkDeleteNoteBodies(noteIds)
        await Promise.all(noteIds.map((noteId) => db.mediaAssets.where('noteId').equals(noteId).delete()))
      }
      if (snapshotIdsToDelete.length) await db.noteSnapshots.bulkDelete(snapshotIdsToDelete)
      if (atomIdsToDelete.length) await db.atoms.bulkDelete(atomIdsToDelete)
      if (updatedSets.length) await db.flashcardSets.bulkPut(updatedSets)
      if (atomIdsToDelete.length) {
        await Promise.all(atomIdsToDelete.map((atomId) => db.flashcardReviewStates.where('atomId').equals(atomId).delete()))
      }
    })
  },
}
