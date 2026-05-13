import { db } from '../db'
import type { UserProfile } from '../db'

export const profileStore = {
  getLocal: () => db.userProfiles.get('local'),

  save: (profile: UserProfile) => db.userProfiles.put(profile),
}
