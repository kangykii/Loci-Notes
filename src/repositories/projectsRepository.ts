import { db } from '../db'
import type { Project } from '../db'
import { listProjectsFromRust, saveProjectsBatchToRust, shouldUseRustStorage } from '../tauri/workspaceClient'

export const projectsRepository = {
  listByName: () => {
    if (shouldUseRustStorage()) return listProjectsFromRust()
    return db.projects.orderBy('name').toArray()
  },

  save: async (project: Project) => {
    if (shouldUseRustStorage()) {
      await saveProjectsBatchToRust([project])
      return
    }
    await db.projects.put(project)
  },

  saveMany: async (projects: Project[]) => {
    if (shouldUseRustStorage()) {
      await saveProjectsBatchToRust(projects)
      return
    }
    await db.projects.bulkPut(projects)
  },

  updateDescription: async (projectId: string, description: string) => {
    if (shouldUseRustStorage()) {
      const projects = await listProjectsFromRust()
      const project = projects.find((item) => item.id === projectId)
      if (!project) return
      await saveProjectsBatchToRust([{ ...project, description }])
      return
    }
    await db.projects.update(projectId, { description })
  },

  updateColor: async (projectId: string, color: string) => {
    if (shouldUseRustStorage()) {
      const projects = await listProjectsFromRust()
      const project = projects.find((item) => item.id === projectId)
      if (!project) return
      await saveProjectsBatchToRust([{ ...project, color }])
      return
    }
    await db.projects.update(projectId, { color })
  },

  updatePinned: async (projectId: string, pinnedAt: string | undefined) => {
    if (shouldUseRustStorage()) {
      const projects = await listProjectsFromRust()
      const project = projects.find((item) => item.id === projectId)
      if (!project) return
      await saveProjectsBatchToRust([{ ...project, pinnedAt }])
      return
    }
    await db.projects.update(projectId, { pinnedAt })
  },

  rename: async (projectId: string, name: string) => {
    if (shouldUseRustStorage()) {
      const projects = await listProjectsFromRust()
      const project = projects.find((item) => item.id === projectId)
      if (!project) return
      await saveProjectsBatchToRust([{ ...project, name }])
      return
    }
    await db.projects.update(projectId, { name })
  },
}
