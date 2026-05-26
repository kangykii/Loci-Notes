import { describe, expect, it } from 'vitest'
import type { LociBlock } from '../../db'
import { blockIdForNode } from '../../editor/blocks'
import {
  applyBlockGroupDrop,
  blockSelectionRange,
  cloneBlocksForPaste,
  deleteSelectedBlocks,
  replaceSelectedBlocks,
  toggleBlockSelection,
} from './blockOperations'

function block(id: string): LociBlock {
  return {
    id,
    type: 'paragraph',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: id }] }] },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('block multi-selection operations', () => {
  const blocks = ['a', 'b', 'c', 'd', 'e'].map(block)

  it('selects a contiguous range between anchor and target', () => {
    expect(blockSelectionRange(blocks, 'b', 'd')).toEqual(['b', 'c', 'd'])
    expect(blockSelectionRange(blocks, 'd', 'b')).toEqual(['b', 'c', 'd'])
  })

  it('toggles non-contiguous selected blocks', () => {
    expect(toggleBlockSelection(['a', 'c'], 'b')).toEqual(['a', 'c', 'b'])
    expect(toggleBlockSelection(['a', 'c'], 'a')).toEqual(['c'])
  })

  it('deletes selected blocks while keeping at least one block', () => {
    expect(deleteSelectedBlocks(blocks, ['b', 'd']).map((item) => item.id)).toEqual(['a', 'c', 'e'])
    expect(deleteSelectedBlocks([block('a'), block('b')], ['a', 'b']).map((item) => item.id)).toEqual(['a'])
  })

  it('moves selected blocks as one ordered group', () => {
    expect(applyBlockGroupDrop(blocks, { draggedIds: ['b', 'd'], targetId: 'e', placement: 'below' }).map((item) => item.id))
      .toEqual(['a', 'c', 'e', 'b', 'd'])
  })

  it('replaces selected blocks with pasted blocks', () => {
    expect(replaceSelectedBlocks(blocks, ['b', 'c'], [block('x'), block('y')]).map((item) => item.id))
      .toEqual(['a', 'x', 'y', 'd', 'e'])
  })

  it('clones pasted blocks with fresh ids and timestamps', () => {
    let nextId = 0
    const cloned = cloneBlocksForPaste([block('a'), block('b')], () => `new-${nextId += 1}`, '2026-02-01T00:00:00.000Z')

    expect(cloned.map((item) => item.id)).toEqual(['new-1', 'new-2'])
    expect(cloned.every((item) => item.createdAt === '2026-02-01T00:00:00.000Z')).toBe(true)
    expect(cloned.every((item) => blockIdForNode(item.content.content?.[0]) === item.id)).toBe(true)
  })
})
