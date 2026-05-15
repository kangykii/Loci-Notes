import { ensureSeedData } from '../db'
import { atomsStore } from './atomsStore'
import { flashcardSetsStore } from './flashcardSetsStore'
import { notesStore } from './notesStore'
import { profileStore } from './profileStore'
import { projectsStore } from './projectsStore'
import { settingsStore } from './settingsStore'

export async function loadLocalAppData() {
  await ensureSeedData()

  const [notes, atoms, flashcardSets, projects, profile, settings] = await Promise.all([
    notesStore.listByUpdated(),
    atomsStore.listByUpdated(),
    flashcardSetsStore.listByUpdated(),
    projectsStore.listByName(),
    profileStore.getLocalWorkspaceProfile(),
    settingsStore.getLocal(),
  ])

  return {
    notes,
    atoms,
    flashcardSets,
    projects,
    profile,
    settings,
  }
}
