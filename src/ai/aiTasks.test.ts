import { describe, expect, it } from 'vitest'
import { parseAIDocumentPatch, parseAIJson, routeAITask, taskResponseFormat } from './aiTasks'

describe('routeAITask', () => {
  it('routes creation prompts to generate_insert instead of app_help', () => {
    expect(routeAITask('create a new section', false)).toBe('generate_insert')
    expect(routeAITask('how do I create a project', false)).toBe('app_help')
    expect(routeAITask('create a table', false)).toBe('table_block')
  })

  it('routes critique prompts to critique_writing', () => {
    expect(routeAITask('critique my introduction', false)).toBe('critique_writing')
    expect(routeAITask('grade this paragraph', true)).toBe('critique_writing')
  })
})

describe('AI composer tasks', () => {
  it('routes interactive artifact prompts to compose_blocks', () => {
    expect(routeAITask('make an interactive budget tracker', false)).toBe('compose_blocks')
    expect(routeAITask('build a Python terminal block', false)).toBe('compose_blocks')
  })

  it('parses a mixed document patch', () => {
    const patch = parseAIDocumentPatch(JSON.stringify({
      intent: 'insert',
      operations: [
        { type: 'heading', text: 'Budget', level: 2 },
        { type: 'paragraph', text: 'Track weekly spending.' },
        {
          type: 'aiBlock',
          attrs: {
            prompt: 'Make a budget tracker',
            sourceKind: 'html',
            source: '<div>Budget</div>',
            artifact: {
              version: 1,
              kind: 'html',
              title: 'Budget tracker',
              html: '<main><h1>Budget</h1><button>Save</button></main>',
            },
            data: {},
            status: 'ready',
            revision: 1,
          },
        },
      ],
    }))

    expect(patch.operations).toHaveLength(3)
    expect(patch.operations[2]).toMatchObject({
      type: 'aiBlock',
      attrs: {
        sourceKind: 'html',
        artifact: { kind: 'html', title: 'Budget tracker' },
      },
    })
  })

  it('salvages source-only html AI-Block attrs into an artifact', () => {
    const html = '<div class="weather-widget"><style>.weather-widget{color:#172033;}</style><p>Today</p></div>'
    const patch = parseAIDocumentPatch(JSON.stringify({
      intent: 'insert',
      operations: [{
        type: 'aiBlock',
        attrs: {
          id: 'weather-dashboard',
          prompt: 'make me a dashboard block that shows the weather of the day',
          sourceKind: 'html',
          source: html,
        },
      }],
    }))

    expect(patch.operations[0]).toMatchObject({
      type: 'aiBlock',
      attrs: {
        id: 'weather-dashboard',
        sourceKind: 'html',
        artifact: {
          kind: 'html',
          html,
        },
      },
    })
  })

  it('rejects empty or malformed document patches', () => {
    expect(() => parseAIDocumentPatch('{"intent":"insert","operations":[]}')).toThrow(/at least one/)
    expect(() => parseAIDocumentPatch('not json')).toThrow()
  })

  it('selects json response format for structured tasks only', () => {
    expect(taskResponseFormat('compose_blocks')).toBe('json')
    expect(taskResponseFormat('table_block')).toBe('json')
    expect(taskResponseFormat('flashcard_short_answer_mark')).toBe('json')
    expect(taskResponseFormat('code_block')).toBe('text')
    expect(taskResponseFormat('generate_insert')).toBe('text')
  })

  it('parses json from fences, surrounding text, arrays, and escaped braces', () => {
    expect(parseAIJson('```json\n{"ok":true}\n```')).toEqual({ ok: true })
    expect(parseAIJson('Here is the patch:\n{"text":"brace in string: }","nested":{"ok":true}}\nDone.')).toEqual({
      text: 'brace in string: }',
      nested: { ok: true },
    })
    expect(parseAIJson('prefix [{"type":"paragraph"}] suffix')).toEqual([{ type: 'paragraph' }])
  })
})
