import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, UIEvent } from 'react'
import { useVirtualWindow } from './useVirtualWindow'

type VirtualListProps<T> = {
  items: T[]
  rowHeight: number
  className?: string
  style?: React.CSSProperties
  overscan?: number
  ariaLabel?: string
  role?: string
  renderItem: (item: T, index: number) => ReactNode
}

export function VirtualList<T>({
  items,
  rowHeight,
  className = '',
  style,
  overscan = 8,
  ariaLabel,
  role,
  renderItem,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { items: virtualItems, totalHeight, setScrollTop, setViewportHeight } = useVirtualWindow(items.length, rowHeight, overscan)

  useLayoutEffect(() => {
    const node = containerRef.current
    if (!node) return
    const syncHeight = () => setViewportHeight(node.clientHeight)
    syncHeight()
    const observer = new ResizeObserver(syncHeight)
    observer.observe(node)
    return () => observer.disconnect()
  }, [setViewportHeight])

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }

  return (
    <div ref={containerRef} className={`virtual-list scroll-region-stable ${className}`.trim()} style={style} onScroll={onScroll} aria-label={ariaLabel} role={role}>
      <div className="virtual-list-spacer" style={{ height: totalHeight }}>
        {virtualItems.map((virtualItem) => (
          <div
            className="virtual-list-row"
            key={virtualItem.index}
            style={{ transform: `translateY(${virtualItem.top}px)`, height: virtualItem.height }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}

type VirtualGridProps<T> = {
  items: T[]
  minItemWidth: number
  rowHeight: number
  className?: string
  overscan?: number
  ariaLabel?: string
  renderItem: (item: T, index: number) => ReactNode
}

export function VirtualGrid<T>({
  items,
  minItemWidth,
  rowHeight,
  className = '',
  overscan = 5,
  ariaLabel,
  renderItem,
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)
  const columns = Math.max(1, Math.floor(width / Math.max(1, minItemWidth)))
  const rowCount = Math.ceil(items.length / columns)
  const { items: virtualItems, totalHeight, setScrollTop, setViewportHeight } = useVirtualWindow(rowCount, rowHeight, overscan)

  useLayoutEffect(() => {
    const node = containerRef.current
    if (!node) return
    const syncBounds = () => {
      setWidth(node.clientWidth)
      setViewportHeight(node.clientHeight)
    }
    syncBounds()
    const observer = new ResizeObserver(syncBounds)
    observer.observe(node)
    return () => observer.disconnect()
  }, [setViewportHeight])

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }

  return (
    <div ref={containerRef} className={`virtual-grid scroll-region-stable ${className}`.trim()} onScroll={onScroll} aria-label={ariaLabel}>
      <div className="virtual-list-spacer" style={{ height: totalHeight }}>
        {virtualItems.map((virtualRow) => {
          const start = virtualRow.index * columns
          const rowItems = items.slice(start, start + columns)
          return (
            <div
              className="virtual-grid-row"
              key={virtualRow.index}
              style={{
                transform: `translateY(${virtualRow.top}px)`,
                height: virtualRow.height,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {rowItems.map((item, offset) => renderItem(item, start + offset))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
