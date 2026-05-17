import { ensureSeedData } from '../db'
import { atomsStore } from './atomsStore'
import { flashcardSetsStore } from './flashcardSetsStore'
import { notesStore } from './notesStore'
import { profileStore } from './profileStore'
import { projectsStore } from './projectsStore'
import { settingsStore } from './settingsStore'

export type LocalAppDataLoadIssue = {
  area: string
  message: string
}

function loadIssue(area: string, error: unknown): LocalAppDataLoadIssue {
  return {
    area,
    message: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  }
}

async function loadPart<T>(area: string, fallback: T, loader: () => Promise<T>, issues: LocalAppDataLoadIssue[]) {
  try {
    return await loader()
  } catch (error) {
    console.error(`Could not load ${area}`, error)
    issues.push(loadIssue(area, error))
    return fallback
  }
}

export async function loadLocalAppData() {
  const loadIssues: LocalAppDataLoadIssue[] = []
  try {
    await ensureSeedData()
  } catch (error) {
    console.error('Could not prepare seed data', error)
    loadIssues.push(loadIssue('starter workspace', error))
  }

  const [notes, atoms, flashcardSets, projects, profile, settings] = await Promise.all([
    loadPart('notes', [], notesStore.listByUpdated, loadIssues),
    loadPart('atoms', [], atomsStore.listByUpdated, loadIssues),
    loadPart('flashcard sets', [], flashcardSetsStore.listByUpdated, loadIssues),
    loadPart('projects', [], projectsStore.listByName, loadIssues),
    loadPart('profile', undefined, profileStore.getLocalWorkspaceProfile, loadIssues),
    loadPart('settings', undefined, settingsStore.getLocal, loadIssues),
  ])

  return {
    notes,
    atoms,
    flashcardSets,
    projects,
    profile,
    settings,
    loadIssues,
  }
}
