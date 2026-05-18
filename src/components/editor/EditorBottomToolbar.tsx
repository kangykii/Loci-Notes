import type { ChangeEvent, KeyboardEvent, MouseEvent, RefObject } from 'react'
import { Download, FileText, Highlighter, History, MoreHorizontal, Sparkles, X } from 'lucide-react'
import type { AICommandId } from '../../ai/aiTasks'

type AICommandMeta = {
  label: string
}

type EditorBottomToolbarProps = {
  wrapRef: RefObject<HTMLDivElement | null>
  activePanel: 'more' | 'format' | null
  atomUnderlinesVisible: boolean
  editorFocusMode: boolean
  aiPromptFocused: boolean
  aiRunning: boolean
  activeAICommand: AICommandId
  visibleAICommand: AICommandMeta | null | undefined
  aiPrompt: string
  aiPromptInputRef: RefObject<HTMLInputElement | null>
  aiPromptHintVisible: boolean
  aiPromptHint: string
  highlighterArmed: boolean
  highlighterColor: string
  highlightPaletteOpen: boolean
  highlighterColors: readonly string[]
  onToggleAtomUnderlines: () => void
  onToggleFocusMode: () => void
  onOpenNoteHistory: () => void
  onExportPdf: () => void
  onExportDocx: () => void
  onDeleteNote: () => void
  onAtomise: () => void
  onToggleHighlight: () => void
  onToggleHighlightPalette: () => void
  onSelectHighlightColor: (color: string) => void
  onToggleFormat: () => void
  onToggleMore: () => void
  onPromptMouseDown: () => void
  onPromptFocus: () => void
  onPromptBlur: () => void
  onPromptChange: (event: ChangeEvent<HTMLInputElement>) => void
  onPromptKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onDismissPromptHint: (event: MouseEvent<HTMLButtonElement>) => void
}

export function EditorBottomToolbar({
  wrapRef,
  activePanel,
  atomUnderlinesVisible,
  editorFocusMode,
  aiPromptFocused,
  aiRunning,
  activeAICommand,
  visibleAICommand,
  aiPrompt,
  aiPromptInputRef,
  aiPromptHintVisible,
  aiPromptHint,
  highlighterArmed,
  highlighterColor,
  highlightPaletteOpen,
  highlighterColors,
  onToggleAtomUnderlines,
  onToggleFocusMode,
  onOpenNoteHistory,
  onExportPdf,
  onExportDocx,
  onDeleteNote,
  onAtomise,
  onToggleHighlight,
  onToggleHighlightPalette,
  onSelectHighlightColor,
  onToggleFormat,
  onToggleMore,
  onPromptMouseDown,
  onPromptFocus,
  onPromptBlur,
  onPromptChange,
  onPromptKeyDown,
  onDismissPromptHint,
}: EditorBottomToolbarProps) {
  return (
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
            <button type="button" onClick={onOpenNoteHistory}>Note history <History size={16} /></button>
            <button type="button" onClick={onExportPdf}>Export PDF <Download size={16} /></button>
            <button type="button" onClick={onExportDocx}>Export DOCX <FileText size={16} /></button>
            <button type="button" className="danger" onClick={onDeleteNote}>Delete note</button>
          </div>
        </div>
      )}
      <div
        className={`floating-editor-bar scroll-hover ${aiPromptFocused ? 'is-prompt-open' : ''} ${aiRunning ? 'is-thinking' : ''}`}
        role="toolbar"
        aria-label="Editor tools"
      >
        <div className="toolbar-zone toolbar-zone-left">
          <button type="button" className="toolbar-text-button toolbar-text-button--primary" onClick={onAtomise}>Atomise</button>
          <span className="toolbar-divider" aria-hidden />
          <button type="button" className="toolbar-text-button toolbar-text-button--muted" onClick={onToggleFormat}>Format</button>
        </div>
        <span className="toolbar-structural-divider" aria-hidden />
        <label className={`floating-ai-prompt ${aiPromptFocused ? 'is-open' : ''}`} onMouseDown={onPromptMouseDown}>
          <Sparkles size={16} aria-hidden />
          {visibleAICommand && (
            <span className={`ai-mode-pill ai-mode-pill--${activeAICommand}`}>
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
            disabled={aiRunning}
            placeholder={aiRunning ? 'Working...' : 'Ask AI...'}
          />
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
              type="button"
              className={`highlight-button ${highlighterArmed ? 'is-armed' : ''}`}
              aria-label="Highlight"
              title={highlighterArmed ? 'Highlight mode active' : 'Highlight selected text'}
              aria-pressed={highlighterArmed}
              aria-expanded={highlightPaletteOpen}
              onMouseDown={(event) => {
                event.preventDefault()
                onToggleHighlight()
              }}
              onDoubleClick={(event) => {
                event.preventDefault()
                onToggleHighlightPalette()
              }}
            >
              <Highlighter size={15} aria-hidden />
              <span className="highlight-swatch" style={{ background: highlighterColor }} aria-hidden />
            </button>
            {highlightPaletteOpen && (
              <div className="highlight-palette" aria-label="Highlight colours">
                {highlighterColors.map((color) => (
                  <button
                    type="button"
                    key={color}
                    className={color === highlighterColor ? 'is-active' : ''}
                    style={{ background: color }}
                    aria-label={`Use highlight colour ${color}`}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      onSelectHighlightColor(color)
                    }}
                  />
                ))}
              </div>
            )}
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
    </div>
  )
}
