import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestDirectAIText } from './directAIClient'
import type { AIProviderSettings, ProviderMeta } from './aiTypes'
import { structuredOutputForTask } from './structuredSchemas'

const openAIResponsesParseMock = vi.hoisted(() => vi.fn())

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(function OpenAIMock() {
    return {
      responses: {
        parse: openAIResponsesParseMock,
      },
    }
  }),
}))

const signal = new AbortController().signal

function jsonResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response)
}

describe('direct AI client JSON response format', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    openAIResponsesParseMock.mockReset()
  })

  it('requests structured JSON output through OpenAI SDK Zod parsing', async () => {
    openAIResponsesParseMock.mockResolvedValue({
      output_parsed: { mode: 'create', columns: ['A'], rows: [['B']] },
      output_text: '',
      usage: { input_tokens: 3, output_tokens: 4 },
    })
    const provider: AIProviderSettings = { enabled: true, apiKey: 'sk-test', model: 'gpt-5.5', baseUrl: 'https://api.openai.com/v1' }
    const providerMeta: ProviderMeta = { id: 'openai', name: 'OpenAI', description: '', defaultModel: 'gpt-5.5', baseUrl: provider.baseUrl ?? '' }

    const result = await requestDirectAIText({
      providerId: 'openai',
      provider,
      providerMeta,
      taskInstruction: 'Return JSON.',
      userContent: 'test',
      responseFormat: 'json',
      structuredOutput: structuredOutputForTask('table_block'),
      signal,
    })

    const body = openAIResponsesParseMock.mock.calls[0]?.[0]
    expect(body.text.format).toMatchObject({
      type: 'json_schema',
      name: 'loci_table_block',
      strict: true,
    })
    expect(body.text.format.schema).toEqual(structuredOutputForTask('table_block')?.schema)
    expect(body.instructions).toContain('Return valid JSON only')
    expect(body.input).toContain('Return JSON for this request.')
    expect(result.responseText).toBe('{"mode":"create","columns":["A"],"rows":[["B"]]}')
  })

  it('omits unsupported temperature for OpenAI GPT-5 family models', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => jsonResponse({ output_text: 'Done' }))
    const provider: AIProviderSettings = { enabled: true, apiKey: 'sk-test', model: 'gpt-5.5', baseUrl: 'https://api.openai.com/v1' }
    const providerMeta: ProviderMeta = { id: 'openai', name: 'OpenAI', description: '', defaultModel: 'gpt-5.5', baseUrl: provider.baseUrl ?? '' }

    await requestDirectAIText({
      providerId: 'openai',
      provider,
      providerMeta,
      taskInstruction: 'Answer.',
      userContent: 'test',
      temperature: 0.4,
      maxTokens: 800,
      signal,
    })

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.temperature).toBeUndefined()
    expect(body.max_output_tokens).toBe(800)
  })

  it('requests JSON mime type from Gemini', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => jsonResponse({
      candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
    }))
    const provider: AIProviderSettings = { enabled: true, apiKey: 'test', model: 'gemini-3-flash-preview', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' }
    const providerMeta: ProviderMeta = { id: 'gemini', name: 'Google Gemini', description: '', defaultModel: provider.model, baseUrl: provider.baseUrl ?? '' }

    await requestDirectAIText({
      providerId: 'gemini',
      provider,
      providerMeta,
      taskInstruction: 'Return JSON.',
      userContent: 'test',
      responseFormat: 'json',
      structuredOutput: structuredOutputForTask('table_block'),
      signal,
    })

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.generationConfig.responseMimeType).toBe('application/json')
    expect(body.generationConfig.responseSchema).toEqual(structuredOutputForTask('table_block')?.schema)
  })

  it('forces a Claude tool call when structured output is available', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => jsonResponse({
      content: [{ type: 'tool_use', input: { mode: 'create', columns: ['A'], rows: [['B']] } }],
    }))
    const provider: AIProviderSettings = { enabled: true, apiKey: 'test', model: 'claude-sonnet-4-6', baseUrl: 'https://api.anthropic.com/v1' }
    const providerMeta: ProviderMeta = { id: 'claude', name: 'Claude', description: '', defaultModel: provider.model, baseUrl: provider.baseUrl ?? '' }

    const result = await requestDirectAIText({
      providerId: 'claude',
      provider,
      providerMeta,
      taskInstruction: 'Return JSON.',
      userContent: 'test',
      responseFormat: 'json',
      structuredOutput: structuredOutputForTask('table_block'),
      signal,
    })

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.tools[0].input_schema).toEqual(structuredOutputForTask('table_block')?.schema)
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'loci_table_block' })
    expect(JSON.parse(result.responseText)).toEqual({ mode: 'create', columns: ['A'], rows: [['B']] })
  })
})
