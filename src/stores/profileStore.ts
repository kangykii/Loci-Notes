import { db } from '../db'
import type { UserProfile } from '../db'
import { getUserProfileFromRust, saveUserProfileToRust, shouldUseRustStorage } from '../tauri/workspaceClient'

export const profileStore = {
  getLocalWorkspaceProfile: () => {
    if (shouldUseRustStorage()) return getUserProfileFromRust()
    return db.userProfiles.get('local')
  },

  saveLocalWorkspaceProfile: async (profile: UserProfile) => {
    if (shouldUseRustStorage()) {
      await saveUserProfileToRust(profile)
      return
    }
    await db.userProfiles.put(profile)
  },

  getLocal: () => {
    if (shouldUseRustStorage()) return getUserProfileFromRust()
    return db.userProfiles.get('local')
  },

  save: async (profile: UserProfile) => {
    if (shouldUseRustStorage()) {
      await saveUserProfileToRust(profile)
      return
    }
    await db.userProfiles.put(profile)
  },
}
