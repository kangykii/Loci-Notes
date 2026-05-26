import { createId, nowIso } from '../db'
import { isRecord } from '../utils/isRecord'

export const AI_BLOCK_ARTIFACT_VERSION = 1
export const AI_BLOCK_TEXT_LIMIT = 400
export const AI_BLOCK_SOURCE_LIMIT = 20000
export const AI_BLOCK_DATA_LIMIT = 8000
export const AI_BLOCK_HTML_LIMIT = 60000

export type AIBlockStatus = 'ready' | 'invalid' | 'error'
export type AIBlockSourceKind = 'placeholder' | 'html'

export type AIBlockPlaceholderArtifact = {
  version: typeof AI_BLOCK_ARTIFACT_VERSION
  kind: 'placeholder'
  title: string
  body: string
}

export type AIBlockHtmlArtifact = {
  version: typeof AI_BLOCK_ARTIFACT_VERSION
  kind: 'html'
  title: string
  html: string
}

export type AIBlockArtifact = AIBlockPlaceholderArtifact | AIBlockHtmlArtifact

export type AIBlockAttrs = {
  id: string
  prompt: string
  sourceKind: AIBlockSourceKind
  source: string
  artifact: AIBlockArtifact
  data: Record<string, unknown>
  status: AIBlockStatus
  revision: number
  createdAt: string
  updatedAt: string
  error: string
}

export type AIBlockValidation =
  | { ok: true; attrs: AIBlockAttrs }
  | { ok: false; attrs: AIBlockAttrs; reason: string }

function clampText(value: unknown, fallback: string, limit = AI_BLOCK_TEXT_LIMIT) {
  const text = typeof value === 'string' ? value.trim() : fallback
  return text.slice(0, limit)
}

function jsonSize(value: unknown) {
  try {
    return JSON.stringify(value).length
  } catch {
    return Infinity
  }
}

function isSmallJsonObject(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  try {
    return JSON.stringify(value).length <= AI_BLOCK_DATA_LIMIT
  } catch {
    return false
  }
}

function normalizedIso(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback
}

export function defaultAIBlockArtifact(): AIBlockPlaceholderArtifact {
  return {
    version: AI_BLOCK_ARTIFACT_VERSION,
    kind: 'placeholder',
    title: 'AI-Block',
    body: 'This is the safe AI-Block artifact shell. Future AI-built mini-documents will run inside this boundary.',
  }
}

export function fallbackAIBlockAttrs(reason = 'Unsupported AI-Block'): AIBlockAttrs {
  const now = nowIso()
  return {
    id: createId('ai_block'),
    prompt: '',
    sourceKind: 'placeholder',
    source: '',
    artifact: defaultAIBlockArtifact(),
    data: {},
    status: 'invalid',
    revision: 1,
    createdAt: now,
    updatedAt: now,
    error: clampText(reason, 'Unsupported AI-Block'),
  }
}

export function createAIBlockAttrs(input: Partial<AIBlockAttrs> = {}): AIBlockAttrs {
  const now = nowIso()
  const source = typeof input.source === 'string' ? input.source : ''
  const sourceKind = input.sourceKind === 'html' ? 'html' : input.sourceKind === 'placeholder' ? 'placeholder' : undefined
  const artifact = input.artifact ?? (
    sourceKind === 'html' && source.trim()
      ? {
          version: AI_BLOCK_ARTIFACT_VERSION,
          kind: 'html' as const,
          title: clampText(input.prompt, 'AI-Block'),
          html: source,
        }
      : defaultAIBlockArtifact()
  )
  return validateAIBlockAttrs({
    id: input.id ?? createId('ai_block'),
    prompt: input.prompt ?? '',
    sourceKind: input.sourceKind ?? artifact.kind,
    source,
    artifact,
    data: input.data ?? {},
    status: input.status ?? 'ready',
    revision: input.revision ?? 1,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    error: input.error ?? '',
  }).attrs
}

export function validateAIBlockAttrs(input: unknown): AIBlockValidation {
  if (!isRecord(input)) {
    const attrs = fallbackAIBlockAttrs('AI-Block attrs must be an object.')
    return { ok: false, attrs, reason: attrs.error }
  }

  const artifact = input.artifact
  if (!isRecord(artifact)) {
    const attrs = fallbackAIBlockAttrs('AI-Block artifact must be an object.')
    return { ok: false, attrs, reason: attrs.error }
  }

  if (artifact.version !== AI_BLOCK_ARTIFACT_VERSION || (artifact.kind !== 'placeholder' && artifact.kind !== 'html')) {
    const attrs = fallbackAIBlockAttrs('AI-Block artifact is not supported.')
    return { ok: false, attrs, reason: attrs.error }
  }

  if (jsonSize(artifact) > AI_BLOCK_HTML_LIMIT) {
    const attrs = fallbackAIBlockAttrs('AI-Block artifact is too large.')
    return { ok: false, attrs, reason: attrs.error }
  }

  const createdAt = normalizedIso(input.createdAt, nowIso())
  const updatedAt = normalizedIso(input.updatedAt, createdAt)
  const title = clampText(artifact.title ?? input.prompt, 'AI-Block')
  const status: AIBlockStatus = input.status === 'invalid' || input.status === 'error' ? input.status : 'ready'
  const revision = Number.isFinite(Number(input.revision)) ? Math.max(1, Math.floor(Number(input.revision))) : 1
  const sourceKind: AIBlockSourceKind = artifact.kind === 'html' ? 'html' : 'placeholder'
  const normalizedArtifact: AIBlockArtifact = artifact.kind === 'html'
    ? {
        version: AI_BLOCK_ARTIFACT_VERSION,
        kind: 'html',
        title,
        html: clampText(artifact.html, '', AI_BLOCK_HTML_LIMIT),
      }
    : {
        version: AI_BLOCK_ARTIFACT_VERSION,
        kind: 'placeholder',
        title,
        body: clampText(artifact.body, defaultAIBlockArtifact().body, AI_BLOCK_TEXT_LIMIT),
      }

  return {
    ok: true,
    attrs: {
      id: clampText(input.id, createId('ai_block'), 120),
      prompt: clampText(input.prompt, '', AI_BLOCK_SOURCE_LIMIT),
      sourceKind,
      source: clampText(input.source, '', AI_BLOCK_SOURCE_LIMIT),
      artifact: normalizedArtifact,
      data: isSmallJsonObject(input.data) ? input.data : {},
      status,
      revision,
      createdAt,
      updatedAt,
      error: clampText(input.error, ''),
    },
  }
}

export function aiBlockPreview(attrs: unknown) {
  const validation = validateAIBlockAttrs(attrs)
  if (!validation.ok) return validation.attrs.error
  const { artifact, error, status } = validation.attrs
  if (status !== 'ready') return error || artifact.title
  if (artifact.kind === 'html') return `${artifact.title} - HTML artifact`
  return [artifact.title, artifact.body].filter(Boolean).join(' - ')
}
