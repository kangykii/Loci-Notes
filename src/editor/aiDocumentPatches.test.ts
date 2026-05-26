import { describe, expect, it } from 'vitest'
import { parseAIDocumentPatch } from '../ai/aiTasks'
import { blocksFromAIDocumentPatch } from './aiDocumentPatches'

describe('blocksFromAIDocumentPatch', () => {
  it('converts mixed patch operations into stable Loci blocks', () => {
    const patch = parseAIDocumentPatch(JSON.stringify({
      intent: 'insert',
      operations: [
        { type: 'heading', text: 'Plan', level: 2 },
        { type: 'list', listType: 'checklist', items: ['Draft', 'Review'] },
        {
          type: 'aiBlock',
          attrs: {
            artifact: { version: 1, kind: 'html', title: 'Tool', html: '<p>Tool</p>' },
            status: 'ready',
            revision: 1,
          },
        },
      ],
    }))

    const blocks = blocksFromAIDocumentPatch(patch)
    expect(blocks.map((block) => block.type)).toEqual(['heading', 'checklist', 'aiBlock'])
    expect(blocks[2].content.content?.[0]?.type).toBe('lociAIBlock')
  })
})
