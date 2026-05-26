import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
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

function extractClaudeText(data: { content?: Array<{ type?: string; text?: string; input?: unknown }> }) {
  const toolInput = (data.content ?? []).find((part) => part.type === 'tool_use' && part.input !== undefined)?.input
  if (toolInput !== undefined) return JSON.stringify(toolInput)
  return (data.content ?? []).map((part) => part.text ?? '').join('').trim()
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

function openAISupportsTemperature(model: string) {
  return !/^gpt-5(?:\.|$|-)/i.test(model.trim())
}

function openAITextFormat(responseFormat: AITextRequest['responseFormat']) {
  if (responseFormat !== 'json') return {}
  return {
    text: {
      format: {
        type: 'json_object',
      },
    },
  }
}

function jsonTaskInstruction(taskInstruction: string) {
  return `${taskInstruction}\n\nReturn valid JSON only. Do not wrap it in markdown fences or include explanatory text.`
}

export async function requestDirectAIText({
  providerId,
  provider,
  providerMeta,
  taskInstruction,
  userContent,
  promptCacheKey,
  responseFormat,
  structuredOutput,
  temperature,
  maxTokens,
  signal,
}: AITextRequest): Promise<AITextResponse> {
  const apiKey = provider.apiKey.trim()
  if (!provider.enabled || !apiKey) throw new Error(`Missing ${providerMeta.name} API key.`)
  const generationConfig = {
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxTokens !== undefined ? { maxOutputTokens: maxTokens } : {}),
    ...(responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
    ...(structuredOutput ? { responseSchema: structuredOutput.schema } : {}),
  }
  const openAIOptions = {
    ...(temperature !== undefined && openAISupportsTemperature(provider.model) ? { temperature } : {}),
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
    const openAIInstruction = responseFormat === 'json' ? jsonTaskInstruction(taskInstruction) : taskInstruction
    const openAIInput = responseFormat === 'json' ? `Return JSON for this request.\n\n${userContent}` : userContent
    if (structuredOutput) {
      const client = new OpenAI({
        apiKey,
        baseURL: baseUrl,
        dangerouslyAllowBrowser: true,
      })
      const response = await client.responses.parse({
        model: provider.model,
        instructions: openAIInstruction,
        input: openAIInput,
        prompt_cache_key: promptCacheKey ?? 'loci-notes-local',
        text: {
          format: zodTextFormat(structuredOutput.zodSchema, structuredOutput.name),
        },
        ...openAIOptions,
      }, { signal })
      if (response.output_parsed === null || response.output_parsed === undefined) {
        responseText = response.output_text?.trim()
      } else {
        responseText = JSON.stringify(response.output_parsed)
      }
      usage = extractUsage(response)
    } else {
      const response = await fetch(`${baseUrl}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal,
        body: JSON.stringify({
          model: provider.model,
          instructions: openAIInstruction,
          input: openAIInput,
          prompt_cache_key: promptCacheKey ?? 'loci-notes-local',
          ...openAITextFormat(responseFormat),
          ...openAIOptions,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? `${providerMeta.name} request failed`)
      responseText = extractOpenAIText(data)
      usage = extractUsage(data)
    }
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
        { role: 'system', content: responseFormat === 'json' ? jsonTaskInstruction(taskInstruction) : taskInstruction },
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
      body.system = responseFormat === 'json' ? jsonTaskInstruction(taskInstruction) : taskInstruction
      body.messages = [{ role: 'user', content: userContent }]
      if (structuredOutput) {
        body.tools = [{
          name: structuredOutput.name,
          description: 'Return the structured JSON result for this Loci Notes task.',
          input_schema: structuredOutput.schema,
        }]
        body.tool_choice = { type: 'tool', name: structuredOutput.name }
      }
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
        ? extractClaudeText(data)
        : data?.choices?.[0]?.message?.content?.trim()
    usage = extractUsage(data)
  }

  if (!responseText) throw new Error(`${providerMeta.name} returned an empty response.`)
  return { providerId, providerMeta, responseText, usage }
}
