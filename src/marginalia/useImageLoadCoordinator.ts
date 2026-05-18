import { useCallback, useRef, useState } from 'react'

export type ImageLoadState = 'loading' | 'ready' | 'failed'
export type ImageLoadPriority = 'critical' | 'visible'

type ImageLoadStates = Record<string, ImageLoadState>

export function useImageLoadCoordinator() {
  const [imageLoadStates, setImageLoadStates] = useState<ImageLoadStates>({})
  const inflightImageLoadsRef = useRef(new Set<string>())

  const ensureImageLoaded = useCallback((src: string | undefined, priority: ImageLoadPriority = 'visible') => {
    if (!src) return
    setImageLoadStates((current) => (current[src] ? current : { ...current, [src]: 'loading' }))
    if (inflightImageLoadsRef.current.has(src)) return
    inflightImageLoadsRef.current.add(src)

    const markState = (state: ImageLoadState) => {
      inflightImageLoadsRef.current.delete(src)
      setImageLoadStates((current) => (current[src] === state ? current : { ...current, [src]: state }))
    }

    const image = new Image()
    image.decoding = 'async'
    if ('fetchPriority' in image && priority === 'critical') {
      ;(image as HTMLImageElement & { fetchPriority: string }).fetchPriority = 'high'
    }
    image.onload = () => markState('ready')
    image.onerror = () => markState('failed')
    image.src = src
  }, [])

  return {
    imageLoadStates,
    ensureImageLoaded,
  }
}
