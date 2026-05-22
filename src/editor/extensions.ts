import { Extension, mergeAttributes, Node as TiptapNode } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { sanitizeImageUrl } from '../utils/urlValidation'

export type EditorRange = { from: number; to: number }

export const aiSelectionHighlightKey = new PluginKey<EditorRange | null>('aiSelectionHighlight')
export const activeBlockHighlightKey = new PluginKey('activeBlockHighlight')

export const ActiveBlockHighlight = Extension.create({
  name: 'activeBlockHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: activeBlockHighlightKey,
        props: {
          decorations(state) {
            const { $from } = state.selection
            if ($from.depth === 0) return null
            const topLevelPos = $from.before(1)
            return DecorationSet.create(state.doc, [
              Decoration.node(topLevelPos, topLevelPos + $from.node(1).nodeSize, {
                'data-loci-active-block': 'true',
              }),
            ])
          },
        },
      }),
    ]
  },
})

export const TabIndent = Extension.create({
  name: 'tabIndent',
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.insertContent('    '),
    }
  },
})

export const LociQuote = TiptapNode.create({
  name: 'lociQuote',
  group: 'block',
  content: 'block+',
  isolating: true,

  parseHTML() {
    return [{ tag: 'figure[data-loci-quote]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', { ...HTMLAttributes, 'data-loci-quote': 'true', class: 'loci-quote' }, 0]
  },
})

function renderLatexPreview(source: string) {
  return source
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1) / ($2)')
    .replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\pm/g, '±')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\pi/g, 'π')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\sum/g, 'Σ')
    .replace(/\\int/g, '∫')
    .replace(/[{}]/g, '')
    .trim()
}

export const LociLatex = TiptapNode.create({
  name: 'lociLatex',
  group: 'block',
  atom: true,
  isolating: true,
  selectable: true,

  addAttributes() {
    return {
      latex: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'figure[data-loci-latex]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const latex = typeof HTMLAttributes.latex === 'string' ? HTMLAttributes.latex : ''
    return [
      'figure',
      { ...HTMLAttributes, 'data-loci-latex': 'true', class: 'loci-latex', 'data-latex': latex },
      ['pre', { class: 'loci-latex-source' }, latex],
      ['div', { class: 'loci-latex-preview' }, renderLatexPreview(latex) || 'Equation preview'],
    ]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('figure')
      dom.className = 'loci-latex'
      dom.dataset.lociLatex = 'true'

      const textarea = document.createElement('textarea')
      textarea.className = 'loci-latex-source'
      textarea.value = String(node.attrs.latex ?? '')
      textarea.rows = Math.max(2, textarea.value.split('\n').length)
      textarea.setAttribute('aria-label', 'LaTeX equation source')
      textarea.spellcheck = false

      const preview = document.createElement('div')
      preview.className = 'loci-latex-preview'

      const syncPreview = () => {
        const source = textarea.value
        dom.dataset.latex = source
        preview.textContent = renderLatexPreview(source) || 'Equation preview'
        textarea.rows = Math.max(2, source.split('\n').length)
      }

      textarea.addEventListener('input', () => {
        const pos = typeof getPos === 'function' ? getPos() : null
        if (typeof pos !== 'number') return
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          latex: textarea.value,
        }))
        syncPreview()
      })
      textarea.addEventListener('blur', () => {
        dom.classList.remove('is-editing')
      })
      dom.addEventListener('dblclick', () => {
        dom.classList.add('is-editing')
        textarea.focus()
      })

      dom.append(textarea, preview)
      syncPreview()

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'lociLatex') return false
          const nextLatex = String(updatedNode.attrs.latex ?? '')
          if (textarea.value !== nextLatex) {
            textarea.value = nextLatex
            syncPreview()
          }
          return true
        },
        stopEvent: (event) => event.target === textarea,
        ignoreMutation: () => true,
      }
    }
  },
})

export const LociImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 78,
        parseHTML: (element) => Number(element.getAttribute('data-image-width')) || 78,
        renderHTML: (attrs) => ({ 'data-image-width': String(attrs.width || 78) }),
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-image-align') || 'center',
        renderHTML: (attrs) => ({ 'data-image-align': attrs.align || 'center' }),
      },
      cropMode: {
        default: 'contain',
        parseHTML: (element) => element.getAttribute('data-image-crop-mode') || 'contain',
        renderHTML: (attrs) => ({ 'data-image-crop-mode': attrs.cropMode || 'contain' }),
      },
      aspect: {
        default: 'auto',
        parseHTML: (element) => element.getAttribute('data-image-aspect') || 'auto',
        renderHTML: (attrs) => ({ 'data-image-aspect': attrs.aspect || 'auto' }),
      },
      offsetX: {
        default: 50,
        parseHTML: (element) => Number(element.getAttribute('data-image-offset-x')) || 50,
        renderHTML: (attrs) => ({ 'data-image-offset-x': String(attrs.offsetX ?? 50) }),
      },
      offsetY: {
        default: 50,
        parseHTML: (element) => Number(element.getAttribute('data-image-offset-y')) || 50,
        renderHTML: (attrs) => ({ 'data-image-offset-y': String(attrs.offsetY ?? 50) }),
      },
      zoom: {
        default: 100,
        parseHTML: (element) => Number(element.getAttribute('data-image-zoom')) || 100,
        renderHTML: (attrs) => ({ 'data-image-zoom': String(attrs.zoom ?? 100) }),
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const width = Number(HTMLAttributes['data-image-width']) || 78
    const offsetX = Number(HTMLAttributes['data-image-offset-x']) || 50
    const offsetY = Number(HTMLAttributes['data-image-offset-y']) || 50
    const zoom = Number(HTMLAttributes['data-image-zoom']) || 100
    const align = HTMLAttributes['data-image-align'] || 'center'
    const cropMode = HTMLAttributes['data-image-crop-mode'] || 'contain'
    const aspect = HTMLAttributes['data-image-aspect'] || 'auto'
    const { src, alt, title } = HTMLAttributes
    const safeSrc = typeof src === 'string' ? sanitizeImageUrl(src) : null
    const imageChildren = safeSrc
      ? [['img', { src: safeSrc, alt, title, loading: 'lazy', decoding: 'async' }]]
      : [['span', { 'data-invalid-image': 'true' }, 'Unsupported image URL']]
    return [
      'figure',
      mergeAttributes({
        class: 'loci-image-frame',
        'data-image-width': String(width),
        'data-image-align': align,
        'data-image-crop-mode': cropMode,
        'data-image-aspect': aspect,
        'data-image-offset-x': String(offsetX),
        'data-image-offset-y': String(offsetY),
        'data-image-zoom': String(zoom),
        style: `--image-width:${width}%;--image-position-x:${offsetX}%;--image-position-y:${offsetY}%;--image-zoom:${zoom / 100};`,
      }),
      ...imageChildren,
    ]
  },
})

export const AISelectionHighlight = Extension.create({
  name: 'aiSelectionHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin<EditorRange | null>({
        key: aiSelectionHighlightKey,
        state: {
          init: () => null,
          apply(transaction, previous) {
            const meta = transaction.getMeta(aiSelectionHighlightKey) as { range: EditorRange | null } | undefined
            if (meta) return meta.range
            if (!previous || !transaction.docChanged) return previous
            const from = transaction.mapping.map(previous.from, -1)
            const to = transaction.mapping.map(previous.to, 1)
            return from < to ? { from, to } : null
          },
        },
        props: {
          decorations(state) {
            const range = aiSelectionHighlightKey.getState(state)
            if (!range || range.from >= range.to) return null
            return DecorationSet.create(state.doc, [
              Decoration.inline(range.from, range.to, { class: 'ai-selection-highlight' }),
            ])
          },
        },
      }),
    ]
  },
})
