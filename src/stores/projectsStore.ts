import { workspaceDomain } from '../domain/workspaceDomain'
import { projectsRepository } from '../repositories/projectsRepository'
import type { FlashcardSet, Note } from '../db'

export const projectsStore = {
  ...projectsRepository,

  deleteProjectData(
    projectId: string,
    projectNotes: Note[],
    snapshotIdsToDelete: string[],
    atomIdsToDelete: string[],
    updatedSets: FlashcardSet[],
  ) {
    return workspaceDomain.deleteProjectData({ projectId, projectNotes, snapshotIdsToDelete, atomIdsToDelete, updatedSets })
  },
}
