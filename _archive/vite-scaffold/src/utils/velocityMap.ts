import type { StepLevel } from '../types'

const BASE: Record<StepLevel, number> = { 0: 0, 1: 0.4, 2: 0.7, 3: 1.0 }

export function calcVelocity(level: StepLevel, rowKnob: 1 | 2 | 3): number {
  return Math.min(BASE[level] * (rowKnob / 3), 1.0)
}
