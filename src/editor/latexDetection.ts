export type MathSegment =
  | { kind: 'text'; value: string }
  | { kind: 'inline'; value: string }
  | { kind: 'block'; value: string }

export function segmentsContainMath(segments: MathSegment[]): boolean {
  return segments.some((segment) => segment.kind !== 'text')
}

function pushText(segments: MathSegment[], value: string) {
  if (!value) return
  const last = segments[segments.length - 1]
  if (last?.kind === 'text') last.value += value
  else segments.push({ kind: 'text', value })
}

function findClosing(text: string, start: number, delimiter: string): number {
  let index = start
  while (index < text.length) {
    if (text.startsWith(delimiter, index)) return index
    if (text[index] === '\\') {
      index += 2
      continue
    }
    index += 1
  }
  return -1
}

export function isDisplayMathLine(text: string): string | null {
  const trimmed = text.trim()
  const doubleDollar = trimmed.match(/^\$\$([\s\S]+?)\$\$$/)
  if (doubleDollar?.[1]?.trim()) return doubleDollar[1].trim()
  const bracket = trimmed.match(/^\\\[([\s\S]+?)\\\]$/)
  if (bracket?.[1]?.trim()) return bracket[1].trim()
  return null
}

export function splitMathInText(text: string): MathSegment[] {
  const segments: MathSegment[] = []
  let index = 0

  while (index < text.length) {
    if (text.startsWith('\\(', index)) {
      const close = text.indexOf('\\)', index + 2)
      if (close > index + 2) {
        const latex = text.slice(index + 2, close).trim()
        if (latex) {
          segments.push({ kind: 'inline', value: latex })
          index = close + 2
          continue
        }
      }
    }

    if (text.startsWith('\\[', index)) {
      const close = text.indexOf('\\]', index + 2)
      if (close > index + 2) {
        const latex = text.slice(index + 2, close).trim()
        if (latex) {
          segments.push({ kind: 'block', value: latex })
          index = close + 2
          continue
        }
      }
    }

    if (text.startsWith('$$', index)) {
      const close = findClosing(text, index + 2, '$$')
      if (close > index + 2) {
        const latex = text.slice(index + 2, close).trim()
        if (latex) {
          segments.push({ kind: 'block', value: latex })
          index = close + 2
          continue
        }
      }
    }

    if (text[index] === '$' && text[index + 1] !== '$') {
      const close = findClosing(text, index + 1, '$')
      if (close > index + 1) {
        const latex = text.slice(index + 1, close).trim()
        if (latex) {
          segments.push({ kind: 'inline', value: latex })
          index = close + 1
          continue
        }
      }
    }

    const nextSpecial = (() => {
      const candidates = [
        text.indexOf('\\(', index),
        text.indexOf('\\[', index),
        text.indexOf('$$', index),
        text.indexOf('$', index),
      ].filter((value) => value >= 0)
      return candidates.length ? Math.min(...candidates) : -1
    })()

    if (nextSpecial === index) {
      pushText(segments, text[index])
      index += 1
      continue
    }

    const end = nextSpecial === -1 ? text.length : nextSpecial
    pushText(segments, text.slice(index, end))
    index = end
  }

  return segments
}

export type PlaintextPasteUnit =
  | { kind: 'display'; latex: string }
  | { kind: 'inline'; segments: MathSegment[] }

export function splitPlaintextForPaste(text: string): PlaintextPasteUnit[] {
  const normalized = text.replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  const units: PlaintextPasteUnit[] = []
  let buffer: string[] = []

  const flushBuffer = () => {
    if (!buffer.length) return
    const paragraph = buffer.join('\n')
    buffer = []
    if (!paragraph) return
    const display = isDisplayMathLine(paragraph)
    if (display) {
      units.push({ kind: 'display', latex: display })
      return
    }
    units.push({ kind: 'inline', segments: splitMathInText(paragraph) })
  }

  for (const line of lines) {
    const display = isDisplayMathLine(line)
    if (display) {
      flushBuffer()
      units.push({ kind: 'display', latex: display })
      continue
    }
    if (line.trim() === '' && buffer.length) {
      flushBuffer()
      units.push({ kind: 'inline', segments: [{ kind: 'text', value: '' }] })
      continue
    }
    buffer.push(line)
  }

  flushBuffer()
  return units.length ? units : [{ kind: 'inline', segments: splitMathInText(normalized) }]
}
