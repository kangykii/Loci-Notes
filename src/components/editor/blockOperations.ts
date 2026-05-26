import type { LociBlock } from '../../db'
import { blockContentNodes, blockDoc, cloneTemplateValue, withBlockId } from '../../editor/blocks'

export type BlockDropPlacement = 'above' | 'below'

export type BlockDropMoveIntent = {
  draggedId: string
  targetId: string
  placement: BlockDropPlacement
}

export type BlockGroupDropMoveIntent = {
  draggedIds: string[]
  targetId: string
  placement: BlockDropPlacement
}

export type BlockClipboardPayload = {
  kind: 'loci-blocks'
  version: 1
  blocks: LociBlock[]
}

export function blockSelectionRange(blocks: LociBlock[], anchorId: string, targetId: string): string[] {
  const anchorIndex = blocks.findIndex((block) => block.id === anchorId)
  const targetIndex = blocks.findIndex((block) => block.id === targetId)
  if (anchorIndex < 0 || targetIndex < 0) return targetId ? [targetId] : []
  const from = Math.min(anchorIndex, targetIndex)
  const to = Math.max(anchorIndex, targetIndex)
  return blocks.slice(from, to + 1).map((block) => block.id)
}

export function toggleBlockSelection(selectedIds: string[], blockId: string): string[] {
  if (!blockId) return selectedIds
  return selectedIds.includes(blockId)
    ? selectedIds.filter((id) => id !== blockId)
    : [...selectedIds, blockId]
}

export function selectedBlocksInDocumentOrder(blocks: LociBlock[], selectedIds: string[]): LociBlock[] {
  const selected = new Set(selectedIds)
  return blocks.filter((block) => selected.has(block.id))
}

export function applyBlockDrop(blocks: LociBlock[], intent: BlockDropMoveIntent): LociBlock[] {
  if (intent.draggedId === intent.targetId) return blocks
  const nextBlocks = [...blocks]
  const draggedIndex = nextBlocks.findIndex((block) => block.id === intent.draggedId)
  const targetIndex = nextBlocks.findIndex((block) => block.id === intent.targetId)
  if (draggedIndex < 0 || targetIndex < 0) return blocks
  const [removed] = nextBlocks.splice(draggedIndex, 1)
  const nextTargetIndex = nextBlocks.findIndex((block) => block.id === intent.targetId)
  if (nextTargetIndex < 0) return blocks
  const insertIndex = intent.placement === 'above' ? nextTargetIndex : nextTargetIndex + 1
  nextBlocks.splice(insertIndex, 0, removed)
  return nextBlocks
}

export function applyBlockGroupDrop(blocks: LociBlock[], intent: BlockGroupDropMoveIntent): LociBlock[] {
  const draggedIdSet = new Set(intent.draggedIds)
  if (!draggedIdSet.size || draggedIdSet.has(intent.targetId)) return blocks
  const dragged = blocks.filter((block) => draggedIdSet.has(block.id))
  if (!dragged.length) return blocks
  const remaining = blocks.filter((block) => !draggedIdSet.has(block.id))
  const targetIndex = remaining.findIndex((block) => block.id === intent.targetId)
  if (targetIndex < 0) return blocks
  const insertIndex = intent.placement === 'above' ? targetIndex : targetIndex + 1
  return [
    ...remaining.slice(0, insertIndex),
    ...dragged,
    ...remaining.slice(insertIndex),
  ]
}

export function deleteSelectedBlocks(blocks: LociBlock[], selectedIds: string[]): LociBlock[] {
  const selected = new Set(selectedIds)
  if (!selected.size || blocks.length <= 1) return blocks
  const next = blocks.filter((block) => !selected.has(block.id))
  return next.length ? next : [blocks[0]]
}

export function replaceSelectedBlocks(blocks: LociBlock[], selectedIds: string[], replacement: LociBlock[]): LociBlock[] {
  const selected = new Set(selectedIds)
  if (!selected.size) return blocks
  const firstSelectedIndex = blocks.findIndex((block) => selected.has(block.id))
  if (firstSelectedIndex < 0) return blocks
  const next = blocks.filter((block) => !selected.has(block.id))
  next.splice(firstSelectedIndex, 0, ...replacement)
  return next
}

export function insertBlocksRelative(blocks: LociBlock[], targetId: string, blocksToInsert: LociBlock[], placement: 'before' | 'after') {
  if (!blocksToInsert.length) return blocks
  const nextBlocks = [...blocks]
  const targetIndex = nextBlocks.findIndex((block) => block.id === targetId)
  if (targetIndex < 0) return [...nextBlocks, ...blocksToInsert]
  const insertIndex = placement === 'before' ? targetIndex : targetIndex + 1
  nextBlocks.splice(insertIndex, 0, ...blocksToInsert)
  return nextBlocks
}

export function insertBlockRelative(blocks: LociBlock[], targetId: string, blockToInsert: LociBlock, placement: 'before' | 'after') {
  const nextBlocks = [...blocks]
  const targetIndex = nextBlocks.findIndex((block) => block.id === targetId)
  if (targetIndex < 0) return [...nextBlocks, blockToInsert]
  const insertIndex = placement === 'before' ? targetIndex : targetIndex + 1
  nextBlocks.splice(insertIndex, 0, blockToInsert)
  return nextBlocks
}

export function updateBlockById(blocks: LociBlock[], blockId: string, updater: (block: LociBlock) => LociBlock): LociBlock[] {
  let changed = false
  const next = blocks.map((block) => {
    if (block.id === blockId) {
      changed = true
      return updater(block)
    }

    return block
  })

  return changed ? next : blocks
}

export function blockClipboardPayload(blocks: LociBlock[]): BlockClipboardPayload {
  return { kind: 'loci-blocks', version: 1, blocks }
}

export function parseBlockClipboardPayload(text: string): BlockClipboardPayload | null {
  try {
    const value = JSON.parse(text) as Partial<BlockClipboardPayload>
    if (value.kind !== 'loci-blocks' || value.version !== 1 || !Array.isArray(value.blocks)) return null
    return { kind: 'loci-blocks', version: 1, blocks: value.blocks as LociBlock[] }
  } catch {
    return null
  }
}

export function cloneBlocksForPaste(blocks: LociBlock[], createBlockId: () => string, timestamp: string): LociBlock[] {
  return blocks.map((block) => {
    const id = createBlockId()
    const nodes = blockContentNodes(block.content)
    const content = blockDoc(
      nodes.map((node, index) =>
        index === 0 ? withBlockId(cloneTemplateValue(node), id) : cloneTemplateValue(node),
      ),
    )
    return {
      ...block,
      id,
      content,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  })
}
