import { db } from '../db'
import type { UserSettings } from '../db'

export const settingsStore = {
  getLocal: () => db.userSettings.get('local'),

  save: (settings: UserSettings) => db.userSettings.put(settings),
}
