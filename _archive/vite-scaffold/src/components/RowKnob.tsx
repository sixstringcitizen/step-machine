interface Props {
  value: 1 | 2 | 3
  onChange: (value: 1 | 2 | 3) => void
}

const ROTATION: Record<1 | 2 | 3, number> = { 1: -45, 2: 0, 3: 45 }

export function RowKnob({ value, onChange }: Props) {
  const handleClick = () => {
    onChange(((value % 3) + 1) as 1 | 2 | 3)
  }

  return (
    <div className="row-knob" onClick={handleClick} title={`Level ${value}`}>
      <div
        className="row-knob-indicator"
        style={{ transform: `rotate(${ROTATION[value]}deg)` }}
      />
    </div>
  )
}
