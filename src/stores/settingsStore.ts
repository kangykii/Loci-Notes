import { db } from '../db'
import type { UserSettings } from '../db'
import { getUserSettingsFromRust, saveUserSettingsToRust, shouldUseRustStorage } from '../tauri/workspaceClient'

export const settingsStore = {
  getLocal: () => {
    if (shouldUseRustStorage()) return getUserSettingsFromRust()
    return db.userSettings.get('local')
  },

  save: async (settings: UserSettings) => {
    if (shouldUseRustStorage()) {
      await saveUserSettingsToRust(settings)
      return
    }
    await db.userSettings.put(settings)
  },
}
