export type StepLevel = 0 | 1 | 2 | 3
export type RowId = 'HH' | 'SN' | 'HT' | 'FT' | 'KD'
export type Grid = Record<RowId, StepLevel[]>

export interface AppState {
  grid: Grid
  bpm: number
  isPlaying: boolean
  loopEnabled: boolean
  rowKnobs: Record<RowId, 1 | 2 | 3>
  currentStep: number
}
