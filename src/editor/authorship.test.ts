import { describe, expect, it } from 'vitest'
import type { JSONContent } from '../db'
import { applyAuthorshipToContent } from './authorship'

const attrs = {
  kind: 'copied' as const,
  createdAt: '2026-05-22T00:00:00.000Z',
  source: 'ai' as const,
}

function textNodes(content: JSONContent): JSONContent[] {
  if (content.type === 'text') return [content]
  return (content.content ?? []).flatMap(textNodes)
}

describe('applyAuthorshipToContent', () => {
  it('marks plain text as non-authored', () => {
    const result = applyAuthorshipToContent({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Generated draft' }] }],
    }, attrs)

    expect(textNodes(result)[0].marks).toEqual([{ type: 'authorship', attrs }])
  })

  it('preserves existing marks while adding authorship', () => {
    const result = applyAuthorshipToContent({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: 'Linked draft',
          marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
        }],
      }],
    }, attrs)

    expect(textNodes(result)[0].marks).toEqual([
      { type: 'link', attrs: { href: 'https://example.com' } },
      { type: 'authorship', attrs },
    ])
  })

  it('replaces stale authorship marks', () => {
    const result = applyAuthorshipToContent({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: 'Pasted again',
          marks: [
            { type: 'authorship', attrs: { kind: 'copied', createdAt: 'old', source: 'manual-mark' } },
            { type: 'highlight', attrs: { color: '#fff2a8' } },
          ],
        }],
      }],
    }, attrs)

    expect(textNodes(result)[0].marks).toEqual([
      { type: 'highlight', attrs: { color: '#fff2a8' } },
      { type: 'authorship', attrs },
    ])
  })

  it('marks nested block text', () => {
    const result = applyAuthorshipToContent({
      type: 'doc',
      content: [{
        type: 'table',
        content: [{
          type: 'tableRow',
          content: [{
            type: 'tableCell',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cell draft' }] }],
          }],
        }],
      }],
    }, attrs)

    expect(textNodes(result).map((node) => node.marks)).toEqual([[{ type: 'authorship', attrs }]])
  })
})
