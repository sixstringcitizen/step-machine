import { Midi } from '@tonejs/midi'
import { saveAs } from 'file-saver'
import type { AppState, RowId } from '../types'

const ROW_IDS: RowId[] = ['HH', 'SN', 'HT', 'FT', 'KD']

// GM drum note numbers
const DRUM_NOTES: Record<RowId, number> = {
  KD: 36,
  SN: 38,
  HT: 50,
  FT: 43,
  HH: 42,
}

export function exportMidi(state: Pick<AppState, 'grid' | 'rowKnobs' | 'bpm'>) {
  const midi = new Midi()
  midi.header.setTempo(state.bpm)
  const track = midi.addTrack()

  const stepDuration = 0.5  // 8th note at 120bpm baseline; scaled by bpm in header

  ROW_IDS.forEach(row => {
    state.grid[row].forEach((level, step) => {
      if (level === 0) return
      const velocity = Math.round(
        [0, 0.4, 0.7, 1.0][level] * (state.rowKnobs[row] / 3) * 127
      )
      track.addNote({
        midi: DRUM_NOTES[row],
        time: step * stepDuration,
        duration: 0.1,
        velocity: Math.min(velocity, 127) / 127,
      })
    })
  })

  saveAs(new Blob([midi.toArray().buffer as ArrayBuffer], { type: 'audio/midi' }), 'step-machine.mid')
}
