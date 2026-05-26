import { appendNoteSnapshot, loadNoteSnapshots, type Note, type NoteSnapshot, db } from '../db'
import { appendNoteSnapshotToRust, loadNoteSnapshotsFromRust, shouldUseRustSnapshots } from '../tauri/snapshotsClient'

export async function loadNoteSnapshotsForNote(noteId: string): Promise<NoteSnapshot[]> {
  if (shouldUseRustSnapshots()) return loadNoteSnapshotsFromRust(noteId)
  return loadNoteSnapshots(noteId)
}

export async function appendNoteSnapshotForNote(note: Pick<Note, 'id' | 'title' | 'content'>) {
  if (shouldUseRustSnapshots()) {
    await appendNoteSnapshotToRust(note)
    return
  }
  await appendNoteSnapshot(note)
}

export async function bulkRestoreNoteSnapshots(snapshots: NoteSnapshot[]) {
  if (!snapshots.length) return
  if (shouldUseRustSnapshots()) {
    for (const snap of snapshots) {
      await appendNoteSnapshotToRust({ id: snap.noteId, title: snap.title, content: snap.content })
    }
    return
  }
  await db.noteSnapshots.bulkPut(snapshots)
}
