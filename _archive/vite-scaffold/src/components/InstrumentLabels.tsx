import type { RowId } from '../types'

const JITTER: Record<RowId, number> = {
  HH: -0.8,
  SN:  0.5,
  HT: -0.3,
  FT:  0.9,
  KD: -0.6,
}

interface Props {
  rows: RowId[]
}

export function InstrumentLabels({ rows }: Props) {
  return (
    <div className="instrument-labels">
      {rows.map(id => (
        <div
          key={id}
          className="instrument-label"
          style={{ transform: `rotate(${JITTER[id]}deg)` }}
        >
          {id}
        </div>
      ))}
    </div>
  )
}
