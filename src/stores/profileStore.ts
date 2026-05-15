import { db } from '../db'
import type { UserProfile } from '../db'

export const profileStore = {
  getLocalWorkspaceProfile: () => db.userProfiles.get('local'),

  saveLocalWorkspaceProfile: (profile: UserProfile) => db.userProfiles.put(profile),

  getLocal: () => db.userProfiles.get('local'),

  save: (profile: UserProfile) => db.userProfiles.put(profile),
}
