const LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const IMAGE_PROTOCOLS = new Set(['http:', 'https:'])
const IMAGE_DATA_PATTERN = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i
const TRUSTED_DOWNLOAD_HOSTS = new Set(['github.com'])
const TRUSTED_GITHUB_DOWNLOAD_PATH = /^\/kangykii\/Loci-Notes\/releases\/download\/[^/]+\/(?:Loci-Notes-Setup-[^/]+-x64|Loci(?:%20|\.)Notes_[^/]+_x64-setup)\.exe$/i

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

export function sanitizeTrustedDownloadUrl(input: string): string | null {
  const parsed = safeParseUrl(input)
  if (!parsed || parsed.protocol !== 'https:' || !TRUSTED_DOWNLOAD_HOSTS.has(parsed.hostname)) return null
  if (!TRUSTED_GITHUB_DOWNLOAD_PATH.test(parsed.pathname)) return null
  return parsed.href
}
