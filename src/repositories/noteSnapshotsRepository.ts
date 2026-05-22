import { db } from '../db'

export const noteSnapshotsRepository = {
  list: () => db.noteSnapshots.toArray(),
}
