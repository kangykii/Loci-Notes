import type { Editor as TiptapEditor } from '@tiptap/core'
import { createPortal } from 'react-dom'
import type { CSSProperties, RefObject } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

type CaretMode = 'local' | 'focus'

type CaretRect = {
  left: number
  top: number
  width: number
  height: number
}

type CaretTarget = CaretRect & {
  mode: CaretMode
}

type SmoothCaretState = CaretTarget & {
  visible: boolean
}

const EMPTY_CARET: SmoothCaretState = {
  left: 0,
  top: 0,
  width: 2,
  height: 20,
  mode: 'local',
  visible: false,
}

const CARET_SNAP_DISTANCE = 120
const CARET_SETTLE_DISTANCE = 0.28
const CARET_LERP = 0.34
const TYPING_LERP = 0.68
const TYPING_MAX_LAG = 14
const TYPING_GLIDE_MS = 110
const STRUCTURED_CARET_SELECTOR = [
  '.loci-math-inline',
  '.loci-image-frame',
].join(',')

function supportsSmoothMotion() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isTypingInput(event: InputEvent) {
  return (
    event.inputType.startsWith('insertText') ||
    event.inputType.startsWith('delete') ||
    event.inputType === 'insertCompositionText'
  )
}

function measureCaret({
  editor,
  focusMode,
  scrollContainer,
  shell,
}: {
  editor: TiptapEditor
  focusMode: boolean
  scrollContainer: HTMLElement | null
  shell: HTMLElement
}): CaretTarget | null {
  const activeElement = document.activeElement
  const editorFocused = activeElement === editor.view.dom || Boolean(activeElement && editor.view.dom.contains(activeElement))
  const selection = window.getSelection()
  if (editor.isDestroyed || !editorFocused || selection?.isCollapsed === false) return null
  if (activeElement instanceof HTMLElement && activeElement.closest('.loci-math-inline, textarea, input')) return null

  const anchorElement = selection?.anchorNode instanceof Element
    ? selection.anchorNode
    : selection?.anchorNode?.parentElement
  if (anchorElement?.closest(STRUCTURED_CARET_SELECTOR)) return null

  try {
    const coords = editor.view.coordsAtPos(editor.state.selection.from)

    if (focusMode && scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect()
      return {
        left: scrollContainer.scrollLeft + coords.left - containerRect.left,
        top: scrollContainer.scrollTop + coords.top - containerRect.top,
        width: 2,
        height: Math.max(16, coords.bottom - coords.top),
        mode: 'focus',
      }
    }

    const shellRect = shell.getBoundingClientRect()
    const scaleX = shell.offsetWidth ? shellRect.width / shell.offsetWidth : 1
    const scaleY = shell.offsetHeight ? shellRect.height / shell.offsetHeight : 1
    const safeScaleX = Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1
    const safeScaleY = Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1
    return {
      left: (coords.left - shellRect.left) / safeScaleX,
      top: (coords.top - shellRect.top) / safeScaleY,
      width: 2,
      height: Math.max(16, (coords.bottom - coords.top) / safeScaleY),
      mode: 'local',
    }
  } catch {
    return null
  }
}

function closeEnough(current: CaretRect, target: CaretRect) {
  return (
    Math.abs(current.left - target.left) < CARET_SETTLE_DISTANCE &&
    Math.abs(current.top - target.top) < CARET_SETTLE_DISTANCE &&
    Math.abs(current.width - target.width) < CARET_SETTLE_DISTANCE &&
    Math.abs(current.height - target.height) < CARET_SETTLE_DISTANCE
  )
}

function lerp(current: number, target: number, amount: number) {
  return current + (target - current) * amount
}

function targetRect(target: CaretTarget): CaretRect {
  return {
    left: target.left,
    top: target.top,
    width: target.width,
    height: target.height,
  }
}

function useSmoothCaret({
  editor,
  focusMode,
  scrollContainer,
  shell,
}: {
  editor: TiptapEditor | null
  focusMode: boolean
  scrollContainer: HTMLElement | null
  shell: HTMLElement | null
}) {
  const targetRef = useRef<CaretTarget | null>(null)
  const visualRef = useRef<CaretRect>(EMPTY_CARET)
  const visibleRef = useRef(false)
  const frameRef = useRef<number | null>(null)
  const composingRef = useRef(false)
  const pointerSelectingRef = useRef(false)
  const typingGlideUntilRef = useRef(0)
  const measureFrameRef = useRef<number | null>(null)
  const commitFrameRef = useRef<number | null>(null)
  const [state, setState] = useState<SmoothCaretState>(EMPTY_CARET)
  const [canAnimate, setCanAnimate] = useState(() => (typeof window === 'undefined' ? false : supportsSmoothMotion()))

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => setCanAnimate(!media.matches)
    handleChange()
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    if (measureFrameRef.current !== null) cancelAnimationFrame(measureFrameRef.current)
    if (commitFrameRef.current !== null) cancelAnimationFrame(commitFrameRef.current)
  }, [])

  useEffect(() => {
    if (!editor || !shell || !canAnimate || !focusMode) {
      targetRef.current = null
      visibleRef.current = false
      const frame = requestAnimationFrame(() => {
        setState((current) => (current.visible ? { ...current, visible: false } : current))
      })
      return () => cancelAnimationFrame(frame)
    }

    const hideCaret = () => {
      targetRef.current = null
      visibleRef.current = false
      setState((current) => (current.visible ? { ...current, visible: false } : current))
    }

    const snapToTarget = (target: CaretTarget) => {
      const rect = targetRect(target)
      visualRef.current = rect
      targetRef.current = target
      visibleRef.current = true
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      setState({ ...target, visible: true })
    }

    const glideTowardTarget = (current: CaretRect, target: CaretTarget, typing: boolean): CaretRect => {
      const distance = Math.hypot(current.left - target.left, current.top - target.top)
      if (distance > CARET_SNAP_DISTANCE || !visibleRef.current) return targetRect(target)

      const lerpAmount = typing ? TYPING_LERP : CARET_LERP
      let nextLeft = lerp(current.left, target.left, lerpAmount)
      let nextTop = lerp(current.top, target.top, lerpAmount)

      if (typing) {
        const lagX = target.left - nextLeft
        const lagY = target.top - nextTop
        const lag = Math.hypot(lagX, lagY)
        if (lag > TYPING_MAX_LAG) {
          const keepBehindRatio = TYPING_MAX_LAG / lag
          nextLeft = target.left - lagX * keepBehindRatio
          nextTop = target.top - lagY * keepBehindRatio
        }
      }

      return {
        left: nextLeft,
        top: nextTop,
        width: target.width,
        height: target.height,
      }
    }

    const animateToTarget = () => {
      const target = targetRef.current
      if (!target) {
        frameRef.current = null
        return
      }

      const current = visualRef.current
      const next = glideTowardTarget(current, target, performance.now() < typingGlideUntilRef.current)

      visualRef.current = closeEnough(next, target) ? targetRect(target) : next
      visibleRef.current = true
      if (commitFrameRef.current === null) {
        commitFrameRef.current = requestAnimationFrame(() => {
          commitFrameRef.current = null
          const liveTarget = targetRef.current
          if (!liveTarget || !visibleRef.current) return
          setState({
            ...visualRef.current,
            mode: liveTarget.mode,
            visible: true,
          })
        })
      }

      if (closeEnough(visualRef.current, target)) {
        frameRef.current = null
        return
      }
      frameRef.current = requestAnimationFrame(animateToTarget)
    }

    const measure = (typing = false) => {
      if (composingRef.current || pointerSelectingRef.current) {
        hideCaret()
        return
      }

      const measured = measureCaret({ editor, focusMode, scrollContainer, shell })
      if (!measured) {
        hideCaret()
        return
      }

      if (typing) typingGlideUntilRef.current = performance.now() + TYPING_GLIDE_MS

      if (!visibleRef.current || targetRef.current?.mode !== measured.mode) {
        snapToTarget(measured)
        return
      }

      targetRef.current = measured
      if (frameRef.current === null) frameRef.current = requestAnimationFrame(animateToTarget)
    }

    const scheduleMeasure = (typing = false) => {
      if (measureFrameRef.current !== null) return
      measureFrameRef.current = requestAnimationFrame(() => {
        measureFrameRef.current = null
        measure(typing)
      })
    }

    const handleBeforeInput = (event: InputEvent) => {
      if (isTypingInput(event)) typingGlideUntilRef.current = performance.now() + TYPING_GLIDE_MS
      scheduleMeasure(isTypingInput(event))
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete') {
        typingGlideUntilRef.current = performance.now() + TYPING_GLIDE_MS
      }
    }
    const handleKeyUp = () => scheduleMeasure(performance.now() < typingGlideUntilRef.current)
    const handlePointerDown = () => {
      pointerSelectingRef.current = true
      hideCaret()
    }
    const handlePointerUp = () => {
      pointerSelectingRef.current = false
      scheduleMeasure(false)
    }
    const handleCompositionStart = () => {
      composingRef.current = true
      hideCaret()
    }
    const handleCompositionEnd = () => {
      composingRef.current = false
      typingGlideUntilRef.current = performance.now() + TYPING_GLIDE_MS
      scheduleMeasure(true)
    }
    const handleNavigate = () => {
      if (performance.now() < typingGlideUntilRef.current) return
      scheduleMeasure(false)
    }

    const dom = editor.view.dom
    dom.addEventListener('beforeinput', handleBeforeInput)
    dom.addEventListener('keydown', handleKeyDown)
    dom.addEventListener('keyup', handleKeyUp)
    dom.addEventListener('click', handleNavigate)
    dom.addEventListener('focus', handleNavigate)
    dom.addEventListener('pointerdown', handlePointerDown)
    dom.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointerup', handlePointerUp)
    dom.addEventListener('compositionstart', handleCompositionStart)
    dom.addEventListener('compositionend', handleCompositionEnd)
    document.addEventListener('selectionchange', handleNavigate)
    document.addEventListener('scroll', handleNavigate, true)
    window.addEventListener('resize', handleNavigate)
    editor.on('focus', handleNavigate)
    editor.on('blur', hideCaret)
    editor.on('selectionUpdate', handleNavigate)
    measure(true)

    return () => {
      dom.removeEventListener('beforeinput', handleBeforeInput)
      dom.removeEventListener('keydown', handleKeyDown)
      dom.removeEventListener('keyup', handleKeyUp)
      dom.removeEventListener('click', handleNavigate)
      dom.removeEventListener('focus', handleNavigate)
      dom.removeEventListener('pointerdown', handlePointerDown)
      dom.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointerup', handlePointerUp)
      dom.removeEventListener('compositionstart', handleCompositionStart)
      dom.removeEventListener('compositionend', handleCompositionEnd)
      document.removeEventListener('selectionchange', handleNavigate)
      document.removeEventListener('scroll', handleNavigate, true)
      window.removeEventListener('resize', handleNavigate)
      editor.off('focus', handleNavigate)
      editor.off('blur', hideCaret)
      editor.off('selectionUpdate', handleNavigate)
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      if (measureFrameRef.current !== null) {
        cancelAnimationFrame(measureFrameRef.current)
        measureFrameRef.current = null
      }
      if (commitFrameRef.current !== null) {
        cancelAnimationFrame(commitFrameRef.current)
        commitFrameRef.current = null
      }
    }
  }, [canAnimate, editor, focusMode, scrollContainer, shell])

  return useMemo(() => ({
    ...state,
    enabled: canAnimate && focusMode,
  }), [canAnimate, focusMode, state])
}

type SmoothCaretProps = {
  editor: TiptapEditor | null
  focusMode: boolean
  scrollContainerRef?: RefObject<HTMLElement | null>
  shell: HTMLElement | null
}

export function SmoothCaret({ editor, focusMode, scrollContainerRef, shell }: SmoothCaretProps) {
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setScrollContainer(scrollContainerRef?.current ?? null)
  }, [scrollContainerRef])

  const caret = useSmoothCaret({
    editor,
    focusMode,
    scrollContainer,
    shell,
  })

  useEffect(() => {
    if (!shell) return
    shell.classList.toggle('has-smooth-caret', caret.enabled && caret.visible)
    return () => shell.classList.remove('has-smooth-caret')
  }, [caret.enabled, caret.visible, shell])

  if (!caret.enabled) return null

  const caretNode = (
    <span
      className={`smooth-caret smooth-caret--${caret.mode}${caret.visible ? ' is-visible' : ''}`}
      aria-hidden
      style={{
        '--smooth-caret-x': `${caret.left}px`,
        '--smooth-caret-y': `${caret.top}px`,
        '--smooth-caret-width': `${caret.width}px`,
        '--smooth-caret-height': `${caret.height}px`,
      } as CSSProperties}
    />
  )

  if (caret.mode === 'focus' && scrollContainer) return createPortal(caretNode, scrollContainer)

  return caretNode
}
