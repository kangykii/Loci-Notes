import { useCallback, useLayoutEffect, useState } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'

type ModalBackdropProps = {
  children: ReactNode
  anchorRef?: RefObject<HTMLElement | null>
  className?: string
  containerRef?: RefObject<HTMLElement | null>
  onClose: () => void
}

type OverlayBounds = CSSProperties & {
  '--overlay-visible-height'?: string
}

function boundsFromRect(rect: DOMRect): OverlayBounds {
  const top = Math.max(0, rect.top)
  const left = Math.max(0, rect.left)
  const width = Math.max(0, Math.min(window.innerWidth, rect.right) - left)
  const height = Math.max(0, Math.min(window.innerHeight, rect.bottom) - top)
  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    height: `${height}px`,
    '--overlay-visible-height': `${height}px`,
  }
}

function boundsFromScrollContainer(container: HTMLElement): OverlayBounds {
  const height = container.clientHeight
  return {
    top: `${container.scrollTop}px`,
    left: '0px',
    width: `${container.clientWidth}px`,
    height: `${height}px`,
    '--overlay-visible-height': `${height}px`,
  }
}

export function ModalBackdrop({ children, anchorRef, className = '', containerRef, onClose }: ModalBackdropProps) {
  const [bounds, setBounds] = useState<OverlayBounds | null>(null)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const measureBounds = useCallback(() => {
    const container = containerRef?.current
    if (container) {
      setBounds(boundsFromScrollContainer(container))
      return
    }
    const anchor = anchorRef?.current
    setBounds(anchor ? boundsFromRect(anchor.getBoundingClientRect()) : null)
  }, [anchorRef, containerRef])

  useLayoutEffect(() => {
    setPortalTarget(containerRef?.current ?? document.body)
  }, [containerRef])

  useLayoutEffect(() => {
    if (!anchorRef && !containerRef) return

    measureBounds()
    const container = containerRef?.current
    const anchor = anchorRef?.current
    const visualViewport = window.visualViewport
    const resizeTarget = container ?? anchor
    const resizeObserver = resizeTarget && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measureBounds)
      : null

    if (resizeTarget) resizeObserver?.observe(resizeTarget)
    container?.addEventListener('scroll', measureBounds, { passive: true })
    window.addEventListener('resize', measureBounds)
    if (!container) window.addEventListener('scroll', measureBounds, true)
    visualViewport?.addEventListener('resize', measureBounds)
    if (!container) visualViewport?.addEventListener('scroll', measureBounds)

    return () => {
      resizeObserver?.disconnect()
      container?.removeEventListener('scroll', measureBounds)
      window.removeEventListener('resize', measureBounds)
      if (!container) window.removeEventListener('scroll', measureBounds, true)
      visualViewport?.removeEventListener('resize', measureBounds)
      if (!container) visualViewport?.removeEventListener('scroll', measureBounds)
    }
  }, [anchorRef, containerRef, measureBounds])

  const modeClass = containerRef
    ? 'modal-backdrop--contained'
    : anchorRef
      ? 'modal-backdrop--anchored'
      : ''

  const backdrop = (
    <div
      className={`modal-backdrop ${modeClass} ${className}`.trim()}
      role="presentation"
      style={bounds ?? undefined}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {children}
    </div>
  )

  return portalTarget ? createPortal(backdrop, portalTarget) : null
}
