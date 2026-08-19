import { useState, useCallback } from 'react'
import type { Grid, RowId, StepLevel, AppState } from '../types'

const ROW_IDS: RowId[] = ['HH', 'SN', 'HT', 'FT', 'KD']

function makeEmptyGrid(): Grid {
  return Object.fromEntries(ROW_IDS.map(id => [id, Array(8).fill(0)])) as Grid
}

function makeDefaultKnobs(): Record<RowId, 1 | 2 | 3> {
  return Object.fromEntries(ROW_IDS.map(id => [id, 2])) as Record<RowId, 1 | 2 | 3>
}

export function useAppState() {
  const [state, setState] = useState<AppState>({
    grid: makeEmptyGrid(),
    bpm: 120,
    isPlaying: false,
    loopEnabled: true,
    rowKnobs: makeDefaultKnobs(),
    currentStep: 0,
  })

  const setCell = useCallback((row: RowId, step: number, level: StepLevel) => {
    setState(s => ({
      ...s,
      grid: { ...s.grid, [row]: s.grid[row].map((v, i) => (i === step ? level : v)) },
    }))
  }, [])

  const setRowKnob = useCallback((row: RowId, value: 1 | 2 | 3) => {
    setState(s => ({ ...s, rowKnobs: { ...s.rowKnobs, [row]: value } }))
  }, [])

  const setBpm = useCallback((bpm: number) => {
    setState(s => ({ ...s, bpm }))
  }, [])

  const setPlaying = useCallback((isPlaying: boolean) => {
    setState(s => ({ ...s, isPlaying }))
  }, [])

  const setLoopEnabled = useCallback((loopEnabled: boolean) => {
    setState(s => ({ ...s, loopEnabled }))
  }, [])

  const setCurrentStep = useCallback((currentStep: number) => {
    setState(s => ({ ...s, currentStep }))
  }, [])

  return { state, setCell, setRowKnob, setBpm, setPlaying, setLoopEnabled, setCurrentStep }
}
