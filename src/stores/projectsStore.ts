import { db, noteBodyStore } from '../db'
import type { FlashcardSet, Note, Project } from '../db'
import type { Table } from 'dexie'

export const projectsStore = {
  listByName: () => db.projects.orderBy('name').toArray(),

  save: (project: Project) => db.projects.put(project),

  saveMany: (projects: Project[]) => db.projects.bulkPut(projects),

  updateDescription: (projectId: string, description: string) =>
    db.projects.update(projectId, { description }),

  updateColor: (projectId: string, color: string) =>
    db.projects.update(projectId, { color }),

  updatePinned: (projectId: string, pinnedAt: string | undefined) =>
    db.projects.update(projectId, { pinnedAt }),

  rename: (projectId: string, name: string) =>
    db.projects.update(projectId, { name }),

  deleteProjectData: (
    projectId: string,
    projectNotes: Note[],
    snapshotIdsToDelete: string[],
    atomIdsToDelete: string[],
    updatedSets: FlashcardSet[],
  ) => {
    const tables = [db.projects, db.notes, db.noteMetas, db.noteBodies, db.mediaAssets, db.atoms, db.noteSnapshots, db.flashcardSets] as unknown as Table<unknown, string>[]
    return db.transaction('rw', tables, async () => {
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
    })
  },
}
