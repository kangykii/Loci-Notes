import { useMemo, useState } from 'react'

export type VirtualItem = {
  index: number
  top: number
  height: number
}

export function useVirtualWindow(count: number, rowHeight: number, overscan = 8) {
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  return useMemo(() => {
    const safeRowHeight = Math.max(1, rowHeight)
    const start = Math.max(0, Math.floor(scrollTop / safeRowHeight) - overscan)
    const end = Math.min(count, Math.ceil((scrollTop + viewportHeight) / safeRowHeight) + overscan)
    const items = Array.from({ length: Math.max(0, end - start) }, (_, i): VirtualItem => {
      const index = start + i
      return { index, top: index * safeRowHeight, height: safeRowHeight }
    })
    return {
      items,
      totalHeight: count * safeRowHeight,
      setScrollTop,
      setViewportHeight,
    }
  }, [count, overscan, rowHeight, scrollTop, viewportHeight])
}
