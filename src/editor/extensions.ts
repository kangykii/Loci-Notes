import { Extension, mergeAttributes, Node as TiptapNode } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { createId } from '../db'
import { sanitizeImageUrl } from '../utils/urlValidation'
import { createAIBlockAttrs } from './aiBlocks'
import { renderAIBlockShell, shouldStopAIBlockEvent } from './aiBlockSandbox'
import { LOCI_BLOCK_ID_ATTR } from './documentUtils'

const LOCI_BLOCK_ID_NODE_TYPES = [
  'paragraph',
  'heading',
  'taskList',
  'bulletList',
  'orderedList',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'lociQuote',
  'lociAIBlock',
  'image',
  'table',
]

const lociBlockIdPluginKey = new PluginKey('lociBlockIdRepair')

export const LociBlockId = Extension.create({
  name: 'lociBlockId',

  addGlobalAttributes() {
    return [
      {
        types: LOCI_BLOCK_ID_NODE_TYPES,
        attributes: {
          [LOCI_BLOCK_ID_ATTR]: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-loci-block-id'),
            renderHTML: (attributes) => {
              const id = attributes[LOCI_BLOCK_ID_ATTR]
              if (!id) return {}
              return { 'data-loci-block-id': String(id) }
            },
          },
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: lociBlockIdPluginKey,
        appendTransaction(transactions, oldState, newState) {
          if (!transactions.some((transaction) => transaction.docChanged)) return null

          const used = new Set<string>()
          let needsRepair = oldState.doc.childCount !== newState.doc.childCount
          if (!needsRepair) {
            newState.doc.forEach((node) => {
              const existing = node.attrs?.[LOCI_BLOCK_ID_ATTR]
              const blockId = typeof existing === 'string' && existing.trim() ? existing.trim() : ''
              if (!blockId || used.has(blockId)) needsRepair = true
              else used.add(blockId)
            })
            if (!needsRepair) return null
          }

          used.clear()
          let changed = false
          const tr = newState.tr
          newState.doc.forEach((node, offset) => {
            const existing = node.attrs?.[LOCI_BLOCK_ID_ATTR]
            let blockId = typeof existing === 'string' && existing.trim() ? existing.trim() : ''
            if (!blockId || used.has(blockId)) {
              blockId = createId('block')
              tr.setNodeMarkup(offset, undefined, { ...node.attrs, [LOCI_BLOCK_ID_ATTR]: blockId })
              changed = true
            }
            used.add(blockId)
          })
          return changed ? tr : null
        },
      }),
    ]
  },
})

export type EditorRange = { from: number; to: number }

export const aiSelectionHighlightKey = new PluginKey<EditorRange | null>('aiSelectionHighlight')
export const activeBlockHighlightKey = new PluginKey('activeBlockHighlight')
export const blockSelectionHighlightKey = new PluginKey<EditorRange[]>('blockSelectionHighlight')

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

export { LociMathInline, LociMathPaste } from './LociMath'

export const LociAIBlock = TiptapNode.create({
  name: 'lociAIBlock',
  group: 'block',
  atom: true,
  isolating: true,
  selectable: true,

  addAttributes() {
    const defaults = createAIBlockAttrs()
    return {
      id: { default: defaults.id, renderHTML: () => ({}) },
      prompt: { default: '', renderHTML: () => ({}) },
      sourceKind: { default: 'placeholder', renderHTML: () => ({}) },
      source: { default: '', renderHTML: () => ({}) },
      artifact: { default: defaults.artifact, renderHTML: () => ({}) },
      data: { default: {}, renderHTML: () => ({}) },
      status: { default: 'ready', renderHTML: () => ({}) },
      revision: { default: 1, renderHTML: () => ({}) },
      createdAt: { default: defaults.createdAt, renderHTML: () => ({}) },
      updatedAt: { default: defaults.updatedAt, renderHTML: () => ({}) },
      error: { default: '', renderHTML: () => ({}) },
    }
  },

  parseHTML() {
    return [{ tag: 'figure[data-loci-ai-block]' }]
  },

  renderHTML() {
    return [
      'figure',
      {
        'data-loci-ai-block': 'true',
        class: 'loci-ai-block',
      },
      ['div', { class: 'loci-ai-block-label' }, 'AI-Block'],
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('figure')
      renderAIBlockShell(dom, node.attrs)

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'lociAIBlock') return false
          renderAIBlockShell(dom, updatedNode.attrs)
          return true
        },
        stopEvent: shouldStopAIBlockEvent,
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

export const BlockSelectionHighlight = Extension.create({
  name: 'blockSelectionHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin<EditorRange[]>({
        key: blockSelectionHighlightKey,
        state: {
          init: () => [],
          apply(transaction, previous) {
            const meta = transaction.getMeta(blockSelectionHighlightKey) as { ranges: EditorRange[] } | undefined
            if (meta) return meta.ranges
            if (!previous.length || !transaction.docChanged) return previous
            return previous
              .map((range) => ({
                from: transaction.mapping.map(range.from, -1),
                to: transaction.mapping.map(range.to, 1),
              }))
              .filter((range) => range.from < range.to)
          },
        },
        props: {
          decorations(state) {
            const ranges = blockSelectionHighlightKey.getState(state) ?? []
            if (!ranges.length) return null
            return DecorationSet.create(
              state.doc,
              ranges.map((range) =>
                Decoration.node(range.from, range.to, {
                  'data-loci-selected-block': 'true',
                }),
              ),
            )
          },
        },
      }),
    ]
  },
})
