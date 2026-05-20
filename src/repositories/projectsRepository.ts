import { db } from '../db'
import type { Project } from '../db'

export const projectsRepository = {
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
}
