import { describe, expect, it } from 'vitest'
import {
  findOptionalPropertiesInStructuredSchema,
  structuredOutputForTask,
  structuredTaskNames,
  validateStructuredTaskValue,
} from './structuredSchemas'

describe('structured AI task schemas', () => {
  it('defines schemas for every structured JSON task', () => {
    expect(structuredTaskNames().sort()).toEqual([
      'compose_blocks',
      'flashcard_quiz',
      'flashcard_short_answer_mark',
      'latex_block',
      'list_block',
      'quote_block',
      'table_block',
    ].sort())
    expect(structuredOutputForTask('compose_blocks')?.schema).toMatchObject({
      type: 'object',
      required: ['intent', 'operations'],
    })
  })

  it('rejects malformed document patches and unsupported operations', () => {
    expect(validateStructuredTaskValue('compose_blocks', { intent: 'insert' })).toEqual({
      ok: false,
      error: 'Document patch needs operations.',
    })
    expect(validateStructuredTaskValue('compose_blocks', { intent: 'insert', operations: [{ type: 'video' }] })).toEqual({
      ok: false,
      error: 'Document patch includes an unsupported operation.',
    })
  })

  it('accepts valid AI-Block HTML operations for downstream app validation', () => {
    expect(validateStructuredTaskValue('compose_blocks', {
      intent: 'insert',
      operations: [{
        type: 'aiBlock',
        attrs: {
          prompt: 'make a tracker',
          sourceKind: 'html',
          source: '<main></main>',
          artifact: { version: 1, kind: 'html', title: 'Tracker', html: '<main></main>' },
        },
      }],
    })).toEqual({ ok: true })
  })

  it('accepts source-only AI-Block HTML operations for parser salvage', () => {
    expect(validateStructuredTaskValue('compose_blocks', {
      intent: 'insert',
      operations: [{
        type: 'aiBlock',
        attrs: {
          id: 'weather-dashboard',
          prompt: 'make me a dashboard block that shows the weather of the day',
          sourceKind: 'html',
          source: '<div>Weather</div>',
        },
      }],
    })).toEqual({ ok: true })
  })

  it('generates OpenAI-compatible strict schemas without optional properties', () => {
    for (const taskName of structuredTaskNames()) {
      expect(findOptionalPropertiesInStructuredSchema(structuredOutputForTask(taskName as never)?.schema)).toEqual([])
    }
  })
})
