import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import './auroraMicaSurface.css'

type AuroraMicaSurfaceVariant = 'default' | 'projects' | 'atoms' | 'community' | 'sidebar'

type AuroraMicaSurfaceProps = {
  children: ReactNode
  className?: string
  active?: boolean
  reduceMotion?: boolean
  layoutTransitioning?: boolean
  variant?: AuroraMicaSurfaceVariant
}

const REVEAL_DELAY_MS = 2200

type WeightedOption<T> = {
  value: T
  weight: number
}

type BloomColour = {
  color: string
  accent: string
}

type BloomAnchor = {
  x: [number, number]
  y: [number, number]
}

type BloomStyle = CSSProperties & {
  '--aurora-bloom-x': string
  '--aurora-bloom-y': string
  '--aurora-hop-x-1': string
  '--aurora-hop-y-1': string
  '--aurora-hop-x-2': string
  '--aurora-hop-y-2': string
  '--aurora-hop-x-3': string
  '--aurora-hop-y-3': string
  '--aurora-bloom-size-x': string
  '--aurora-bloom-size-y': string
  '--aurora-bloom-color': string
  '--aurora-bloom-accent': string
  '--aurora-bloom-opacity': string
  '--aurora-bloom-duration': string
}

type Bloom = {
  id: string
  style: BloomStyle
}

const BLOOM_COUNT_OPTIONS: Array<WeightedOption<number>> = [
  { value: 1, weight: 35 },
  { value: 2, weight: 45 },
  { value: 3, weight: 20 },
]

const SIDEBAR_BLOOM_COUNT_OPTIONS: Array<WeightedOption<number>> = [
  { value: 2, weight: 65 },
  { value: 3, weight: 35 },
]

const BLOOM_COLOUR_OPTIONS: Array<WeightedOption<BloomColour>> = [
  { value: { color: 'rgba(89, 111, 184, 0.26)', accent: 'rgba(103, 158, 163, 0.14)' }, weight: 14 },
  { value: { color: 'rgba(103, 158, 163, 0.25)', accent: 'rgba(89, 111, 184, 0.13)' }, weight: 13 },
  { value: { color: 'rgba(126, 151, 128, 0.26)', accent: 'rgba(146, 205, 194, 0.12)' }, weight: 13 },
  { value: { color: 'rgba(105, 174, 138, 0.24)', accent: 'rgba(103, 158, 163, 0.12)' }, weight: 12 },
  { value: { color: 'rgba(146, 205, 194, 0.21)', accent: 'rgba(126, 151, 128, 0.12)' }, weight: 11 },
  { value: { color: 'rgba(132, 116, 169, 0.21)', accent: 'rgba(178, 126, 154, 0.11)' }, weight: 8 },
  { value: { color: 'rgba(158, 135, 196, 0.19)', accent: 'rgba(103, 158, 163, 0.1)' }, weight: 7 },
  { value: { color: 'rgba(178, 126, 154, 0.18)', accent: 'rgba(132, 116, 169, 0.11)' }, weight: 7 },
  { value: { color: 'rgba(187, 160, 99, 0.17)', accent: 'rgba(126, 151, 128, 0.1)' }, weight: 6 },
  { value: { color: 'rgba(213, 176, 84, 0.14)', accent: 'rgba(105, 174, 138, 0.084)' }, weight: 3 },
  { value: { color: 'rgba(198, 104, 92, 0.13)', accent: 'rgba(187, 160, 99, 0.078)' }, weight: 2 },
  { value: { color: 'rgba(154, 194, 72, 0.14)', accent: 'rgba(146, 205, 194, 0.076)' }, weight: 2 },
  { value: { color: 'rgba(196, 119, 180, 0.14)', accent: 'rgba(103, 158, 163, 0.076)' }, weight: 1 },
  { value: { color: 'rgba(220, 144, 108, 0.13)', accent: 'rgba(178, 126, 154, 0.072)' }, weight: 1 },
]

const BLOOM_ANCHORS: BloomAnchor[] = [
  { x: [34, 62], y: [12, 28] },
  { x: [8, 30], y: [28, 54] },
  { x: [66, 92], y: [26, 56] },
  { x: [36, 66], y: [58, 82] },
  { x: [12, 34], y: [58, 84] },
  { x: [68, 90], y: [58, 84] },
  { x: [18, 42], y: [14, 36] },
  { x: [58, 84], y: [14, 38] },
]

const SIDEBAR_LEFT_ANCHORS: BloomAnchor[] = [
  { x: [0, 18], y: [12, 36] },
  { x: [4, 24], y: [36, 66] },
  { x: [0, 20], y: [62, 90] },
]

const SIDEBAR_RIGHT_ANCHORS: BloomAnchor[] = [
  { x: [80, 104], y: [10, 34] },
  { x: [76, 102], y: [34, 66] },
  { x: [82, 106], y: [62, 90] },
]

const SIDEBAR_MIXED_ANCHORS = [...SIDEBAR_LEFT_ANCHORS, ...SIDEBAR_RIGHT_ANCHORS]

function randomNumber(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function randomPercent(min: number, max: number) {
  return `${Math.round(randomNumber(min, max))}%`
}

function weightedPick<T>(options: Array<WeightedOption<T>>): T {
  const total = options.reduce((sum, option) => sum + option.weight, 0)
  let ticket = Math.random() * total
  for (const option of options) {
    ticket -= option.weight
    if (ticket <= 0) return option.value
  }
  return options[options.length - 1].value
}

function pointDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function randomPointFromAnchors(anchors: BloomAnchor[], existing: Array<{ x: number; y: number }> = [], minDistance = 22) {
  let nextPoint = { x: 50, y: 42 }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const anchor = anchors[Math.floor(Math.random() * anchors.length)]
    const candidate = {
      x: Math.round(randomNumber(anchor.x[0], anchor.x[1])),
      y: Math.round(randomNumber(anchor.y[0], anchor.y[1])),
    }
    nextPoint = candidate
    if (existing.every((point) => pointDistance(candidate, point) >= minDistance)) break
  }
  return nextPoint
}

function anchorsForBloom(variant: AuroraMicaSurfaceVariant, index: number) {
  if (variant !== 'sidebar') return BLOOM_ANCHORS
  if (index === 0) return SIDEBAR_LEFT_ANCHORS
  if (index === 1) return SIDEBAR_RIGHT_ANCHORS
  return SIDEBAR_MIXED_ANCHORS
}

function createBloomComposition(variant: AuroraMicaSurfaceVariant): Bloom[] {
  const bloomCount = variant === 'sidebar'
    ? weightedPick(SIDEBAR_BLOOM_COUNT_OPTIONS)
    : weightedPick(BLOOM_COUNT_OPTIONS)
  const points: Array<{ x: number; y: number }> = []

  return Array.from({ length: bloomCount }, (_, index) => {
    const anchorPool = anchorsForBloom(variant, index)
    const nextPoint = randomPointFromAnchors(anchorPool, points)
    const hopOne = randomPointFromAnchors(anchorPool, [nextPoint], 18)
    const hopTwo = randomPointFromAnchors(anchorPool, [nextPoint, hopOne], 18)
    const hopThree = randomPointFromAnchors(anchorPool, [nextPoint, hopOne, hopTwo], 18)
    points.push(nextPoint)

    const colour = weightedPick(BLOOM_COLOUR_OPTIONS)

    return {
      id: `bloom-${index}`,
      style: {
        '--aurora-bloom-x': `${nextPoint.x}%`,
        '--aurora-bloom-y': `${nextPoint.y}%`,
        '--aurora-hop-x-1': `${hopOne.x}%`,
        '--aurora-hop-y-1': `${hopOne.y}%`,
        '--aurora-hop-x-2': `${hopTwo.x}%`,
        '--aurora-hop-y-2': `${hopTwo.y}%`,
        '--aurora-hop-x-3': `${hopThree.x}%`,
        '--aurora-hop-y-3': `${hopThree.y}%`,
        '--aurora-bloom-size-x': randomPercent(82, 124),
        '--aurora-bloom-size-y': randomPercent(68, 98),
        '--aurora-bloom-color': colour.color,
        '--aurora-bloom-accent': colour.accent,
        '--aurora-bloom-opacity': randomNumber(0.84, 1).toFixed(2),
        '--aurora-bloom-duration': `${Math.round(randomNumber(120, 190))}s`,
      },
    }
  })
}

function getDocumentVisible() {
  return typeof document === 'undefined' || document.visibilityState === 'visible'
}

function getPrefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function AuroraMicaSurface({
  children,
  className = '',
  active = true,
  reduceMotion = false,
  layoutTransitioning = false,
  variant = 'default',
}: AuroraMicaSurfaceProps) {
  const [revealed, setRevealed] = useState(false)
  const [documentVisible, setDocumentVisible] = useState(getDocumentVisible)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getPrefersReducedMotion)
  const [blooms] = useState<Bloom[]>(() => createBloomComposition(variant))

  useEffect(() => {
    const updateVisibility = () => setDocumentVisible(getDocumentVisible())
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => setPrefersReducedMotion(media.matches)
    updateMotionPreference()
    media.addEventListener('change', updateMotionPreference)
    return () => media.removeEventListener('change', updateMotionPreference)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(
      () => setRevealed(active),
      active ? REVEAL_DELAY_MS : 0,
    )
    return () => window.clearTimeout(timer)
  }, [active])

  const motionDisabled = reduceMotion || prefersReducedMotion
  const animate = active && revealed && documentVisible && !motionDisabled && !layoutTransitioning
  const surfaceClassName = ['aurora-mica-surface', className].filter(Boolean).join(' ')

  return (
    <div
      className={surfaceClassName}
      data-active={active ? 'true' : 'false'}
      data-animate={animate ? 'true' : 'false'}
      data-revealed={revealed ? 'true' : 'false'}
      data-reduce-motion={motionDisabled ? 'true' : 'false'}
      data-variant={variant}
      data-bloom-count={blooms.length}
    >
      <div className="aurora-mica-background" aria-hidden>
        {blooms.map((bloom) => (
          <span className="aurora-mica-bloom" key={bloom.id} style={bloom.style} />
        ))}
        <span className="aurora-mica-grain" />
      </div>
      <div className="aurora-mica-content">{children}</div>
    </div>
  )
}
