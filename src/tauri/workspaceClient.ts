import { invoke } from '@tauri-apps/api/core'

import type { Atom, FlashcardReviewState, FlashcardSet, Project, UserProfile, UserSettings } from '../db'
import { initialAtoms, initialNotes, initialProjects } from '../db'
import { fetchDbStatus } from './dbClient'
import { isTauriDesktop } from './env'
import { saveNotesBatchToRust } from './notesClient'

type RustUserSettings = Omit<UserSettings, 'defaultAIProvider'> & {
  defaultAIProvider?: UserSettings['defaultAIProvider']
  defaultAiProvider?: UserSettings['defaultAIProvider']
}

function fromRustUserSettings(settings: RustUserSettings): UserSettings {
  const { defaultAIProvider, defaultAiProvider, ...rest } = settings
  return {
    ...rest,
    defaultAIProvider: defaultAIProvider ?? defaultAiProvider ?? 'openai',
  }
}

function toRustUserSettings(settings: UserSettings): RustUserSettings {
  const { defaultAIProvider, ...rest } = settings
  return {
    ...rest,
    defaultAiProvider: defaultAIProvider,
  }
}

type RustFlashcardSet = {
  id: string
  name: string
  description?: string
  atomIds: string[]
  createdAt: string
  updatedAt: string
  lastStudiedAt?: string
  payload?: Record<string, unknown>
}

function toRustFlashcardSet(set: FlashcardSet): RustFlashcardSet {
  const {
    id,
    name,
    description,
    atomIds,
    createdAt,
    updatedAt,
    lastStudiedAt,
    ...payload
  } = set
  const hasPayload = Object.keys(payload).length > 0
  return {
    id,
    name,
    description,
    atomIds,
    createdAt,
    updatedAt,
    lastStudiedAt,
    payload: hasPayload ? payload : undefined,
  }
}

function fromRustFlashcardSet(set: RustFlashcardSet): FlashcardSet {
  return {
    id: set.id,
    name: set.name,
    description: set.description,
    atomIds: set.atomIds,
    createdAt: set.createdAt,
    updatedAt: set.updatedAt,
    lastStudiedAt: set.lastStudiedAt,
    ...(set.payload ?? {}),
  } as FlashcardSet
}

export async function listProjectsFromRust(): Promise<Project[]> {
  return invoke<Project[]>('list_projects')
}

export async function saveProjectsBatchToRust(projects: Project[]): Promise<void> {
  if (!projects.length) return
  await invoke('save_projects_batch', { projects })
}

export async function listAtomsFromRust(): Promise<Atom[]> {
  return invoke<Atom[]>('list_atoms')
}

export async function saveAtomsBatchToRust(atoms: Atom[]): Promise<void> {
  if (!atoms.length) return
  await invoke('save_atoms_batch', { atoms })
}

export async function listFlashcardSetsFromRust(): Promise<FlashcardSet[]> {
  const sets = await invoke<RustFlashcardSet[]>('list_flashcard_sets')
  return sets.map(fromRustFlashcardSet)
}

export async function saveFlashcardSetsBatchToRust(sets: FlashcardSet[]): Promise<void> {
  if (!sets.length) return
  await invoke('save_flashcard_sets_batch', { sets: sets.map(toRustFlashcardSet) })
}

export async function listFlashcardReviewStatesFromRust(): Promise<FlashcardReviewState[]> {
  return invoke<FlashcardReviewState[]>('list_flashcard_review_states')
}

export async function saveFlashcardReviewStatesBatchToRust(states: FlashcardReviewState[]): Promise<void> {
  if (!states.length) return
  await invoke('save_flashcard_review_states_batch', { states })
}

export async function getUserSettingsFromRust(): Promise<UserSettings | undefined> {
  const settings = await invoke<RustUserSettings | null>('get_user_settings')
  return settings ? fromRustUserSettings(settings) : undefined
}

export async function saveUserSettingsToRust(settings: UserSettings): Promise<void> {
  await invoke('save_user_settings', { settings: toRustUserSettings(settings) })
}

export async function getUserProfileFromRust(): Promise<UserProfile | undefined> {
  return (await invoke<UserProfile | null>('get_user_profile')) ?? undefined
}

export async function saveUserProfileToRust(profile: UserProfile): Promise<void> {
  await invoke('save_user_profile', { profile })
}

export async function seedRustWorkspaceIfEmpty() {
  if (!isTauriDesktop()) return
  const status = await fetchDbStatus()
  if (status.noteCount > 0) return

  await saveProjectsBatchToRust(initialProjects)
  await saveAtomsBatchToRust(initialAtoms)
  await saveNotesBatchToRust(initialNotes)
}

export function shouldUseRustStorage() {
  return isTauriDesktop()
}
