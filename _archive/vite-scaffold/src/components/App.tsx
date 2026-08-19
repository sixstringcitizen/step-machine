import { useEffect, useRef } from 'react'
import { TransportBar } from './TransportBar'
import { Grid } from './Grid'
import { useAppState } from '../state/useAppState'
import { initAudio, startTransport, stopTransport, setBpm } from '../audio/toneEngine'
import { startSequencer, stopSequencer, updateSequencerState } from '../audio/sequencer'
import { exportWav } from '../utils/exportWav'
import { exportMidi } from '../utils/exportMidi'

export default function App() {
  const { state, setCell, setRowKnob, setBpm: updateBpm, setPlaying, setLoopEnabled, setCurrentStep } = useAppState()
  const audioReady = useRef(false)

  const ensureAudio = async () => {
    if (!audioReady.current) {
      await initAudio()
      audioReady.current = true
    }
  }

  useEffect(() => {
    updateSequencerState({
      grid: state.grid,
      rowKnobs: state.rowKnobs,
      loopEnabled: state.loopEnabled,
    })
  }, [state.grid, state.rowKnobs, state.loopEnabled])

  useEffect(() => {
    setBpm(state.bpm)
  }, [state.bpm])

  const handlePlay = async () => {
    await ensureAudio()
    startSequencer(
      { grid: state.grid, rowKnobs: state.rowKnobs, loopEnabled: state.loopEnabled },
      setCurrentStep
    )
    startTransport(state.bpm)
    setPlaying(true)
  }

  const handleStop = () => {
    stopSequencer()
    stopTransport()
    setPlaying(false)
    setCurrentStep(0)
  }

  const handleBpmChange = (bpm: number) => {
    updateBpm(bpm)
  }

  const handleExportWav = async () => {
    await ensureAudio()
    exportWav({ grid: state.grid, rowKnobs: state.rowKnobs, bpm: state.bpm })
  }

  const handleExportMidi = () => {
    exportMidi({ grid: state.grid, rowKnobs: state.rowKnobs, bpm: state.bpm })
  }

  return (
    <div className="app">
      <h1 className="app-title">STEP MACHINE</h1>
      <div className="machine-body">
        <TransportBar
          bpm={state.bpm}
          isPlaying={state.isPlaying}
          loopEnabled={state.loopEnabled}
          onPlay={handlePlay}
          onStop={handleStop}
          onBpmChange={handleBpmChange}
          onLoopToggle={() => setLoopEnabled(!state.loopEnabled)}
          onExportWav={handleExportWav}
          onExportMidi={handleExportMidi}
        />
        <Grid
          grid={state.grid}
          rowKnobs={state.rowKnobs}
          onCellChange={setCell}
          onKnobChange={setRowKnob}
        />
      </div>
    </div>
  )
}
