import { db } from '../db'

export const mediaStore = {
  listForNote: (noteId: string) => db.mediaAssets.where('noteId').equals(noteId).toArray(),

  preloadForNote: async (noteId: string, options: { priority?: 'visible' | 'nearby' } = {}) => {
    const assets = await db.mediaAssets.where('noteId').equals(noteId).toArray()
    if (options.priority === 'visible') {
      await Promise.all(
        assets.slice(0, 4).map(
          (asset) =>
            new Promise<void>((resolve) => {
              const image = new Image()
              image.decoding = 'async'
              image.onload = () => resolve()
              image.onerror = () => resolve()
              image.src = asset.fullSrc
            }),
        ),
      )
    }
    return assets
  },
}
