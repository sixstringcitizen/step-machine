import { GridRow } from './GridRow'
import { InstrumentLabels } from './InstrumentLabels'
import { previewNote } from '../audio/sequencer'
import { calcVelocity } from '../utils/velocityMap'
import type { Grid as GridType, RowId, StepLevel } from '../types'

const ROW_IDS: RowId[] = ['HH', 'SN', 'HT', 'FT', 'KD']

interface Props {
  grid: GridType
  rowKnobs: Record<RowId, 1 | 2 | 3>
  onCellChange: (row: RowId, step: number, level: StepLevel) => void
  onKnobChange: (row: RowId, value: 1 | 2 | 3) => void
}

export function Grid({ grid, rowKnobs, onCellChange, onKnobChange }: Props) {
  return (
    <div className="grid-container">
      <InstrumentLabels rows={ROW_IDS} />
      <div className="grid">
        {ROW_IDS.map(row => (
          <GridRow
            key={row}
            rowId={row}
            values={grid[row]}
            rowKnob={rowKnobs[row]}
            onChangeCell={(step, level) => onCellChange(row, step, level)}
            onPreviewCell={(level) => previewNote(row, calcVelocity(level, rowKnobs[row]))}
            onChangeKnob={(value) => onKnobChange(row, value)}
          />
        ))}
      </div>
    </div>
  )
}
