import { db } from '../db'

export const noteSnapshotsStore = {
  list: () => db.noteSnapshots.toArray(),
}
