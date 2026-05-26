import { memo } from 'react'
import type { LociBlock } from '../../db'
import type { BlockControlRect } from './useBlockGutter'

type BlockControlsLayerProps = {
  controls: BlockControlRect[]
  blocks: LociBlock[]
  selectedBlockIds: ReadonlySet<string>
  hoveredBlockId: string
  showDeleteControl: boolean
}

export const BlockControlsLayer = memo(function BlockControlsLayer({
  controls,
  blocks,
  selectedBlockIds,
  hoveredBlockId,
  showDeleteControl,
}: BlockControlsLayerProps) {
  if (!controls.length) return null

  const blockById = new Map(blocks.map((block) => [block.id, block]))

  return (
    <div className="block-controls-layer" aria-hidden={false}>
      {controls.map((control) => {
        const block = blockById.get(control.blockId)
        const isSelected = selectedBlockIds.has(control.blockId)
        return (
          <span
            key={control.blockId}
            className={`block-control-hotspot ${hoveredBlockId === control.blockId ? 'is-hovered' : ''} ${isSelected ? 'is-selected' : ''}`}
            style={{ top: control.top, height: control.height }}
          >
            <span
              className="block-hover-controls"
              data-block-id={control.blockId}
              data-block-type={block?.type ?? ''}
              contentEditable={false}
            >
              {showDeleteControl && (
                <button className="block-control-button block-control-delete" type="button" aria-label="Delete block" data-block-action="delete" data-block-id={control.blockId}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
                </button>
              )}
              <button className="block-control-button" type="button" aria-label="Insert block after block" data-block-action="insert" data-block-id={control.blockId}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
              </button>
              <button className="block-control-button block-control-handle" type="button" aria-label="Move block" draggable data-block-action="drag" data-block-id={control.blockId}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="9" cy="7.5" r="1.25" /><circle cx="15" cy="7.5" r="1.25" />
                  <circle cx="9" cy="12" r="1.25" /><circle cx="15" cy="12" r="1.25" />
                  <circle cx="9" cy="16.5" r="1.25" /><circle cx="15" cy="16.5" r="1.25" />
                </svg>
              </button>
            </span>
          </span>
        )
      })}
    </div>
  )
})
