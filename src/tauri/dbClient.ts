import { invoke } from '@tauri-apps/api/core'

export type DbStatus = {
  ok: boolean
  schemaVersion: number
  legacyImportDone: boolean
  noteCount: number
  dbPath: string
}

export type ImportLegacyResult = {
  importedNotes: number
  importedProjects: number
  importedAtoms: number
  importedJsonEntities: number
}

export type SaveNotesBatchResult = {
  savedIds: string[]
  updatedAt: string
}

export type SearchNotesResult = {
  noteIds: string[]
}

export type LocalNoteStorageRepairResult = {
  notesRebuilt: number
  metasRebuilt: number
  bodiesRebuilt: number
  malformedBodies: number
  errors: string[]
}

export async function fetchDbStatus(): Promise<DbStatus> {
  return invoke<DbStatus>('db_status')
}

export async function importLegacyDexie(payload: unknown): Promise<ImportLegacyResult> {
  return invoke<ImportLegacyResult>('import_legacy_dexie', { payload })
}

export async function searchNotes(query: string): Promise<SearchNotesResult> {
  return invoke<SearchNotesResult>('search_notes', { query })
}
