interface Props {
  bpm: number
  isPlaying: boolean
  loopEnabled: boolean
  onPlay: () => void
  onStop: () => void
  onBpmChange: (bpm: number) => void
  onLoopToggle: () => void
  onExportWav: () => void
  onExportMidi: () => void
}

export function TransportBar({
  bpm, isPlaying, loopEnabled,
  onPlay, onStop, onBpmChange, onLoopToggle,
  onExportWav, onExportMidi,
}: Props) {
  return (
    <div className="transport-bar">
      <button className="transport-btn" onClick={isPlaying ? onStop : onPlay}>
        {isPlaying ? 'STOP' : 'PLAY'}
      </button>

      <div className="bpm-control">
        <label>BPM</label>
        <input
          type="number"
          min={40}
          max={300}
          value={bpm}
          onChange={e => onBpmChange(Number(e.target.value))}
        />
      </div>

      <button
        className={`transport-btn loop-btn ${loopEnabled ? 'active' : ''}`}
        onClick={onLoopToggle}
      >
        LOOP
      </button>

      <button className="transport-btn export-btn" onClick={onExportWav}>
        WAV
      </button>

      <button className="transport-btn export-btn" onClick={onExportMidi}>
        MIDI
      </button>
    </div>
  )
}
