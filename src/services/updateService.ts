import { relaunch } from '@tauri-apps/plugin-process'
import { check, Update } from '@tauri-apps/plugin-updater'
import { recordUpdateCheckpoint } from './updateCheckpointService'

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'current' | 'downloading' | 'installing' | 'ready' | 'error'
export type UpdatePhase = UpdateStatus
export type UpdateErrorCategory = 'network' | 'manifest' | 'signature' | 'install' | 'unknown'

export type UpdateState = {
  status: UpdateStatus
  phase: UpdatePhase
  message: string
  version?: string
  downloadedBytes?: number
  contentLength?: number
  canInstall?: boolean
  canRelaunch?: boolean
  errorCategory?: UpdateErrorCategory
}

export type UpdateService = {
  check: (options: {
    manual?: boolean
    isDesktop: boolean
    onStateChange: (state: UpdateState) => void
  }) => Promise<void>
  installAvailable: (options: {
    isDesktop: boolean
    onStateChange: (state: UpdateState) => void
  }) => Promise<void>
}

export const initialUpdateState: UpdateState = {
  status: 'idle',
  phase: 'idle',
  message: 'Check GitHub Releases for signed app updates.',
  canInstall: false,
  canRelaunch: false,
}

let pendingUpdate: Update | null = null
let operationInFlight: 'check' | 'install' | null = null

function classifyUpdateError(error: unknown): UpdateErrorCategory {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  if (message.includes('signature') || message.includes('verify')) return 'signature'
  if (message.includes('manifest') || message.includes('json') || message.includes('platform')) return 'manifest'
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout') || message.includes('dns')) return 'network'
  if (message.includes('install')) return 'install'
  return 'unknown'
}

function updateErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function checkpointWarningMessage(error: unknown) {
  const message = updateErrorMessage(error, 'Could not record marker-only update checkpoint.')
  console.warn(`Update checkpoint skipped: ${message}`)
  return 'Marker-only checkpoint could not be recorded; continuing with signed update install.'
}

export const updateService: UpdateService = {
  async check({ manual = false, isDesktop, onStateChange }) {
    if (operationInFlight) {
      onStateChange({
        status: operationInFlight === 'install' ? 'installing' : 'checking',
        phase: operationInFlight === 'install' ? 'installing' : 'checking',
        message: operationInFlight === 'install'
          ? 'An update install is already in progress.'
          : 'An update check is already in progress.',
        version: pendingUpdate?.version,
        canInstall: false,
        canRelaunch: false,
      })
      return
    }

    if (!isDesktop) {
      onStateChange({
        status: 'current',
        phase: 'current',
        message: 'Updates are only available in the desktop app.',
        canInstall: false,
        canRelaunch: false,
      })
      return
    }

    operationInFlight = 'check'
    onStateChange({
      status: 'checking',
      phase: 'checking',
      message: manual ? 'Checking GitHub Releases for updates...' : 'Checking for app updates...',
      canInstall: false,
      canRelaunch: false,
    })

    try {
      const update = await check()
      if (!update) {
        pendingUpdate = null
        onStateChange({
          status: 'current',
          phase: 'current',
          message: 'You are running the latest version.',
          canInstall: false,
          canRelaunch: false,
        })
        return
      }

      pendingUpdate = update
      onStateChange({
        status: 'available',
        phase: 'available',
        message: manual
          ? `Version ${update.version} is available. Install the signed update when you are ready.`
          : `Version ${update.version} is available. Open Settings to install the signed update.`,
        version: update.version,
        canInstall: true,
        canRelaunch: false,
      })
    } catch (error) {
      pendingUpdate = null
      onStateChange({
        status: 'error',
        phase: 'error',
        message: updateErrorMessage(error, 'Could not check for updates.'),
        canInstall: false,
        canRelaunch: false,
        errorCategory: classifyUpdateError(error),
      })
    } finally {
      operationInFlight = null
    }
  },

  async installAvailable({ isDesktop, onStateChange }) {
    if (operationInFlight) {
      onStateChange({
        status: operationInFlight === 'install' ? 'installing' : 'checking',
        phase: operationInFlight === 'install' ? 'installing' : 'checking',
        message: operationInFlight === 'install'
          ? 'An update install is already in progress.'
          : 'An update check is already in progress. Install after the check finishes.',
        version: pendingUpdate?.version,
        canInstall: false,
        canRelaunch: false,
      })
      return
    }

    if (!isDesktop) {
      onStateChange({
        status: 'current',
        phase: 'current',
        message: 'Updates are only available in the desktop app.',
        canInstall: false,
        canRelaunch: false,
      })
      return
    }

    if (!pendingUpdate) {
      await updateService.check({ manual: true, isDesktop, onStateChange })
      if (!pendingUpdate) return
    }

    const update = pendingUpdate
    operationInFlight = 'install'
    let checkpointWarning: string | undefined

    try {
      onStateChange({
        status: 'installing',
        phase: 'installing',
        message: 'Recording marker-only update checkpoint...',
        version: update.version,
        canInstall: false,
        canRelaunch: false,
      })
      try {
        await recordUpdateCheckpoint(update.version)
      } catch (error) {
        checkpointWarning = checkpointWarningMessage(error)
      }

      let downloaded = 0
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          downloaded = 0
          onStateChange({
            status: 'downloading',
            phase: 'downloading',
            message: event.data.contentLength
              ? `${checkpointWarning ? `${checkpointWarning} ` : ''}Downloading update (${Math.round(event.data.contentLength / 1024 / 1024)} MB)...`
              : `${checkpointWarning ? `${checkpointWarning} ` : ''}Downloading update...`,
            version: update.version,
            downloadedBytes: 0,
            contentLength: event.data.contentLength,
            canInstall: false,
            canRelaunch: false,
          })
          return
        }

        if (event.event === 'Progress') {
          downloaded += event.data.chunkLength
          onStateChange({
            status: 'downloading',
            phase: 'downloading',
            message: `Downloaded ${Math.round(downloaded / 1024 / 1024)} MB...`,
            version: update.version,
            downloadedBytes: downloaded,
            canInstall: false,
            canRelaunch: false,
          })
          return
        }

        onStateChange({
          status: 'installing',
          phase: 'installing',
          message: 'Update installed. Relaunching Loci Notes...',
          version: update.version,
          downloadedBytes: downloaded,
          canInstall: false,
          canRelaunch: true,
        })
      })

      pendingUpdate = null
      onStateChange({
        status: 'ready',
        phase: 'ready',
        message: 'Update installed. Relaunching Loci Notes...',
        version: update.version,
        downloadedBytes: downloaded,
        canInstall: false,
        canRelaunch: true,
      })
      await relaunch()
    } catch (error) {
      pendingUpdate = null
      onStateChange({
        status: 'error',
        phase: 'error',
        message: `${updateErrorMessage(error, 'Could not install the update.')} Run a fresh update check before retrying.`,
        version: update.version,
        canInstall: false,
        canRelaunch: false,
        errorCategory: classifyUpdateError(error),
      })
    } finally {
      operationInFlight = null
    }
  },
}
