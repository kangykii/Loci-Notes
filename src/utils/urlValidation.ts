const LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const IMAGE_PROTOCOLS = new Set(['http:', 'https:'])
const IMAGE_DATA_PATTERN = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i

function safeParseUrl(input: string) {
  const trimmed = input.trim()
  if (!trimmed || trimmed.startsWith('//')) return null

  try {
    return new URL(trimmed)
  } catch {
    return null
  }
}

export function sanitizeLinkUrl(input: string): string | null {
  const parsed = safeParseUrl(input)
  if (!parsed || !LINK_PROTOCOLS.has(parsed.protocol)) return null
  return parsed.href
}

export function sanitizeImageUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (IMAGE_DATA_PATTERN.test(trimmed)) return trimmed.replace(/\s+/g, '')

  const parsed = safeParseUrl(trimmed)
  if (!parsed || !IMAGE_PROTOCOLS.has(parsed.protocol)) return null
  return parsed.href
}

export function isAllowedLinkUrl(input: string) {
  return sanitizeLinkUrl(input) !== null
}

export function isAllowedImageUrl(input: string) {
  return sanitizeImageUrl(input) !== null
}
