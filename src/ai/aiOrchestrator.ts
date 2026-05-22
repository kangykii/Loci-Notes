import { requestDirectAIText } from './directAIClient'
import { requestGatewayAIText } from './gatewayAIClient'
import type { AIContextItem, AIContextManifest, AITextRequest, AITextResponse, AITransportMode } from './aiTypes'

const MAX_AI_CONTEXT_CHARS = 24_000

export type AIContextDraftItem = Omit<AIContextItem, 'charCount'> & {
  content: string
}

export type AIContextBuildResult = {
  text: string
  manifest: AIContextManifest
}

export function buildAIContextFromPolicy(items: AIContextDraftItem[], transportMode: AITransportMode): AIContextBuildResult {
  const manifestItems: AIContextItem[] = []
  const includedParts: string[] = []
  let totalChars = 0

  for (const item of items) {
    const content = item.content.trim()
    const charCount = content.length
    manifestItems.push({
      id: item.id,
      label: item.label,
      charCount,
      sensitivity: item.sensitivity,
      enabledByPolicy: item.enabledByPolicy,
    })
    if (!item.enabledByPolicy || !content) continue
    if (totalChars + charCount > MAX_AI_CONTEXT_CHARS) continue
    includedParts.push(content)
    totalChars += charCount
  }

  return {
    text: includedParts.join('\n\n'),
    manifest: {
      transportMode,
      totalChars,
      items: manifestItems,
    },
  }
}

export async function requestAITextWithPolicy(request: AITextRequest): Promise<AITextResponse> {
  const transportMode = request.transportMode ?? 'directByok'
  if (request.userContent.length > MAX_AI_CONTEXT_CHARS + 8_000) {
    throw new Error('AI request is too large. Reduce the selected text or note context and try again.')
  }
  if (request.contextManifest && request.contextManifest.transportMode !== transportMode) {
    throw new Error('AI context manifest transport does not match the selected AI transport.')
  }

  if (transportMode === 'gateway') {
    return await requestGatewayAIText({
      providerId: request.providerId,
      model: request.provider.model,
      taskInstruction: request.taskInstruction,
      userContent: request.userContent,
      promptCacheKey: request.promptCacheKey,
      contextManifest: request.contextManifest,
      providerMeta: request.providerMeta,
      signal: request.signal,
    })
  }

  if (transportMode === 'local') {
    throw new Error('Local AI transport is not configured yet.')
  }

  return await requestDirectAIText(request)
}
