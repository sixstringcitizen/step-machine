import { GridCell } from './GridCell'
import { RowKnob } from './RowKnob'
import type { RowId, StepLevel } from '../types'

interface Props {
  rowId: RowId
  values: StepLevel[]
  rowKnob: 1 | 2 | 3
  onChangeCell: (step: number, level: StepLevel) => void
  onPreviewCell: (level: StepLevel) => void
  onChangeKnob: (value: 1 | 2 | 3) => void
}

export function GridRow({ values, rowKnob, onChangeCell, onPreviewCell, onChangeKnob }: Props) {
  return (
    <div className="grid-row">
      {values.map((level, i) => (
        <GridCell
          key={i}
          level={level}
          onChange={next => onChangeCell(i, next)}
          onPreview={() => onPreviewCell(level || 1)}
        />
      ))}
      <RowKnob value={rowKnob} onChange={onChangeKnob} />
    </div>
  )
}
