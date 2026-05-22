import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Brackets,
  ChevronsLeftRight,
  Columns2,
  Copy,
  Crop,
  Heading3,
  ImageUpscale,
  Merge,
  Plus,
  PlusCircle,
  Quote,
  Split,
  TableColumnsSplit,
  TableRowsSplit,
} from 'lucide-react'
import type { FormatBlockType } from '../../editor/blocks'

type TableCommand =
  | 'addRow'
  | 'removeRow'
  | 'addColumn'
  | 'removeColumn'
  | 'toggleHeader'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'mergeCells'
  | 'splitCell'
  | 'resetSize'

type ImageControlsProps = {
  imageCropEditing: boolean
  onFitImage: () => void
  onToggleCrop: () => void
  onCycleAspect: () => void
  onZoomOut: () => void
  onZoomIn: () => void
  onAlignImage: (align: 'left' | 'center' | 'right') => void
}

export type FormatSideControlsProps = ImageControlsProps & {
  type: FormatBlockType
  top: number
  left: number
  onTableCommand: (command: TableCommand) => void
  onAddListLine: () => void
  onCopyCode: () => void
  onEditLatex: () => void
  onCopyLatex: () => void
  onToggleQuoteAuthor: () => void
}

export function FormatSideControls({
  type,
  top,
  left,
  imageCropEditing,
  onTableCommand,
  onAddListLine,
  onCopyCode,
  onEditLatex,
  onCopyLatex,
  onToggleQuoteAuthor,
  onFitImage,
  onToggleCrop,
  onCycleAspect,
  onZoomOut,
  onZoomIn,
  onAlignImage,
}: FormatSideControlsProps) {
  return (
    <div className="format-side-controls" style={{ top, left }} onMouseDown={(event) => event.preventDefault()}>
      {type === 'table' && (
        <>
          <button type="button" title="Add row" aria-label="Add table row" onClick={() => onTableCommand('addRow')}><Plus aria-hidden /></button>
          <button type="button" title="Remove row" aria-label="Remove table row" onClick={() => onTableCommand('removeRow')}><TableRowsSplit aria-hidden /></button>
          <button type="button" title="Add column" aria-label="Add table column" onClick={() => onTableCommand('addColumn')}><Columns2 aria-hidden /></button>
          <button type="button" title="Remove column" aria-label="Remove table column" onClick={() => onTableCommand('removeColumn')}><TableColumnsSplit aria-hidden /></button>
          <button type="button" title="Toggle header row" aria-label="Toggle table header row" onClick={() => onTableCommand('toggleHeader')}><Heading3 aria-hidden /></button>
          <button type="button" title="Align left" aria-label="Align table cell left" onClick={() => onTableCommand('alignLeft')}><AlignLeft aria-hidden /></button>
          <button type="button" title="Align center" aria-label="Align table cell center" onClick={() => onTableCommand('alignCenter')}><AlignCenter aria-hidden /></button>
          <button type="button" title="Align right" aria-label="Align table cell right" onClick={() => onTableCommand('alignRight')}><AlignRight aria-hidden /></button>
          <button type="button" title="Merge selected cells" aria-label="Merge selected table cells" onClick={() => onTableCommand('mergeCells')}><Merge aria-hidden /></button>
          <button type="button" title="Split cell" aria-label="Split merged table cell" onClick={() => onTableCommand('splitCell')}><Split aria-hidden /></button>
          <button type="button" title="Reset cell width" aria-label="Reset selected table cell width" onClick={() => onTableCommand('resetSize')}><ChevronsLeftRight aria-hidden /></button>
        </>
      )}
      {(type === 'checklist' || type === 'bulletList' || type === 'numberedList') && (
        <button type="button" title="Add list line" aria-label="Add another list line" onClick={onAddListLine}><PlusCircle aria-hidden /></button>
      )}
      {type === 'code' && (
        <button type="button" title="Copy code" aria-label="Copy code block" onClick={onCopyCode}><Copy aria-hidden /></button>
      )}
      {type === 'latex' && (
        <>
          <button type="button" title="Edit equation" aria-label="Edit LaTeX equation source" onClick={onEditLatex}><Brackets aria-hidden /></button>
          <button type="button" title="Copy equation" aria-label="Copy LaTeX equation" onClick={onCopyLatex}><Copy aria-hidden /></button>
        </>
      )}
      {type === 'quote' && (
        <button type="button" title="Toggle author" aria-label="Toggle quote author" onClick={onToggleQuoteAuthor}><Quote aria-hidden /></button>
      )}
      {type === 'image' && (
        <>
          <button type="button" title="Fit image" aria-label="Fit image to page width" onClick={onFitImage}><ImageUpscale aria-hidden /></button>
          <button type="button" aria-label={imageCropEditing ? 'Finish cropping image' : 'Crop image'} onClick={onToggleCrop}>
            <Crop aria-hidden />
          </button>
          <button className="format-side-control-wide" type="button" aria-label="Cycle crop aspect ratio" onClick={onCycleAspect}><span aria-hidden>Aspect</span></button>
          {imageCropEditing && (
            <>
              <button type="button" aria-label="Zoom crop out" onClick={onZoomOut}><span aria-hidden>Z-</span></button>
              <button type="button" aria-label="Zoom crop in" onClick={onZoomIn}><span aria-hidden>Z+</span></button>
            </>
          )}
          <button type="button" aria-label="Align image left" onClick={() => onAlignImage('left')}><span aria-hidden>L</span></button>
          <button type="button" aria-label="Align image center" onClick={() => onAlignImage('center')}><span aria-hidden>C</span></button>
          <button type="button" aria-label="Align image right" onClick={() => onAlignImage('right')}><span aria-hidden>R</span></button>
        </>
      )}
    </div>
  )
}
