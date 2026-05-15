import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'current' | 'installing' | 'error'

export type UpdateState = {
  status: UpdateStatus
  message: string
  version?: string
}

export type UpdateService = {
  checkAndInstall: (options: {
    manual?: boolean
    isDesktop: boolean
    onStateChange: (state: UpdateState) => void
  }) => Promise<void>
}

export const initialUpdateState: UpdateState = {
  status: 'idle',
  message: 'Check GitHub Releases for signed app updates.',
}

export const updateService: UpdateService = {
  async checkAndInstall({ manual = false, isDesktop, onStateChange }) {
    if (!isDesktop) {
      onStateChange({
        status: 'current',
        message: 'Updates are only available in the desktop app.',
      })
      return
    }

    onStateChange({
      status: 'checking',
      message: manual ? 'Checking GitHub Releases for updates...' : 'Checking for app updates...',
    })

    try {
      const update = await check()
      if (!update) {
        onStateChange({
          status: 'current',
          message: 'You are running the latest version.',
        })
        return
      }

      onStateChange({
        status: 'available',
        message: `Version ${update.version} is available. Downloading signed update...`,
        version: update.version,
      })

      let downloaded = 0
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          downloaded = 0
          onStateChange({
            status: 'installing',
            message: event.data.contentLength
              ? `Downloading update (${Math.round(event.data.contentLength / 1024 / 1024)} MB)...`
              : 'Downloading update...',
            version: update.version,
          })
          return
        }

        if (event.event === 'Progress') {
          downloaded += event.data.chunkLength
          onStateChange({
            status: 'installing',
            message: `Downloaded ${Math.round(downloaded / 1024 / 1024)} MB...`,
            version: update.version,
          })
          return
        }

        onStateChange({
          status: 'installing',
          message: 'Update installed. Relaunching Loci Notes...',
          version: update.version,
        })
      })

      await relaunch()
    } catch (error) {
      onStateChange({
        status: 'error',
        message: error instanceof Error ? error.message : 'Could not check for updates.',
      })
    }
  },
}
