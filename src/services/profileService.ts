import { db, nowIso } from '../db'
import type { AccountProfile, RemoteAsset } from '../db'

export type ProfileAvatarDraft = {
  localUrl?: string
  remoteUrl?: string
  mimeType?: string
  width?: number
  height?: number
}

export type ProfileService = {
  getProfile: (accountId: string) => Promise<AccountProfile | undefined>
  saveProfile: (profile: AccountProfile) => Promise<AccountProfile>
  saveAvatarAsset: (accountId: string, draft: ProfileAvatarDraft) => Promise<RemoteAsset>
}

export const profileService: ProfileService = {
  getProfile: (accountId) => db.accountProfiles.get(accountId),

  async saveProfile(profile) {
    const next = { ...profile, updatedAt: nowIso() }
    await db.accountProfiles.put(next)
    return next
  },

  async saveAvatarAsset(accountId, draft) {
    const now = nowIso()
    const asset: RemoteAsset = {
      id: `avatar_${accountId}`,
      ownerAccountId: accountId,
      kind: 'profile-avatar',
      ...draft,
      updatedAt: now,
    }
    await db.remoteAssets.put(asset)
    return asset
  },
}
