import { Extension, Mark, mergeAttributes } from '@tiptap/core'
import type { Mark as PMMark } from '@tiptap/pm/model'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import type { EditorState } from '@tiptap/pm/state'
import katex from 'katex'
import { transformPastedMathSlice } from './latexPaste'

export const MATH_MARK_NAME = 'lociMathInline'

export function renderKatexHtml(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false, output: 'html' })
  } catch {
    return latex.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
}

export function renderKatexIntoElement(element: HTMLElement, latex: string, displayMode: boolean) {
  try {
    katex.render(latex, element, { displayMode, throwOnError: false })
  } catch {
    element.textContent = latex
    element.classList.add('loci-math-error')
  }
}

export function findMathMarkRange(state: EditorState, pos: number): { from: number; to: number } | null {
  const markType = state.schema.marks[MATH_MARK_NAME]
  if (!markType) return null
  const safePos = Math.max(0, Math.min(pos, state.doc.content.size))
  const $pos = state.doc.resolve(safePos)
  if (!$pos.parent.isTextblock) return null

  const parentStart = $pos.start()
  let match: { from: number; to: number } | null = null
  $pos.parent.forEach((child, offset) => {
    if (!child.isText || !markType.isInSet(child.marks)) return
    const from = parentStart + offset
    const to = from + child.nodeSize
    if (safePos >= from && safePos <= to) match = { from, to }
  })
  return match
}

function mathLatexFromMarkView(dom: HTMLElement, mark: PMMark): string {
  const source = dom.querySelector<HTMLElement>('.loci-math-inline-source')
  const sourceText = source?.textContent ?? ''
  return sourceText || String(mark.attrs.latex ?? '')
}

function mathInlineBehaviorPlugins() {
  const syncKey = new PluginKey('lociMathInlineSync')

  return [
    new Plugin({
      key: syncKey,
      appendTransaction(transactions, _oldState, newState) {
        if (!transactions.some((transaction) => transaction.docChanged)) return null
        const markType = newState.schema.marks[MATH_MARK_NAME]
        if (!markType) return null

        const syncMathInRange = (
          doc: typeof newState.doc,
          tr: typeof newState.tr,
          from: number,
          to: number,
        ) => {
          let changed = false
          doc.nodesBetween(from, to, (node, pos) => {
            if (!node.isText) return
            const mark = markType.isInSet(node.marks)
            if (!mark) return
            const text = node.text ?? ''
            if (mark.attrs.latex === text) return
            const nextMark = markType.create({ ...mark.attrs, latex: text })
            tr.removeMark(pos, pos + node.nodeSize, markType)
            tr.addMark(pos, pos + node.nodeSize, nextMark)
            changed = true
          })
          return changed
        }

        let tr = newState.tr
        let changed = false
        const docSize = newState.doc.content.size
        transactions.forEach((transaction) => {
          if (!transaction.docChanged) return
          transaction.mapping.maps.forEach((stepMap) => {
            stepMap.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
              const from = Math.max(0, newStart - 1)
              const to = Math.min(docSize, newEnd + 1)
              if (syncMathInRange(newState.doc, tr, from, to)) changed = true
            })
          })
        })
        return changed ? tr : null
      },
    }),
    new Plugin({
      props: {
        handleClick(view, pos, event) {
          const target = event.target
          if (!(target instanceof HTMLElement)) return false
          const mathRoot = target.closest('.loci-math-inline')
          if (!mathRoot || !view.dom.contains(mathRoot)) return false
          const range = findMathMarkRange(view.state, pos)
          if (!range) return false
          view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, range.to)))
          view.focus()
          return true
        },
        handleKeyDown(view, event) {
          if (event.key !== 'Backspace' && event.key !== 'Delete') return false
          const { state } = view
          const { from, to, empty } = state.selection
          const markType = state.schema.marks[MATH_MARK_NAME]
          if (!markType) return false

          if (!empty) {
            if (from === to) return false
            let hasMath = false
            state.doc.nodesBetween(from, to, (node) => {
              if (node.isText && markType.isInSet(node.marks)) hasMath = true
            })
            if (!hasMath) return false
            event.preventDefault()
            view.dispatch(state.tr.delete(from, to))
            return true
          }

          if (event.key === 'Backspace') {
            const $from = state.doc.resolve(from)
            const nodeBefore = $from.nodeBefore
            if (nodeBefore?.isText && markType.isInSet(nodeBefore.marks)) {
              event.preventDefault()
              view.dispatch(state.tr.delete(from - nodeBefore.nodeSize, from))
              return true
            }
            const inside = findMathMarkRange(state, from)
            if (inside && from === inside.to) {
              event.preventDefault()
              view.dispatch(state.tr.delete(inside.from, inside.to))
              return true
            }
          }

          if (event.key === 'Delete') {
            const $from = state.doc.resolve(from)
            const nodeAfter = $from.nodeAfter
            if (nodeAfter?.isText && markType.isInSet(nodeAfter.marks)) {
              event.preventDefault()
              view.dispatch(state.tr.delete(from, from + nodeAfter.nodeSize))
              return true
            }
            const inside = findMathMarkRange(state, from)
            if (inside && from === inside.from) {
              event.preventDefault()
              view.dispatch(state.tr.delete(inside.from, inside.to))
              return true
            }
          }

          return false
        },
      },
    }),
  ]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lociMathInline: {
      setLociMathInline: (attrs: { latex: string; display?: boolean }) => ReturnType
      unsetLociMathInline: () => ReturnType
    }
  }
}

export const LociMathInline = Mark.create({
  name: MATH_MARK_NAME,
  inclusive: false,
  excludes: '_',

  addAttributes() {
    return {
      latex: { default: '' },
      display: { default: false },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-loci-math-inline]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const latex = typeof HTMLAttributes.latex === 'string' ? HTMLAttributes.latex : ''
    const display = Boolean(HTMLAttributes.display)
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: display ? 'loci-math-inline loci-math-inline--display' : 'loci-math-inline',
        'data-loci-math-inline': 'true',
        'data-latex': latex,
        'data-display': display ? 'true' : 'false',
      }),
      ['span', { class: 'loci-math-inline-katex', innerHTML: renderKatexHtml(latex, display) }],
      0,
    ]
  },

  addMarkView() {
    return ({ mark }) => {
      const dom = document.createElement('span')
      dom.className = mark.attrs.display ? 'loci-math-inline loci-math-inline--display' : 'loci-math-inline'
      dom.dataset.lociMathInline = 'true'
      dom.dataset.latex = String(mark.attrs.latex ?? '')

      const katexHost = document.createElement('span')
      katexHost.className = 'loci-math-inline-katex'
      dom.append(katexHost)

      const contentDOM = document.createElement('span')
      contentDOM.className = 'loci-math-inline-source'
      dom.append(contentDOM)

      let renderTimer: ReturnType<typeof setTimeout> | null = null
      const render = (latex: string, display: boolean, immediate = false) => {
        if (renderTimer) {
          clearTimeout(renderTimer)
          renderTimer = null
        }
        const paint = () => {
          dom.dataset.latex = latex
          dom.className = display ? 'loci-math-inline loci-math-inline--display' : 'loci-math-inline'
          katexHost.replaceChildren()
          renderKatexIntoElement(katexHost, latex, display)
        }
        if (immediate) {
          paint()
          return
        }
        renderTimer = setTimeout(() => {
          renderTimer = null
          paint()
        }, 48)
      }
      render(String(mark.attrs.latex ?? ''), Boolean(mark.attrs.display), true)

      return {
        dom,
        contentDOM,
        update: (updatedMark: PMMark) => {
          if (updatedMark.type.name !== MATH_MARK_NAME) return false
          const latex = mathLatexFromMarkView(dom, updatedMark)
          render(latex, Boolean(updatedMark.attrs.display))
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      setLociMathInline:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetLociMathInline:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },
})

export const LociMathPaste = Extension.create({
  name: 'lociMathPaste',
  priority: 1100,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          transformPasted: (slice) => transformPastedMathSlice(slice, this.editor.schema),
        },
      }),
      ...mathInlineBehaviorPlugins(),
    ]
  },
})
