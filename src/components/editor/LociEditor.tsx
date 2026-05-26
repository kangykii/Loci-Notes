import { EditorContent } from '@tiptap/react'
import type { Editor as TiptapEditor } from '@tiptap/core'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import type { DragEventHandler, MouseEventHandler, PointerEventHandler, ReactNode, Ref, RefObject } from 'react'
import { SmoothCaret } from './SmoothCaret'
import './editor.css'
import './blockBehavior.css'

type LociEditorProps = {
  editor: TiptapEditor | null
  isFocusMode: boolean
  smoothCaretFocusMode?: boolean
  smoothCaretScrollContainerRef?: RefObject<HTMLElement | null>
  shellRef: Ref<HTMLElement | HTMLDivElement>
  className?: string
  label?: ReactNode
  draggedBlockId?: string
  imageCropEditing?: boolean
  imageCropDragging?: boolean
  blockControls?: ReactNode
  formatSideControls?: ReactNode
  blockDropOverlay?: ReactNode
  onClick?: MouseEventHandler<HTMLElement>
  onContextMenu?: MouseEventHandler<HTMLElement>
  onPointerDown?: PointerEventHandler<HTMLElement>
  onPointerMove?: PointerEventHandler<HTMLElement>
  onPointerLeave?: PointerEventHandler<HTMLElement>
  onPointerUp?: PointerEventHandler<HTMLElement>
  onPointerCancel?: PointerEventHandler<HTMLElement>
  onDragStart?: DragEventHandler<HTMLElement>
  onDragOver?: DragEventHandler<HTMLElement>
  onDrop?: DragEventHandler<HTMLElement>
  onDragEnd?: DragEventHandler<HTMLElement>
}

function assignRef(ref: Ref<HTMLElement | HTMLDivElement>, node: HTMLElement | null) {
  if (typeof ref === 'function') {
    ref(node)
    return
  }
  if (ref) (ref as { current: HTMLElement | null }).current = node
}

export const LociEditor = memo(function LociEditor({
  editor,
  isFocusMode,
  smoothCaretFocusMode = isFocusMode,
  smoothCaretScrollContainerRef,
  shellRef,
  className = '',
  label,
  draggedBlockId = '',
  imageCropEditing = false,
  imageCropDragging = false,
  blockControls,
  formatSideControls,
  blockDropOverlay,
  onClick,
  onContextMenu,
  onPointerDown,
  onPointerMove,
  onPointerLeave,
  onPointerUp,
  onPointerCancel,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: LociEditorProps) {
  const shellRefProp = useRef(shellRef)
  const [shell, setShell] = useState<HTMLElement | null>(null)
  const setShellRef = useCallback((node: HTMLElement | null) => {
    setShell(node)
    assignRef(shellRefProp.current, node)
  }, [])

  useEffect(() => {
    shellRefProp.current = shellRef
  }, [shellRef])

  const classes = [
    className,
    'block-editor-shell',
    isFocusMode ? 'is-focus-mode' : '',
    draggedBlockId ? 'is-dragging-block' : '',
    imageCropEditing ? 'is-cropping-image' : '',
    imageCropDragging ? 'is-cropping-image-dragging' : '',
  ].filter(Boolean).join(' ')

  return (
    <section
      ref={setShellRef}
      className={classes}
      data-focus-mode={isFocusMode ? 'true' : undefined}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {label}
      <EditorContent editor={editor} />
      <SmoothCaret
        editor={editor}
        focusMode={smoothCaretFocusMode}
        scrollContainerRef={smoothCaretScrollContainerRef}
        shell={shell}
      />
      {blockControls}
      {formatSideControls}
      {blockDropOverlay}
    </section>
  )
})
