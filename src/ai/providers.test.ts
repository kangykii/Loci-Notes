import { describe, expect, it } from 'vitest'
import { migrateProviderDefaultModel, providerDefaultModel } from './providers'

describe('AI provider defaults', () => {
  it('uses current default models', () => {
    expect(providerDefaultModel('openai')).toBe('gpt-5.5')
    expect(providerDefaultModel('gemini')).toBe('gemini-3-flash-preview')
    expect(providerDefaultModel('claude')).toBe('claude-sonnet-4-6')
    expect(providerDefaultModel('kimi')).toBe('kimi-k2.6')
  })

  it('migrates exact old defaults and preserves custom model names', () => {
    expect(migrateProviderDefaultModel('openai', 'gpt-5.2')).toBe('gpt-5.5')
    expect(migrateProviderDefaultModel('gemini', 'gemini-2.5-flash')).toBe('gemini-3-flash-preview')
    expect(migrateProviderDefaultModel('claude', 'claude-sonnet-4-20250514')).toBe('claude-sonnet-4-6')
    expect(migrateProviderDefaultModel('openai', 'my-custom-model')).toBe('my-custom-model')
  })
})
