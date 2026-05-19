import { Mark, mergeAttributes } from '@tiptap/core'
import { Fragment, Slice } from '@tiptap/pm/model'
import type { MarkType } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'

export type AuthorshipMarkAttrs = {
  kind: 'copied'
  createdAt?: string | null
  source?: 'manual-mark' | null
}

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
            return new Slice(stripAuthorshipMarks(slice.content, authorshipMark), slice.openStart, slice.openEnd)
          },
        },
      }),
    ]
  },
})

function stripAuthorshipMarks(fragment: Fragment, authorshipMark: MarkType): Fragment {
  const children: Array<Parameters<typeof Fragment.fromArray>[0][number]> = []
  fragment.forEach((child) => {
    const content = child.content.size ? stripAuthorshipMarks(child.content, authorshipMark) : child.content
    const marks = child.marks.filter((mark) => mark.type !== authorshipMark)
    children.push(child.copy(content).mark(marks))
  })
  return Fragment.fromArray(children)
}
