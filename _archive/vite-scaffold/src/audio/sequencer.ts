import * as Tone from 'tone'
import { players } from './sampler'
import { calcVelocity } from '../utils/velocityMap'
import type { RowId, AppState } from '../types'

const ROW_IDS: RowId[] = ['HH', 'SN', 'HT', 'FT', 'KD']

let scheduleId: number | null = null
let stepRef = 0
let stateRef: Pick<AppState, 'grid' | 'rowKnobs' | 'loopEnabled'> | null = null

export function updateSequencerState(
  state: Pick<AppState, 'grid' | 'rowKnobs' | 'loopEnabled'>
) {
  stateRef = state
}

export function startSequencer(
  state: Pick<AppState, 'grid' | 'rowKnobs' | 'loopEnabled'>,
  onStep: (step: number) => void
) {
  stateRef = state
  stepRef = 0

  scheduleId = Tone.getTransport().scheduleRepeat((time) => {
    if (!stateRef) return

    const step = stepRef
    ROW_IDS.forEach(row => {
      const level = stateRef!.grid[row][step]
      if (level > 0) {
        const velocity = calcVelocity(level, stateRef!.rowKnobs[row])
        const player = players[row]
        player.volume.value = Tone.gainToDb(velocity)
        player.start(time)
      }
    })

    onStep(step)
    stepRef = (step + 1) % 8
  }, '8n')
}

export function stopSequencer() {
  if (scheduleId !== null) {
    Tone.getTransport().clear(scheduleId)
    scheduleId = null
  }
  stepRef = 0
}

export function previewNote(row: RowId, velocity: number) {
  const player = players[row]
  player.volume.value = Tone.gainToDb(velocity)
  player.start(Tone.now())
}
