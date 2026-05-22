import { Mark, mergeAttributes } from '@tiptap/core'
import { Slice } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import { applyAuthorshipToFragment } from './editor/authorship'
import type { AuthorshipAttrs } from './editor/authorship'

export type AuthorshipMarkAttrs = AuthorshipAttrs

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    authorship: {
      setAuthorship: (attrs: AuthorshipMarkAttrs) => ReturnType
      unsetAuthorship: () => ReturnType
    }
  }
}

export const AuthorshipMark = Mark.create({
  name: 'authorship',
  inclusive: false,

  addAttributes() {
    return {
      kind: { default: 'copied' },
      createdAt: { default: null },
      source: { default: 'manual-mark' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-loci-authorship-kind]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const kind = HTMLAttributes.kind === 'copied' ? 'copied' : 'copied'
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'authorship-mark',
        'data-loci-authorship-kind': kind,
        'data-loci-authorship-source': HTMLAttributes.source,
        'data-loci-authorship-created-at': HTMLAttributes.createdAt,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setAuthorship:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetAuthorship:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleTextInput: (view, from, to, text) => {
            const authorshipMark = view.state.schema.marks.authorship
            if (!authorshipMark) return false
            const transaction = view.state.tr.insertText(text, from, to)
            transaction.removeMark(from, from + text.length, authorshipMark)
            view.dispatch(transaction)
            return true
          },
          transformPasted: (slice) => {
            const authorshipMark = this.editor.schema.marks.authorship
            if (!authorshipMark) return slice
            return new Slice(
              applyAuthorshipToFragment(slice.content, authorshipMark, {
                kind: 'copied',
                createdAt: new Date().toISOString(),
                source: 'paste',
              }),
              slice.openStart,
              slice.openEnd,
            )
          },
        },
      }),
    ]
  },
})
