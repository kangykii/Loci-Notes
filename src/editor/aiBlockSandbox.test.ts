import { describe, expect, it } from 'vitest'
import { isAIBlockBridgeMessage } from './aiBlockSandbox'

describe('AI-Block sandbox bridge', () => {
  it('validates bridge messages by nonce', () => {
    expect(isAIBlockBridgeMessage({
      source: 'loci-ai-block',
      nonce: 'block:abc',
      type: 'height',
      payload: { height: 320 },
    }, 'block:abc')).toBe(true)

    expect(isAIBlockBridgeMessage({
      source: 'loci-ai-block',
      nonce: 'wrong',
      type: 'height',
      payload: { height: 320 },
    }, 'block:abc')).toBe(false)
  })
})
