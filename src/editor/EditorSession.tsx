import { createContext, memo, useContext, type ReactNode } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/core'

export type EditorSessionContextValue = {
  editor: TiptapEditor | null
  flushTypingPersist: () => void
}

const EditorSessionContext = createContext<EditorSessionContextValue>({
  editor: null,
  flushTypingPersist: () => {},
})

export function EditorSessionProvider({
  value,
  children,
}: {
  value: EditorSessionContextValue
  children: ReactNode
}) {
  return (
    <EditorSessionContext.Provider value={value}>
      {children}
    </EditorSessionContext.Provider>
  )
}

export function useEditorSession() {
  return useContext(EditorSessionContext)
}

type EditorSessionBoundaryProps = {
  children: ReactNode
  className?: string
}

export const EditorSessionBoundary = memo(function EditorSessionBoundary({
  children,
  className = '',
}: EditorSessionBoundaryProps) {
  return (
    <div className={`editor-session-boundary ${className}`.trim()} data-editor-session="true">
      {children}
    </div>
  )
})
