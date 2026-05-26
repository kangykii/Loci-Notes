import { invoke } from '@tauri-apps/api/core'

import type { Note, NoteBody, NoteMeta } from '../db'
import { isTauriDesktop } from './env'

export async function listNotesFromRust(): Promise<Note[]> {
  return invoke<Note[]>('list_notes')
}

export async function listNoteMetasFromRust(): Promise<NoteMeta[]> {
  return invoke<NoteMeta[]>('list_note_metas')
}

export async function getNoteBodyFromRust(noteId: string): Promise<NoteBody | undefined> {
  return (await invoke<NoteBody | null>('get_note_body', { noteId })) ?? undefined
}

export async function saveNotesBatchToRust(notes: Note[]): Promise<void> {
  if (!notes.length) return
  await invoke('save_notes_batch', { notes })
}

export async function deleteNoteFromRust(noteId: string): Promise<void> {
  await invoke('delete_note', { noteId })
}

export async function repairSplitNoteStorageFromRust() {
  return invoke<import('./dbClient').LocalNoteStorageRepairResult>('repair_split_note_storage')
}

export function shouldUseRustNotes() {
  return isTauriDesktop()
}
