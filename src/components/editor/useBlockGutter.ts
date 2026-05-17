import { useCallback } from 'react'
import type { RefObject } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/core'
import type { LociBlock } from '../../db'
import { blockContentNodes } from '../../editor/blocks'
import { mountedEditorDom } from './focusModePlugin'

export type BlockControlRect = {
  blockId: string
  top: number
  height: number
}

export type BlockDropTarget = {
  blockId: string
  rect: DOMRect
  shellTop: number
  shellLeft: number
}

export function sameBlockControls(a: BlockControlRect[], b: BlockControlRect[]) {
  return a.length === b.length && a.every((left, index) => {
    const right = b[index]
    return Boolean(right) &&
      left.blockId === right.blockId &&
      left.top === right.top &&
      left.height === right.height
  })
}

export function useBlockGutter({
  editor,
  shellRef,
  blocks,
  draggedBlockIdRef,
}: {
  editor: TiptapEditor | null
  shellRef: RefObject<HTMLElement | HTMLDivElement | null>
  blocks: LociBlock[]
  draggedBlockIdRef: RefObject<string>
}) {
  const measureBlockControls = useCallback(() => {
    const shell = shellRef.current
    const editorDom = mountedEditorDom(editor)
    if (!shell || !editorDom) return []

    const shellRect = shell.getBoundingClientRect()
    const children = Array.from(editorDom.children).filter((child): child is HTMLElement => child instanceof HTMLElement)

    let childIndex = 0
    const controls: BlockControlRect[] = []
    blocks.forEach((block) => {
      const count = Math.max(1, blockContentNodes(block.content).length)
      const blockChildren = children.slice(childIndex, childIndex + count)
      childIndex += count
      if (!blockChildren.length) return
      const rects = blockChildren.map((child) => child.getBoundingClientRect())
      const top = Math.min(...rects.map((rect) => rect.top))
      const bottom = Math.max(...rects.map((rect) => rect.bottom))
      controls.push({
        blockId: block.id,
        top: top - shellRect.top + 3,
        height: Math.max(24, bottom - top),
      })
    })

    return controls
  }, [blocks, editor, shellRef])

  const measureBlockDropTargets = useCallback(() => {
    const shell = shellRef.current
    const editorDom = mountedEditorDom(editor)
    if (!shell || !editorDom) return []

    const shellRect = shell.getBoundingClientRect()
    const children = Array.from(editorDom.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
    if (!children.length) return []

    let childIndex = 0
    return blocks.flatMap((block): BlockDropTarget[] => {
      const count = Math.max(1, blockContentNodes(block.content).length)
      const blockChildren = children.slice(childIndex, childIndex + count)
      childIndex += count
      if (block.id === draggedBlockIdRef.current) return []
      if (!blockChildren.length) return []

      const rects = blockChildren.map((child) => child.getBoundingClientRect())
      const top = Math.min(...rects.map((rect) => rect.top))
      const bottom = Math.max(...rects.map((rect) => rect.bottom))
      const left = Math.min(...rects.map((rect) => rect.left))
      const right = Math.max(...rects.map((rect) => rect.right))

      return [{
        blockId: block.id,
        rect: new DOMRect(left, top, right - left, bottom - top),
        shellTop: shellRect.top,
        shellLeft: shellRect.left,
      }]
    })
  }, [blocks, draggedBlockIdRef, editor, shellRef])

  return { measureBlockControls, measureBlockDropTargets }
}
