# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Step Machine is a browser-based drum machine — a tactile instrument, not a DAW. Retro hardware aesthetic, sound as primary feedback.

## Stack

- React + TypeScript
- Tone.js (audio engine + offline render for WAV export)
- `@tonejs/midi` for MIDI export
- No backend

## Commands

```bash
npm install
npm run dev      # start dev server
npm run build
npm run lint
npm test         # run tests (if applicable)
```

## Core data model

```ts
type StepLevel = 0 | 1 | 2 | 3   // 0 = off, 1–3 = intensity
type RowId = "HH" | "CYM" | "HT" | "FT" | "KD"
type Grid = Record<RowId, StepLevel[]>  // 5 rows × 8 steps (fixed)

interface AppState {
  grid: Grid
  bpm: number
  isPlaying: boolean
  loopEnabled: boolean
  rowKnobs: Record<RowId, 1 | 2 | 3>
  currentStep: number
}
```

## Component hierarchy

```
App                  — global state, Tone.js init
├── TransportBar     — play/stop, BPM, loop toggle, WAV/MIDI export
└── Grid             — tap + drag painting, sound preview on interaction
    └── GridRow      — label + 8 cells + RowKnob
        ├── GridCell — click cycles 0→1→2→3→0; drag paints level 1 only
        └── RowKnob  — 3-step rotary, values 1|2|3
```

## Audio engine (`src/audio/`)

- `toneEngine.ts` — `initAudio()`, play/stop, BPM sync
- `sampler.ts` — `Tone.Sampler` loading from `/samples/` (hh.wav, cym.wav, ht.wav, ft.wav, kick.wav)
- `sequencer.ts` — `Tone.Transport.scheduleRepeat` at `"8n"` steps

**Velocity rule:**
```
level 1 → 0.4,  level 2 → 0.7,  level 3 → 1.0
finalVelocity = baseVelocity * (rowKnob / 3), clamped to 1.0
```

## File structure

```
src/
  components/   App, TransportBar, Grid, GridRow, GridCell, RowKnob, InstrumentLabels
  audio/        toneEngine.ts, sampler.ts, sequencer.ts
  state/        useAppState.ts
  utils/        exportWav.ts, exportMidi.ts, velocityMap.ts
public/
  samples/      hh.wav, cym.wav, ht.wav, ft.wav, kick.wav
```

## Implementation rules

- **Grid visuals are binary** (off = chrome outline, on = filled circle) — intensity is audio-only, not visual
- **RowKnob is the only visible intensity control**
- No playhead UI
- No animation transitions on grid cells
- Interactions must be immediate (no delays)
- Keep state management simple — `useAppState` hook, no external state library needed
- Font: Eurostile, ALL CAPS; row labels have slight CSS rotation jitter (−1° to +1°)
- Background: warm wood texture; panels use inset shadows for hardware depth
