import { db, nowIso } from '../db'
import type { RemoteContentItem, RemoteContentPlacement } from '../db'

export type DownloadOptionContent = {
  title: string
  detail: string
  href: string
  label: string
}

export type RemoteContentService = {
  listByPlacement: (placement: RemoteContentPlacement) => Promise<RemoteContentItem[]>
  cacheItems: (items: RemoteContentItem[]) => Promise<void>
  getDownloadOptions: () => Promise<DownloadOptionContent[]>
}

const defaultDownloadOptions: DownloadOptionContent[] = [
  {
    title: 'Windows Setup EXE',
    detail: 'Recommended installer and signed updater package for Windows users.',
    href: 'https://github.com/kangykii/Loci-Notes/releases/latest/download/Loci-Notes-Setup-1.1.0-x64.exe',
    label: 'Download EXE',
  },
]

function isActiveContent(item: RemoteContentItem, now = nowIso()) {
  if (item.startsAt && item.startsAt > now) return false
  if (item.endsAt && item.endsAt < now) return false
  return true
}

export const remoteContentService: RemoteContentService = {
  async listByPlacement(placement) {
    const items = await db.remoteContentItems.where('placement').equals(placement).toArray()
    return items.filter((item) => isActiveContent(item)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async cacheItems(items) {
    if (!items.length) return
    const cachedAt = nowIso()
    await db.remoteContentItems.bulkPut(items.map((item) => ({ ...item, cachedAt })))
  },

  async getDownloadOptions() {
    const remoteDownloads = await this.listByPlacement('landing')
    const downloadItems = remoteDownloads
      .filter((item) => item.href)
      .map((item) => ({
        title: item.title,
        detail: item.body ?? 'Download Loci Notes.',
        href: item.href as string,
        label: item.campaignId ?? 'Download',
      }))
    return downloadItems.length ? downloadItems : defaultDownloadOptions
  },
}
