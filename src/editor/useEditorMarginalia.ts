import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'

import type { JSONContent } from '../db'
import { collectText } from '../editor/blocks'
import { editorMarginaliaOpacityFromText } from '../marginalia/editorMarginalia'
import { emptyDoc } from '../notes/templates'

const DEFAULT_DEBOUNCE_MS = 200

export function useEditorMarginalia(options: {
  enabled: boolean
  debounceMs?: number
}) {
  const { enabled, debounceMs = DEFAULT_DEBOUNCE_MS } = options
  const [opacity, setOpacity] = useState(enabled ? 1 : 0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setOpacity(enabled ? 1 : 0)
  }, [enabled])

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }, [])

  const setFromText = useCallback((text: string) => {
    if (!enabled) return
    setOpacity(editorMarginaliaOpacityFromText(text))
  }, [enabled])

  const setFromContent = useCallback((content: JSONContent | undefined | null) => {
    setFromText(collectText(content ?? emptyDoc))
  }, [setFromText])

  const scheduleFromEditor = useCallback((editor: Editor | null) => {
    if (!enabled || !editor || editor.isDestroyed) return
    clearDebounce()
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      setFromText(editor.getText())
    }, debounceMs)
  }, [clearDebounce, debounceMs, enabled, setFromText])

  useEffect(() => () => clearDebounce(), [clearDebounce])

  return {
    opacity,
    setFromContent,
    setFromText,
    scheduleFromEditor,
    setEnabled: (next: boolean) => setOpacity(next ? 1 : 0),
  }
}
