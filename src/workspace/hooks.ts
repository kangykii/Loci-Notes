import { useCallback, useSyncExternalStore } from 'react'

import type { Note, NoteMeta } from '../db'
import type { NoteIndexes } from './noteIndexes'
import { workspaceStore } from './workspaceStore'

export function useWorkspaceNotes(): Note[] {
  return useSyncExternalStore(
    workspaceStore.subscribe,
    () => workspaceStore.getSnapshot().notes,
    () => workspaceStore.getSnapshot().notes,
  )
}

export function useWorkspaceNoteMetas(): NoteMeta[] {
  return useSyncExternalStore(
    workspaceStore.subscribe,
    () => workspaceStore.getSnapshot().noteMetas,
    () => workspaceStore.getSnapshot().noteMetas,
  )
}

export function useWorkspaceIndexes(): NoteIndexes {
  return useSyncExternalStore(
    workspaceStore.subscribe,
    () => workspaceStore.getSnapshot().indexes,
    () => workspaceStore.getSnapshot().indexes,
  )
}

export function useWorkspaceActions() {
  return {
    setNotes: useCallback((notes: Note[], options?: Parameters<typeof workspaceStore.setNotes>[1]) => {
      workspaceStore.setNotes(notes, options)
    }, []),
    replaceNotesFromRef: useCallback(() => workspaceStore.replaceNotesFromRef(), []),
    patchNote: useCallback((next: Note, previous?: Note | null, options?: Parameters<typeof workspaceStore.patchNote>[2]) => {
      workspaceStore.patchNote(next, previous, options)
    }, []),
    patchNotes: useCallback((notes: Note[], options?: Parameters<typeof workspaceStore.patchNotes>[1]) => {
      workspaceStore.patchNotes(notes, options)
    }, []),
    removeNote: useCallback((noteId: string) => workspaceStore.removeNote(noteId), []),
    removeNotes: useCallback((noteIds: Set<string>) => workspaceStore.removeNotes(noteIds), []),
    upsertNote: useCallback((note: Note) => workspaceStore.upsertNote(note), []),
    setNoteMetas: useCallback((metas: NoteMeta[]) => workspaceStore.setNoteMetas(metas), []),
  }
}

export { workspaceStore }
