import { db } from '../db'
import type { Atom } from '../db'
import { listAtomsFromRust, saveAtomsBatchToRust, shouldUseRustStorage } from '../tauri/workspaceClient'

export const atomsRepository = {
  listByUpdated: () => {
    if (shouldUseRustStorage()) return listAtomsFromRust()
    return db.atoms.orderBy('updatedAt').reverse().toArray()
  },

  save: async (atom: Atom) => {
    if (shouldUseRustStorage()) {
      await saveAtomsBatchToRust([atom])
      return
    }
    await db.atoms.put(atom)
  },

  saveMany: async (atoms: Atom[]) => {
    if (shouldUseRustStorage()) {
      await saveAtomsBatchToRust(atoms)
      return
    }
    await db.atoms.bulkPut(atoms)
  },
}
