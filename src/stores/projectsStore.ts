import { db } from '../db'
import type { FlashcardSet, Note, Project } from '../db'

export const projectsStore = {
  listByName: () => db.projects.orderBy('name').toArray(),

  save: (project: Project) => db.projects.put(project),

  saveMany: (projects: Project[]) => db.projects.bulkPut(projects),

  updateDescription: (projectId: string, description: string) =>
    db.projects.update(projectId, { description }),

  rename: (projectId: string, name: string) =>
    db.projects.update(projectId, { name }),

  deleteProjectData: (
    projectId: string,
    projectNotes: Note[],
    snapshotIdsToDelete: string[],
    atomIdsToDelete: string[],
    updatedSets: FlashcardSet[],
  ) =>
    db.transaction('rw', [db.projects, db.notes, db.atoms, db.noteSnapshots, db.flashcardSets], async () => {
      await db.projects.delete(projectId)
      if (projectNotes.length) await db.notes.bulkDelete(projectNotes.map((note) => note.id))
      if (snapshotIdsToDelete.length) await db.noteSnapshots.bulkDelete(snapshotIdsToDelete)
      if (atomIdsToDelete.length) await db.atoms.bulkDelete(atomIdsToDelete)
      if (updatedSets.length) await db.flashcardSets.bulkPut(updatedSets)
    }),
}
