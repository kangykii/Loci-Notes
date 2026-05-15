import { db, nowIso } from '../db'
import type { AccountProfile, AuthSession } from '../db'

export type OnlineAccountState = {
  session: AuthSession
  profile?: AccountProfile
}

export type AuthService = {
  getAccountState: () => Promise<OnlineAccountState>
  signOut: () => Promise<AuthSession>
}

export const signedOutSession = (): AuthSession => {
  const now = nowIso()
  return {
    id: 'current',
    status: 'signed-out',
    lastCheckedAt: now,
    updatedAt: now,
  }
}

export const authService: AuthService = {
  async getAccountState() {
    const session = await db.authSessions.get('current') ?? signedOutSession()
    const profile = session.accountId ? await db.accountProfiles.get(session.accountId) : undefined
    return { session, profile }
  },

  async signOut() {
    const session = signedOutSession()
    await db.authSessions.put(session)
    return session
  },
}
