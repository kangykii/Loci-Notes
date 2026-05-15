import { createId, db, nowIso } from '../db'
import type { CollaborationEvent, CollaborationParticipant, CollaborationSession, JSONContent } from '../db'

export type CollaborationService = {
  listSessionsForNote: (localNoteId: string) => Promise<CollaborationSession[]>
  createSession: (input: {
    localNoteId: string
    title: string
    shareId?: string
    ownerAccountId?: string
  }) => Promise<CollaborationSession>
  joinSession: (sessionId: string, participant: Omit<CollaborationParticipant, 'id' | 'sessionId' | 'joinedAt'>) => Promise<CollaborationParticipant>
  leaveSession: (sessionId: string, accountId: string) => Promise<void>
  appendEvent: (input: {
    sessionId: string
    clientId: string
    actorAccountId?: string
    kind: CollaborationEvent['kind']
    payload: JSONContent
  }) => Promise<CollaborationEvent>
  listEvents: (sessionId: string) => Promise<CollaborationEvent[]>
}

export const collaborationService: CollaborationService = {
  async listSessionsForNote(localNoteId) {
    const sessions = await db.collaborationSessions.where('localNoteId').equals(localNoteId).toArray()
    return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async createSession(input) {
    const now = nowIso()
    const session: CollaborationSession = {
      id: createId('collab'),
      localNoteId: input.localNoteId,
      shareId: input.shareId,
      ownerAccountId: input.ownerAccountId,
      title: input.title || 'Untitled collaboration',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    }
    await db.collaborationSessions.put(session)
    return session
  },

  async joinSession(sessionId, participant) {
    const now = nowIso()
    const row: CollaborationParticipant = {
      ...participant,
      id: `${sessionId}_${participant.accountId}`,
      sessionId,
      joinedAt: now,
      lastSeenAt: now,
    }
    await db.collaborationParticipants.put(row)
    return row
  },

  async leaveSession(sessionId, accountId) {
    await db.collaborationParticipants.delete(`${sessionId}_${accountId}`)
  },

  async appendEvent(input) {
    const event: CollaborationEvent = {
      id: createId('collab_event'),
      sessionId: input.sessionId,
      clientId: input.clientId,
      actorAccountId: input.actorAccountId,
      kind: input.kind,
      payload: input.payload,
      syncStatus: 'local',
      createdAt: nowIso(),
    }
    await db.collaborationEvents.put(event)
    return event
  },

  async listEvents(sessionId) {
    const events = await db.collaborationEvents.where('sessionId').equals(sessionId).toArray()
    return events.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },
}
