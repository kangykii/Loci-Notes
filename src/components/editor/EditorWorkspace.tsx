import { memo, type ReactNode } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/core'
import type { DragEventHandler, MouseEventHandler, PointerEventHandler, Ref, RefObject } from 'react'
import type { LociBlock } from '../../db'
import { BlockControlsLayer } from './BlockControlsLayer'
import { LociEditor } from './LociEditor'
import type { BlockControlRect } from './useBlockGutter'

export type EditorWorkspaceProps = {
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
  blockControls: BlockControlRect[]
  blocks: LociBlock[]
  selectedBlockIds: ReadonlySet<string>
  hoveredBlockControlId: string
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

export const EditorWorkspace = memo(function EditorWorkspace({
  editor,
  isFocusMode,
  smoothCaretFocusMode,
  smoothCaretScrollContainerRef,
  shellRef,
  className = '',
  label,
  draggedBlockId = '',
  imageCropEditing = false,
  imageCropDragging = false,
  blockControls,
  blocks,
  selectedBlockIds,
  hoveredBlockControlId,
  formatSideControls = null,
  blockDropOverlay = null,
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
}: EditorWorkspaceProps) {
  return (
    <LociEditor
      editor={editor}
      isFocusMode={isFocusMode}
      smoothCaretFocusMode={smoothCaretFocusMode}
      smoothCaretScrollContainerRef={smoothCaretScrollContainerRef}
      shellRef={shellRef}
      className={className}
      label={label}
      draggedBlockId={draggedBlockId}
      imageCropEditing={imageCropEditing}
      imageCropDragging={imageCropDragging}
      blockControls={(
        <BlockControlsLayer
          controls={blockControls}
          blocks={blocks}
          selectedBlockIds={selectedBlockIds}
          hoveredBlockId={hoveredBlockControlId}
          showDeleteControl={blocks.length > 1}
        />
      )}
      formatSideControls={formatSideControls}
      blockDropOverlay={blockDropOverlay}
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
    />
  )
})
