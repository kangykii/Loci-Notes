import { Extension, mergeAttributes, Node as TiptapNode } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { LociBlock } from '../db'
import { blockContentNodes, formatBlockTypeForBlock } from './blocks'
import { sanitizeImageUrl } from '../utils/urlValidation'

export type EditorRange = { from: number; to: number }

export const aiSelectionHighlightKey = new PluginKey<EditorRange | null>('aiSelectionHighlight')
export const blockControlsKey = new PluginKey('blockControls')

export const LociFlashcard = TiptapNode.create({
  name: 'lociFlashcard',
  group: 'block',
  content: 'block+',
  isolating: true,

  addAttributes() {
    return {
      atomId: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-loci-flashcard]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['section', { ...HTMLAttributes, 'data-loci-flashcard': 'true', class: 'loci-flashcard' }, 0]
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

function blockControlWidget(pos: number, blockId: string, blockType: string) {
  const icon = (paths: string[], circles: Array<[number, number, number]> = []) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('aria-hidden', 'true')
    paths.forEach((d) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', d)
      svg.appendChild(path)
    })
    circles.forEach(([cx, cy, r]) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', String(cx))
      circle.setAttribute('cy', String(cy))
      circle.setAttribute('r', String(r))
      svg.appendChild(circle)
    })
    return svg
  }
  const wrapper = document.createElement('span')
  wrapper.className = 'block-hover-controls'
  wrapper.contentEditable = 'false'
  wrapper.setAttribute('data-block-id', blockId)
  wrapper.setAttribute('data-block-type', blockType)

  const deleteButton = document.createElement('button')
  deleteButton.type = 'button'
  deleteButton.className = 'block-control-button block-control-delete'
  deleteButton.setAttribute('aria-label', 'Delete block')
  deleteButton.appendChild(icon(['M6 6l12 12', 'M18 6L6 18']))
  Object.assign(deleteButton.dataset, { blockAction: 'delete', blockId })

  const addButton = document.createElement('button')
  addButton.type = 'button'
  addButton.className = 'block-control-button'
  addButton.setAttribute('aria-label', 'Insert block')
  addButton.appendChild(icon(['M12 5v14', 'M5 12h14']))
  Object.assign(addButton.dataset, { blockAction: 'insert', blockId })

  const dragHandle = document.createElement('button')
  dragHandle.type = 'button'
  dragHandle.className = 'block-control-button block-control-handle'
  dragHandle.setAttribute('aria-label', 'Move block')
  dragHandle.draggable = true
  dragHandle.appendChild(icon([], [[9, 7.5, 1.25], [15, 7.5, 1.25], [9, 12, 1.25], [15, 12, 1.25], [9, 16.5, 1.25], [15, 16.5, 1.25]]))
  Object.assign(dragHandle.dataset, { blockAction: 'drag', blockId })

  wrapper.append(deleteButton, addButton, dragHandle)
  return Decoration.widget(pos, wrapper, { side: -1, key: `block-controls-${blockId}` })
}

export const BlockControlsExtension = Extension.create({
  name: 'blockControls',

  addProseMirrorPlugins() {
    return [
      new Plugin<LociBlock[]>({
        key: blockControlsKey,
        props: {
          decorations(state) {
            const blocks = blockControlsKey.getState(state) as LociBlock[] | undefined
            if (!blocks?.length) return null
            const decorations: Decoration[] = []
            let pos = 1
            blocks.forEach((block) => {
              if (!formatBlockTypeForBlock(block)) decorations.push(blockControlWidget(pos, block.id, block.type))
              blockContentNodes(block.content).forEach((node) => {
                pos += state.schema.nodeFromJSON(node).nodeSize
              })
            })
            return DecorationSet.create(state.doc, decorations)
          },
        },
        state: {
          init: () => [],
          apply(transaction, previous) {
            const meta = transaction.getMeta(blockControlsKey) as LociBlock[] | undefined
            return meta ?? previous
          },
        },
      }),
    ]
  },
})
