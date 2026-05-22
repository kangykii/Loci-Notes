import { CLAUDE_REQUIRED_MAX_TOKENS } from './providers'
import type { AITextRequest, AITextResponse, AIUsage } from './aiTypes'

function extractOpenAIText(data: { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }) {
  if (data.output_text) return data.output_text.trim()
  return (data.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim()
}

function extractUsage(data: {
  usage?: {
    input_tokens?: number
    output_tokens?: number
    prompt_tokens?: number
    completion_tokens?: number
    prompt_tokens_details?: { cached_tokens?: number }
    input_tokens_details?: { cached_tokens?: number }
  }
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    cachedContentTokenCount?: number
  }
  usage_metadata?: {
    prompt_token_count?: number
    candidates_token_count?: number
    cached_content_token_count?: number
  }
}): AIUsage {
  const usage = data.usage
  const camel = data.usageMetadata
  const snake = data.usage_metadata
  return {
    inputTokens: usage?.input_tokens ?? usage?.prompt_tokens ?? camel?.promptTokenCount ?? snake?.prompt_token_count,
    outputTokens: usage?.output_tokens ?? usage?.completion_tokens ?? camel?.candidatesTokenCount ?? snake?.candidates_token_count,
    cachedTokens:
      usage?.input_tokens_details?.cached_tokens ??
      usage?.prompt_tokens_details?.cached_tokens ??
      camel?.cachedContentTokenCount ??
      snake?.cached_content_token_count,
  }
}

export async function requestDirectAIText({
  providerId,
  provider,
  providerMeta,
  taskInstruction,
  userContent,
  promptCacheKey,
  temperature,
  maxTokens,
  signal,
}: AITextRequest): Promise<AITextResponse> {
  const apiKey = provider.apiKey.trim()
  if (!provider.enabled || !apiKey) throw new Error(`Missing ${providerMeta.name} API key.`)
  const generationConfig = {
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxTokens !== undefined ? { maxOutputTokens: maxTokens } : {}),
  }
  const openAIOptions = {
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxTokens !== undefined ? { max_output_tokens: maxTokens } : {}),
  }
  const chatOptions = {
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
  }

  let responseText: string | undefined
  let usage: AIUsage | undefined
  if (providerId === 'gemini') {
    const baseUrl = (provider.baseUrl || providerMeta.baseUrl).replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: taskInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userContent }] }],
        ...(Object.keys(generationConfig).length ? { generationConfig } : {}),
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.message ?? `${providerMeta.name} request failed`)
    responseText = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('').trim()
    usage = extractUsage(data)
  } else if (providerId === 'openai') {
    const baseUrl = (provider.baseUrl || providerMeta.baseUrl).replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal,
      body: JSON.stringify({
        model: provider.model,
        instructions: taskInstruction,
        input: userContent,
        prompt_cache_key: promptCacheKey ?? 'loci-notes-local',
        ...openAIOptions,
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.message ?? `${providerMeta.name} request failed`)
    responseText = extractOpenAIText(data)
    usage = extractUsage(data)
  } else {
    const baseUrl = (provider.baseUrl || providerMeta.baseUrl).replace(/\/$/, '')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }
    const body: Record<string, unknown> = {
      model: provider.model,
      ...chatOptions,
      messages: [
        { role: 'system', content: taskInstruction },
        { role: 'user', content: userContent },
      ],
    }
    let url = `${baseUrl}/chat/completions`
    if (providerId === 'claude') {
      url = `${baseUrl}/messages`
      headers['x-api-key'] = apiKey
      headers['anthropic-version'] = '2023-06-01'
      delete headers.Authorization
      body.max_tokens = maxTokens ?? CLAUDE_REQUIRED_MAX_TOKENS
      body.system = taskInstruction
      body.messages = [{ role: 'user', content: userContent }]
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify(body),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.message ?? `${providerMeta.name} request failed`)
    responseText =
      providerId === 'claude'
        ? data?.content?.map((part: { text?: string }) => part.text ?? '').join('').trim()
        : data?.choices?.[0]?.message?.content?.trim()
    usage = extractUsage(data)
  }

  if (!responseText) throw new Error(`${providerMeta.name} returned an empty response.`)
  return { providerId, providerMeta, responseText, usage }
}
