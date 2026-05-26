import { invoke } from '@tauri-apps/api/core'

import type { Note, NoteSnapshot } from '../db'
import { nowIso } from '../db'
import { isTauriDesktop } from './env'

export async function loadNoteSnapshotsFromRust(noteId: string): Promise<NoteSnapshot[]> {
  return invoke<NoteSnapshot[]>('list_note_snapshots', { noteId })
}

export async function appendNoteSnapshotToRust(note: Pick<Note, 'id' | 'title' | 'content'>) {
  await invoke('append_note_snapshot', {
    note: {
      id: note.id,
      title: note.title,
      content: note.content,
      savedAt: nowIso(),
    },
  })
}

export function shouldUseRustSnapshots() {
  return isTauriDesktop()
}
