import { describe, expect, it } from 'vitest'
import type { LociBlock } from '../db'
import {
  LOCI_BLOCK_ID_ATTR,
  blankBlockNode,
  blockIdForNode,
  blockTypeForNode,
  collectText,
  collectNotePreviewLines,
  contentFromBlocks,
  createLociBlock,
  aiBlockDoc,
  displayMathParagraphDoc,
  displayMathLatexInBlock,
  ensureDocumentBlockIds,
  normalizeBlocksForContent,
  normalizeLegacyEditorContent,
} from './blocks'
import { createAIBlockAttrs } from './aiBlocks'

describe('AI-Block document integration', () => {
  it('maps lociAIBlock nodes to AI-Blocks', () => {
    const doc = aiBlockDoc()
    const node = doc.content?.[0]

    expect(node?.type).toBe('lociAIBlock')
    expect(blockTypeForNode(node ?? doc)).toBe('aiBlock')
  })

  it('creates AI-Block blank block content', () => {
    const doc = blankBlockNode('aiBlock')

    expect(doc.content?.[0]?.type).toBe('lociAIBlock')
    expect(doc.content?.[0]?.attrs).toMatchObject({
      sourceKind: 'placeholder',
      status: 'ready',
      revision: 1,
    })
  })

  it('serializes and normalizes AI-Blocks as one top-level block', () => {
    const block = createLociBlock(aiBlockDoc(), 'aiBlock')
    const content = contentFromBlocks([block])
    const normalized = normalizeBlocksForContent(content, [block])

    expect(content.content).toHaveLength(1)
    expect(content.content?.[0]?.type).toBe('lociAIBlock')
    expect(content.content?.[0]?.attrs?.[LOCI_BLOCK_ID_ATTR]).toBe(block.id)
    expect(normalized).toHaveLength(1)
    expect(normalized[0]).toMatchObject({
      id: block.id,
      type: 'aiBlock',
    })
  })

  it('includes AI-Block artifact text in note previews', () => {
    const block: LociBlock = createLociBlock({
      type: 'doc',
      content: [{
        type: 'lociAIBlock',
        attrs: createAIBlockAttrs({
          artifact: { version: 1, kind: 'placeholder', title: 'Habit tracker', body: 'Tracks daily practice safely.' },
        }),
      }],
    }, 'aiBlock')

    expect(collectNotePreviewLines(contentFromBlocks([block]), 1)).toEqual([
      'Habit tracker - Tracks daily practice safely.',
    ])
  })
})

describe('stable block ids', () => {
  it('seeds lociBlockId attrs from existing LociBlock ids', () => {
    const blocks: LociBlock[] = [
      {
        id: 'block-a',
        type: 'paragraph',
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'block-b',
        type: 'paragraph',
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    const legacy = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'A' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'B' }] },
      ],
    }
    const seeded = ensureDocumentBlockIds(legacy, blocks)

    expect(blockIdForNode(seeded.content?.[0])).toBe('block-a')
    expect(blockIdForNode(seeded.content?.[1])).toBe('block-b')
  })

  it('reuses unchanged block references when lociBlockId matches', () => {
    const block = createLociBlock({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    })
    const content = contentFromBlocks([block])
    const first = normalizeBlocksForContent(content, [block])
    const second = normalizeBlocksForContent(content, first)

    expect(first[0]).toBe(block)
    expect(second[0]).toBe(first[0])
  })

  it('updates only the changed block when one top-level node edits', () => {
    const blockA = createLociBlock({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
    })
    const blockB = createLociBlock({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }],
    })
    const prior = [blockA, blockB]
    const edited = {
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { [LOCI_BLOCK_ID_ATTR]: blockA.id }, content: [{ type: 'text', text: 'A changed' }] },
        { type: 'paragraph', attrs: { [LOCI_BLOCK_ID_ATTR]: blockB.id }, content: [{ type: 'text', text: 'B' }] },
      ],
    }
    const normalized = normalizeBlocksForContent(edited, prior)

    expect(normalized[0]).not.toBe(blockA)
    expect(normalized[1]).toBe(blockB)
    expect(collectText(normalized[0].content)).toContain('A changed')
  })

  it('preserves block ids when PM node order changes', () => {
    const blockA = createLociBlock({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
    })
    const blockB = createLociBlock({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }],
    })
    const reordered = {
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { [LOCI_BLOCK_ID_ATTR]: blockB.id }, content: [{ type: 'text', text: 'B' }] },
        { type: 'paragraph', attrs: { [LOCI_BLOCK_ID_ATTR]: blockA.id }, content: [{ type: 'text', text: 'A' }] },
      ],
    }
    const normalized = normalizeBlocksForContent(reordered, [blockA, blockB])

    expect(normalized.map((block) => block.id)).toEqual([blockB.id, blockA.id])
  })

  it('writes lociBlockId into contentFromBlocks output', () => {
    const block = createLociBlock({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
    })
    const content = contentFromBlocks([block])

    expect(blockIdForNode(content.content?.[0])).toBe(block.id)
  })
})

describe('math migration', () => {
  it('converts legacy lociLatex blocks to display inline math paragraphs', () => {
    const legacy = {
      type: 'doc',
      content: [{ type: 'lociLatex', attrs: { latex: 'E=mc^2' } }],
    }
    const migrated = normalizeLegacyEditorContent(legacy)
    const node = migrated.content?.[0]

    expect(node?.type).toBe('paragraph')
    expect(node?.content?.[0]?.marks?.[0]).toMatchObject({
      type: 'lociMathInline',
      attrs: { latex: 'E=mc^2', display: true },
    })
  })

  it('stores display equations as paragraph blocks with math marks', () => {
    const block = createLociBlock(displayMathParagraphDoc('a^2+b^2'), 'paragraph')
    expect(displayMathLatexInBlock(block)).toBe('a^2+b^2')
    expect(blockTypeForNode(block.content)).toBe('paragraph')
  })
})
