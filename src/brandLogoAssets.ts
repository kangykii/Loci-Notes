export const LIGHT_BACKGROUND_LOGO_SRC = '/Updated Logo.png'
export const BLACK_BACKGROUND_LOGO_SRC = '/Updated Logo - Black.png'

type RgbColor = {
  r: number
  g: number
  b: number
  a: number
}

function parseCssColor(color: string): RgbColor | null {
  const normalized = color.trim().toLowerCase()
  if (!normalized || normalized === 'transparent') return null

  const rgbMatch = normalized.match(/^rgba?\((.+)\)$/)
  if (!rgbMatch) return null

  const parts = rgbMatch[1]
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length < 3) return null

  const [r, g, b] = parts.slice(0, 3).map((part) => Number.parseFloat(part))
  const a = parts[3] === undefined ? 1 : Number.parseFloat(parts[3])

  if (![r, g, b, a].every(Number.isFinite)) return null
  return { r, g, b, a }
}

function relativeLuminance({ r, g, b }: RgbColor) {
  const channels = [r, g, b].map((value) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

export function isBlackOrDarkBackground(color: string) {
  const parsed = parseCssColor(color)
  if (!parsed || parsed.a < 0.35) return false
  return relativeLuminance(parsed) < 0.12
}

export function logoSrcForBackground(color: string) {
  return isBlackOrDarkBackground(color) ? BLACK_BACKGROUND_LOGO_SRC : LIGHT_BACKGROUND_LOGO_SRC
}
