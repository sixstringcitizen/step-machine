import type { StepLevel } from '../types'

interface Props {
  level: StepLevel
  onChange: (level: StepLevel) => void
  onPreview: () => void
}

export function GridCell({ level, onChange, onPreview }: Props) {
  const handleClick = () => {
    const next: StepLevel = level === 0 ? 1 : 0
    onChange(next)
    if (next > 0) onPreview()
  }

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (e.buttons === 1 && level === 0) {
      onChange(1)
      onPreview()
    }
  }

  return (
    <div
      className={`grid-cell ${level > 0 ? 'on' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
    />
  )
}
