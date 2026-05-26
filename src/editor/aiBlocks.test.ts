import { describe, expect, it } from 'vitest'
import {
  aiBlockPreview,
  createAIBlockAttrs,
  defaultAIBlockArtifact,
  fallbackAIBlockAttrs,
  validateAIBlockAttrs,
} from './aiBlocks'

describe('AI-Block validation', () => {
  it('accepts the placeholder artifact used by the sandbox skeleton', () => {
    const attrs = createAIBlockAttrs()
    const result = validateAIBlockAttrs(attrs)

    expect(result.ok).toBe(true)
    expect(result.attrs).toMatchObject({
      sourceKind: 'placeholder',
      status: 'ready',
      revision: 1,
      artifact: defaultAIBlockArtifact(),
    })
  })

  it('fails closed for unsupported artifacts', () => {
    const result = validateAIBlockAttrs({
      id: 'bad',
      prompt: 'Make unsupported artifact',
      sourceKind: 'reactSpec',
      source: '{"component":"Bad"}',
      artifact: { version: 1, kind: 'reactSpec', component: 'Bad' },
      data: {},
      status: 'ready',
      revision: 1,
      createdAt: '2026-05-22T00:00:00.000Z',
      updatedAt: '2026-05-22T00:00:00.000Z',
      error: '',
    })

    expect(result.ok).toBe(false)
    expect(result.attrs).toMatchObject({
      sourceKind: 'placeholder',
      status: 'invalid',
    })
  })

  it('uses safe preview text for valid and invalid attrs', () => {
    expect(aiBlockPreview(createAIBlockAttrs({
      artifact: { version: 1, kind: 'placeholder', title: 'Budget tracker', body: 'Safe artifact shell only' },
    }))).toBe('Budget tracker - Safe artifact shell only')

    expect(aiBlockPreview(fallbackAIBlockAttrs('Nope'))).toBe('Nope')
  })

  it('accepts sandboxed HTML artifacts', () => {
    const result = validateAIBlockAttrs(createAIBlockAttrs({
      prompt: 'Build a calculator',
      source: '<button>1</button>',
      artifact: {
        version: 1,
        kind: 'html',
        title: 'Calculator',
        html: '<section><button>1</button></section>',
      },
    }))

    expect(result.ok).toBe(true)
    expect(result.attrs.sourceKind).toBe('html')
    expect(aiBlockPreview(result.attrs)).toBe('Calculator - HTML artifact')
  })
})
