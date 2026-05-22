import type { AuthModel } from 'pocketbase'
import { db, nowIso } from '../db'
import type { AccountProfile, AuthSession } from '../db'
import { pb } from '../integrations/pocketbase/client'
import { stopSync } from './communitySyncAdapter'

export type OnlineAccountState = {
  session: AuthSession
  profile?: AccountProfile
}

type PocketBaseUser = AuthModel & {
  id?: string
  name?: string
  email?: string
  username?: string
  avatar?: string
  updated?: string
  created?: string
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

function accountIdFromModel(model: AuthModel): string | undefined {
  const id = (model as PocketBaseUser | null | undefined)?.id
  return typeof id === 'string' && id.trim() ? id : undefined
}

function profileFromModel(model: AuthModel, accountId: string): AccountProfile {
  const user = model as PocketBaseUser
  const now = nowIso()
  const displayName = user.name?.trim() || user.username?.trim() || user.email?.trim() || 'Loci user'
  return {
    accountId,
    displayName,
    handle: user.username,
    email: user.email,
    avatarUrl: user.avatar,
    createdAt: typeof user.created === 'string' ? user.created : now,
    updatedAt: typeof user.updated === 'string' ? user.updated : now,
  }
}

function signedInSession(accountId: string): AuthSession {
  const now = nowIso()
  return {
    id: 'current',
    status: 'signed-in',
    provider: 'pocketbase',
    accountId,
    lastCheckedAt: now,
    updatedAt: now,
  }
}

export const authManager = {
  async getAccountState(): Promise<OnlineAccountState> {
    if (pb.authStore.isValid && pb.authStore.model) {
      const accountId = accountIdFromModel(pb.authStore.model)
      if (accountId) {
        const session = signedInSession(accountId)
        const profile = profileFromModel(pb.authStore.model, accountId)
        await db.transaction('rw', db.authSessions, db.accountProfiles, async () => {
          await db.authSessions.put(session)
          await db.accountProfiles.put(profile)
        })
        return { session, profile }
      }
    }

    const session = await db.authSessions.get('current') ?? signedOutSession()
    const profile = session.accountId ? await db.accountProfiles.get(session.accountId) : undefined
    return { session, profile }
  },

  async signOut(): Promise<AuthSession> {
    await stopSync()
    pb.authStore.clear()
    const session = signedOutSession()
    await db.authSessions.put(session)
    return session
  },
}
