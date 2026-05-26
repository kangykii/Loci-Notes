import { describe, expect, it } from 'vitest'
import { isDisplayMathLine, segmentsContainMath, splitMathInText, splitPlaintextForPaste } from './latexDetection'

describe('splitMathInText', () => {
  it('splits inline dollar math', () => {
    const segments = splitMathInText('Energy is $E=mc^2$ today.')
    expect(segments).toEqual([
      { kind: 'text', value: 'Energy is ' },
      { kind: 'inline', value: 'E=mc^2' },
      { kind: 'text', value: ' today.' },
    ])
  })

  it('splits \\( inline delimiters', () => {
    const segments = splitMathInText('See \\(a+b\\) here.')
    expect(segments).toEqual([
      { kind: 'text', value: 'See ' },
      { kind: 'inline', value: 'a+b' },
      { kind: 'text', value: ' here.' },
    ])
  })

  it('splits block math inside a line', () => {
    const segments = splitMathInText('Block $$\\frac{a}{b}$$ end')
    expect(segments).toEqual([
      { kind: 'text', value: 'Block ' },
      { kind: 'block', value: '\\frac{a}{b}' },
      { kind: 'text', value: ' end' },
    ])
  })

  it('leaves currency-like text alone when unpaired', () => {
    const segments = splitMathInText('Costs $5 each')
    expect(segments).toEqual([{ kind: 'text', value: 'Costs $5 each' }])
  })
})

describe('isDisplayMathLine', () => {
  it('detects $$ lines', () => {
    expect(isDisplayMathLine('  $$x^2$$  ')).toBe('x^2')
  })

  it('detects \\[ \\] lines', () => {
    expect(isDisplayMathLine('\\[\\sum_i x_i\\]')).toBe('\\sum_i x_i')
  })

  it('rejects mixed prose', () => {
    expect(isDisplayMathLine('Note $$x$$ here')).toBeNull()
  })
})

describe('splitPlaintextForPaste', () => {
  it('splits display lines from paragraphs', () => {
    const units = splitPlaintextForPaste('Intro $a$.\n$$b$$\nOut')
    expect(units[0]).toMatchObject({ kind: 'inline' })
    expect(segmentsContainMath(units[0].kind === 'inline' ? units[0].segments : [])).toBe(true)
    expect(units[1]).toEqual({ kind: 'display', latex: 'b' })
    expect(units[2]).toMatchObject({ kind: 'inline' })
  })
})
