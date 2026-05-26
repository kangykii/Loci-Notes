export const UNASSIGNED_PROJECT_ID = '__unassigned__'

export function sortByUpdated(a: { updatedAt: string }, b: { updatedAt: string }) {
  return b.updatedAt.localeCompare(a.updatedAt)
}

export function sortByCreated(a: { createdAt: string }, b: { createdAt: string }) {
  return b.createdAt.localeCompare(a.createdAt)
}
