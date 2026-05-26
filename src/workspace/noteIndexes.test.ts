import { describe, expect, it } from 'vitest'

import type { Note } from '../db'
import { createNoteIndexes, patchNoteIndexes, createEmptyNoteIndexes } from './noteIndexes'

const baseNote = (id: string, projectId: string, text: string): Note => ({
  id,
  title: id,
  projectId,
  templateId: 'blank',
  templateData: { kind: 'blank', body: { type: 'doc', content: [] } },
  author: 'test',
  tags: [],
  content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
})

describe('noteIndexes', () => {
  it('patches a single note without rebuilding the full corpus', () => {
    const cache = new Map()
    const indexes = createNoteIndexes([
      baseNote('a', 'p1', 'hello'),
      baseNote('b', 'p1', 'world'),
    ], cache)
    const updated = baseNote('a', 'p1', 'hello updated')
    patchNoteIndexes(indexes, baseNote('a', 'p1', 'hello'), updated, cache)
    expect(indexes.noteTextById.get('a')).toContain('updated')
    expect(indexes.noteTextById.get('b')).toBe('world')
    expect(indexes.notesByProjectId.get('p1')?.map((note) => note.id)).toEqual(['a', 'b'])
  })

  it('creates empty indexes', () => {
    const indexes = createEmptyNoteIndexes()
    expect(indexes.noteTextById.size).toBe(0)
  })
})
