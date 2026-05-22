import { Fragment } from '@tiptap/pm/model'
import type { MarkType } from '@tiptap/pm/model'
import type { JSONContent } from '../db'

export type AuthorshipSource = 'manual-mark' | 'paste' | 'ai'

export type AuthorshipAttrs = {
  kind: 'copied'
  createdAt?: string | null
  source?: AuthorshipSource | null
}

export function applyAuthorshipToContent(content: JSONContent, attrs: AuthorshipAttrs): JSONContent {
  if (content.type === 'text') {
    const marks = (content.marks ?? []).filter((mark) => mark.type !== 'authorship')
    return {
      ...content,
      marks: [
        ...marks,
        {
          type: 'authorship',
          attrs,
        },
      ],
    }
  }

  if (!content.content?.length) return content
  return {
    ...content,
    content: content.content.map((child) => applyAuthorshipToContent(child, attrs)),
  }
}

export function applyAuthorshipToFragment(fragment: Fragment, authorshipMark: MarkType, attrs: AuthorshipAttrs): Fragment {
  const children: Array<Parameters<typeof Fragment.fromArray>[0][number]> = []
  fragment.forEach((child) => {
    const content = child.content.size ? applyAuthorshipToFragment(child.content, authorshipMark, attrs) : child.content
    const marks = child.isText
      ? [
          ...child.marks.filter((mark) => mark.type !== authorshipMark),
          authorshipMark.create(attrs),
        ]
      : child.marks.filter((mark) => mark.type !== authorshipMark)
    children.push(child.copy(content).mark(marks))
  })
  return Fragment.fromArray(children)
}
