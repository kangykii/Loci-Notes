import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, KeyboardEvent, MouseEvent, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Download, FileText, Highlighter, History, MoreHorizontal, SendHorizontal, Sparkles, X } from 'lucide-react'
import type { AICommandId } from '../../ai/aiTasks'

type AICommandMeta = {
  label: string
  description: string
}

type HighlighterColorOption = {
  label: string
  color: string
}

type EditorBottomToolbarProps = {
  wrapRef: RefObject<HTMLDivElement | null>
  activePanel: 'more' | null
  atomUnderlinesVisible: boolean
  editorFocusMode: boolean
  editorAuthenticWriterMode: boolean
  aiPromptFocused: boolean
  aiRunning: boolean
  aiRequestStatus: 'idle' | 'running' | 'succeeded' | 'failed'
  activeAICommand: AICommandId
  visibleAICommand: AICommandMeta | null | undefined
  aiPrompt: string
  aiPromptCanSubmit: boolean
  aiPromptInputRef: RefObject<HTMLInputElement | null>
  aiPromptHintVisible: boolean
  aiPromptHint: string
  highlighterArmed: boolean
  highlighterColor: string
  highlightPaletteOpen: boolean
  highlighterColors: readonly HighlighterColorOption[]
  onToggleAtomUnderlines: () => void
  onToggleFocusMode: () => void
  onToggleAuthenticWriterMode: () => void
  onOpenNoteHistory: () => void
  onExportPdf: () => void
  onExportDocx: () => void
  onDeleteNote: () => void
  onAtomise: () => void
  onToggleHighlight: () => void
  onOpenHighlightPalette: () => void
  onSelectHighlightColor: (color: string) => void
  onToggleMore: () => void
  onPromptMouseDown: () => void
  onPromptFocus: () => void
  onPromptBlur: () => void
  onPromptChange: (event: ChangeEvent<HTMLInputElement>) => void
  onPromptKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onPromptSubmit: () => void
  onDismissPromptHint: (event: MouseEvent<HTMLButtonElement>) => void
}

export function EditorBottomToolbar({
  wrapRef,
  activePanel,
  atomUnderlinesVisible,
  editorFocusMode,
  editorAuthenticWriterMode,
  aiPromptFocused,
  aiRunning,
  aiRequestStatus,
  activeAICommand,
  visibleAICommand,
  aiPrompt,
  aiPromptCanSubmit,
  aiPromptInputRef,
  aiPromptHintVisible,
  aiPromptHint,
  highlighterArmed,
  highlighterColor,
  highlightPaletteOpen,
  highlighterColors,
  onToggleAtomUnderlines,
  onToggleFocusMode,
  onToggleAuthenticWriterMode,
  onOpenNoteHistory,
  onExportPdf,
  onExportDocx,
  onDeleteNote,
  onAtomise,
  onToggleHighlight,
  onOpenHighlightPalette,
  onSelectHighlightColor,
  onToggleMore,
  onPromptMouseDown,
  onPromptFocus,
  onPromptBlur,
  onPromptChange,
  onPromptKeyDown,
  onPromptSubmit,
  onDismissPromptHint,
}: EditorBottomToolbarProps) {
  const highlightButtonRef = useRef<HTMLButtonElement | null>(null)
  const singleClickTimerRef = useRef<number | null>(null)
  const [paletteStyle, setPaletteStyle] = useState<CSSProperties | null>(null)

  const clearSingleClickTimer = () => {
    if (!singleClickTimerRef.current) return
    window.clearTimeout(singleClickTimerRef.current)
    singleClickTimerRef.current = null
  }

  const updatePalettePosition = () => {
    const button = highlightButtonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    const paletteWidth = Math.min(highlighterColors.length * 28 + 14, window.innerWidth - 24)
    const left = Math.min(window.innerWidth - paletteWidth - 12, Math.max(12, rect.right - paletteWidth))
    const bottom = Math.max(12, window.innerHeight - rect.top + 8)
    setPaletteStyle({
      left,
      bottom,
      width: paletteWidth,
    })
  }

  const openHighlightPalette = () => {
    clearSingleClickTimer()
    updatePalettePosition()
    onOpenHighlightPalette()
  }

  useLayoutEffect(() => {
    if (!highlightPaletteOpen) return
    updatePalettePosition()
  }, [highlightPaletteOpen])

  useEffect(() => {
    if (!highlightPaletteOpen) return
    const handleViewportChange = () => updatePalettePosition()
    window.addEventListener('resize', handleViewportChange)
    window.visualViewport?.addEventListener('resize', handleViewportChange)
    window.visualViewport?.addEventListener('scroll', handleViewportChange)
    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.visualViewport?.removeEventListener('resize', handleViewportChange)
      window.visualViewport?.removeEventListener('scroll', handleViewportChange)
    }
  }, [highlightPaletteOpen])

  useEffect(() => () => clearSingleClickTimer(), [])

  const highlightPalette = highlightPaletteOpen
    ? createPortal(
        <div
          className="highlight-palette"
          style={paletteStyle ?? undefined}
          aria-label="Highlight colours"
          onMouseDown={(event) => event.preventDefault()}
        >
          {highlighterColors.map(({ color, label }) => (
            <button
              type="button"
              key={color}
              className={color === highlighterColor ? 'is-active' : ''}
              style={{ background: color }}
              aria-label={`Use ${label.toLowerCase()} highlight colour`}
              title={label}
              onClick={() => onSelectHighlightColor(color)}
            />
          ))}
        </div>,
        document.body,
      )
    : null

  const toolbar = (
    <div className="floating-editor-wrap" ref={wrapRef}>
      {activePanel === 'more' && (
        <div className="floating-editor-panel">
          <div className="more-option-grid">
            <button
              type="button"
              className="more-toggle-row"
              aria-pressed={atomUnderlinesVisible}
              onClick={onToggleAtomUnderlines}
            >
              <span>Atom underlines</span>
              <span className="ios-switch" aria-hidden><span /></span>
            </button>
            <button
              type="button"
              className="more-toggle-row"
              aria-pressed={editorFocusMode}
              onClick={onToggleFocusMode}
            >
              <span>Focus mode</span>
              <span className="ios-switch" aria-hidden><span /></span>
            </button>
            <button
              type="button"
              className="more-toggle-row"
              aria-pressed={editorAuthenticWriterMode}
              onClick={onToggleAuthenticWriterMode}
            >
              <span>Authentic Writer</span>
              <span className="ios-switch" aria-hidden><span /></span>
            </button>
            <button type="button" onClick={onOpenNoteHistory}>Note history <History size={16} /></button>
            <button type="button" onClick={onExportPdf}>Export PDF <Download size={16} /></button>
            <button type="button" onClick={onExportDocx}>Export DOCX <FileText size={16} /></button>
            <button type="button" className="danger" onClick={onDeleteNote}>Delete note</button>
          </div>
        </div>
      )}
      <div
        className={`floating-editor-bar ${aiPromptFocused ? 'is-prompt-open' : ''} ${aiRunning ? 'is-thinking' : ''}`}
        role="toolbar"
        aria-label="Editor tools"
      >
        <div className="toolbar-zone toolbar-zone-left">
          <button
            type="button"
            className="toolbar-text-button toolbar-text-button--primary"
            onClick={onAtomise}
            title="Create or edit an atom from the selection (manual, not AI)"
          >
            Atomise
          </button>
        </div>
        <span className="toolbar-structural-divider" aria-hidden />
        <label className={`floating-ai-prompt ${aiPromptFocused ? 'is-open' : ''}`} onMouseDown={onPromptMouseDown}>
          <Sparkles size={16} aria-hidden />
          {visibleAICommand && (
            <span
              className={`ai-mode-pill ai-mode-pill--${activeAICommand}`}
              title={visibleAICommand.description}
              aria-label={`${visibleAICommand.label}: ${visibleAICommand.description}`}
            >
              <span aria-hidden />
              {visibleAICommand.label}
            </span>
          )}
          <input
            ref={aiPromptInputRef}
            value={aiPrompt}
            onFocus={onPromptFocus}
            onBlur={onPromptBlur}
            onChange={onPromptChange}
            onKeyDown={onPromptKeyDown}
            readOnly={aiRunning}
            placeholder={aiRequestStatus === 'running' ? 'Working in background...' : 'Ask AI...'}
          />
          {aiPromptFocused && (
            <button
              type="button"
              className="floating-ai-send"
              aria-label="Send AI prompt"
              title="Send AI prompt"
              disabled={!aiPromptCanSubmit || aiRunning}
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.preventDefault()
                onPromptSubmit()
              }}
            >
              <SendHorizontal size={15} aria-hidden />
            </button>
          )}
          {aiPromptHintVisible && aiPromptHint && (
            <span className="ai-prompt-hint">
              {aiPromptHint}
              <button type="button" aria-label="Dismiss prompt hint" onClick={onDismissPromptHint}>
                <X size={12} />
              </button>
            </span>
          )}
        </label>
        <span className="toolbar-structural-divider" aria-hidden />
        <div className="toolbar-zone toolbar-zone-right">
          <div className="highlight-tool">
            <button
              ref={highlightButtonRef}
              type="button"
              className={`highlight-button ${highlighterArmed ? 'is-armed' : ''}`}
              aria-label="Highlight"
              title={highlighterArmed ? 'Highlight mode active' : 'Highlight selected text'}
              aria-pressed={highlighterArmed}
              aria-expanded={highlightPaletteOpen}
              onMouseDown={(event) => {
                event.preventDefault()
              }}
              onClick={(event) => {
                event.preventDefault()
                if (event.detail > 1) {
                  openHighlightPalette()
                  return
                }
                clearSingleClickTimer()
                singleClickTimerRef.current = window.setTimeout(() => {
                  singleClickTimerRef.current = null
                  onToggleHighlight()
                }, 220)
              }}
              onDoubleClick={(event) => {
                event.preventDefault()
                openHighlightPalette()
              }}
            >
              <Highlighter size={15} aria-hidden />
              <span className="highlight-swatch" style={{ background: highlighterColor }} aria-hidden />
            </button>
          </div>
          <button
            type="button"
            className="toolbar-more-button"
            aria-label="More options"
            aria-expanded={activePanel === 'more'}
            onClick={onToggleMore}
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
      {highlightPalette}
    </div>
  )

  return createPortal(toolbar, document.body)
}
