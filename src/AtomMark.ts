import { Mark, mergeAttributes } from '@tiptap/core'

export type AtomMarkAttrs = {
  atomId: string | null
  phrase: string | null
  definition: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    atom: {
      setAtom: (attrs: AtomMarkAttrs) => ReturnType
      unsetAtom: () => ReturnType
    }
  }
}

export const AtomMark = Mark.create({
  name: 'atom',

  addAttributes() {
    return {
      atomId: { default: null },
      phrase: { default: null },
      definition: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-atom-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'atom-mark',
        'data-atom-id': HTMLAttributes.atomId,
        'data-phrase': HTMLAttributes.phrase,
        'data-definition': HTMLAttributes.definition,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setAtom:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetAtom:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },
})
