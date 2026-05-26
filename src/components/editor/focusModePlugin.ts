import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/core'

export function mountedEditorDom(editor: TiptapEditor | null): HTMLElement | null {
  if (!editor || editor.isDestroyed) return null
  try {
    return editor.view.dom
  } catch {
    return null
  }
}

function directEditorChild(editorDom: HTMLElement, node: Node | null): HTMLElement | null {
  const element = node instanceof HTMLElement ? node : node?.parentElement
  const child = element?.closest('.note-editor > *')
  return child instanceof HTMLElement && child.parentElement === editorDom ? child : null
}

function selectedEditorChild(editorDom: HTMLElement): HTMLElement | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed === false) return null
  const range = selection.getRangeAt(0)
  return directEditorChild(editorDom, range.startContainer)
}

function markedEditorChild(editorDom: HTMLElement): HTMLElement | null {
  return Array.from(editorDom.children).find((child): child is HTMLElement =>
    child instanceof HTMLElement && child.getAttribute('data-loci-active-block') === 'true'
  ) ?? null
}

export function useFocusModePlugin({
  editor,
  isFocusMode,
  scrollContainerRef,
}: {
  editor: TiptapEditor | null
  isFocusMode: boolean
  scrollContainerRef: RefObject<HTMLElement | null>
}) {
  const lastActiveBlockElementRef = useRef<HTMLElement | null>(null)
  const centerFrameRef = useRef<number | null>(null)
  const settleFrameRef = useRef<number | null>(null)

  useEffect(() => {
    lastActiveBlockElementRef.current = null
  }, [isFocusMode])

  const centerActiveBlock = useCallback((activeBlock: HTMLElement | null) => {
    if (!isFocusMode || !activeBlock) {
      lastActiveBlockElementRef.current = null
      return
    }

    if (centerFrameRef.current) cancelAnimationFrame(centerFrameRef.current)
    centerFrameRef.current = requestAnimationFrame(() => {
      centerFrameRef.current = null
      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer || !scrollContainer.contains(activeBlock)) return

      const blockRect = activeBlock.getBoundingClientRect()
      const containerRect = scrollContainer.getBoundingClientRect()
      if (blockRect.height === 0 || containerRect.height === 0) return

      const blockCenter = blockRect.top + blockRect.height / 2
      const visualCenter = containerRect.top + containerRect.height * 0.5
      const delta = blockCenter - visualCenter

      if (lastActiveBlockElementRef.current === activeBlock && Math.abs(delta) < 8) return
      lastActiveBlockElementRef.current = activeBlock

      if (Math.abs(delta) < 8) return
      scrollContainer.scrollTo({
        top: scrollContainer.scrollTop + delta,
        behavior: 'smooth',
      })
    })
  }, [isFocusMode, scrollContainerRef])

  const activateEditorBlock = useCallback((activeBlock: HTMLElement | null) => {
    const editorDom = mountedEditorDom(editor)
    if (!editorDom) return

    if (!isFocusMode) {
      lastActiveBlockElementRef.current = null
      return
    }

    if (!activeBlock || activeBlock.parentElement !== editorDom) return
    if (!markedEditorChild(editorDom)) activeBlock.setAttribute('data-loci-active-block', 'true')
    centerActiveBlock(activeBlock)
  }, [centerActiveBlock, editor, isFocusMode])

  const markActiveEditorBlock = useCallback(() => {
    if (!isFocusMode) return

    const editorDom = mountedEditorDom(editor)
    if (!editorDom) return

    if (!editor) {
      activateEditorBlock(null)
      return
    }

    const children = Array.from(editorDom.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
    const { $from } = editor.state.selection
    const activeIndex = $from.index(0)
    const topLevelPos = $from.depth > 0 ? $from.before(1) : 0
    const topLevelDom = topLevelPos > 0 ? editor.view.nodeDOM(topLevelPos) : null
    const activeBlock = selectedEditorChild(editorDom) ?? markedEditorChild(editorDom) ?? directEditorChild(editorDom, topLevelDom) ?? children[activeIndex] ?? null
    activateEditorBlock(activeBlock)
  }, [activateEditorBlock, editor, isFocusMode])

  useEffect(() => {
    return () => {
      if (centerFrameRef.current) {
        cancelAnimationFrame(centerFrameRef.current)
        centerFrameRef.current = null
      }
      if (settleFrameRef.current) {
        cancelAnimationFrame(settleFrameRef.current)
        settleFrameRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const editorDom = mountedEditorDom(editor)
    if (!editorDom) return

    const scheduleMarkActiveBlock = (event: Event) => {
      const eventBlock = event.target instanceof Node ? directEditorChild(editorDom, event.target) : null
      if (settleFrameRef.current) cancelAnimationFrame(settleFrameRef.current)
      settleFrameRef.current = requestAnimationFrame(() => {
        settleFrameRef.current = requestAnimationFrame(() => {
          settleFrameRef.current = null
          const decoratedBlock = markedEditorChild(editorDom)
          if (decoratedBlock) {
            activateEditorBlock(decoratedBlock)
            return
          }
          if (eventBlock) {
            activateEditorBlock(eventBlock)
            return
          }
          markActiveEditorBlock()
        })
      })
    }

    editorDom.addEventListener('pointerdown', scheduleMarkActiveBlock)
    editorDom.addEventListener('focusin', scheduleMarkActiveBlock)
    editorDom.addEventListener('keyup', scheduleMarkActiveBlock)
    editorDom.addEventListener('pointerup', scheduleMarkActiveBlock)
    return () => {
      editorDom.removeEventListener('pointerdown', scheduleMarkActiveBlock)
      editorDom.removeEventListener('focusin', scheduleMarkActiveBlock)
      editorDom.removeEventListener('keyup', scheduleMarkActiveBlock)
      editorDom.removeEventListener('pointerup', scheduleMarkActiveBlock)
    }
  }, [activateEditorBlock, editor, markActiveEditorBlock])

  return { markActiveEditorBlock }
}
