import { db } from '../db'
import type { Atom } from '../db'

export const atomsRepository = {
  listByUpdated: () => db.atoms.orderBy('updatedAt').reverse().toArray(),

  save: (atom: Atom) => db.atoms.put(atom),

  saveMany: (atoms: Atom[]) => db.atoms.bulkPut(atoms),
}
