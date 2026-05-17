import { EditorContent } from '@tiptap/react'
import type { Editor as TiptapEditor } from '@tiptap/core'
import type { DragEventHandler, MouseEventHandler, PointerEventHandler, ReactNode, Ref } from 'react'
import './editor.css'

type LociEditorProps = {
  editor: TiptapEditor | null
  isFocusMode: boolean
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
  onPointerDown?: PointerEventHandler<HTMLElement>
  onPointerMove?: PointerEventHandler<HTMLElement>
  onPointerLeave?: PointerEventHandler<HTMLElement>
  onPointerUp?: PointerEventHandler<HTMLElement>
  onPointerCancel?: PointerEventHandler<HTMLElement>
  onDragStart?: DragEventHandler<HTMLElement>
  onDragEnd?: DragEventHandler<HTMLElement>
}

export function LociEditor({
  editor,
  isFocusMode,
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
  onPointerDown,
  onPointerMove,
  onPointerLeave,
  onPointerUp,
  onPointerCancel,
  onDragStart,
  onDragEnd,
}: LociEditorProps) {
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
      ref={shellRef}
      className={classes}
      data-focus-mode={isFocusMode ? 'true' : undefined}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {label}
      <EditorContent editor={editor} />
      {blockControls}
      {formatSideControls}
      {blockDropOverlay}
    </section>
  )
}
