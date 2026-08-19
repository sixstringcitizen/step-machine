import * as Tone from 'tone'
import type { RowId } from '../types'

export const players: Record<RowId, Tone.Player> = {
  HH: new Tone.Player('/samples/hh-hi-hat.wav').toDestination(),
  SN: new Tone.Player('/samples/sn-snare-drum.wav').toDestination(),
  HT: new Tone.Player('/samples/ht-high-tom.wav').toDestination(),
  FT: new Tone.Player('/samples/ft-floor-tom.wav').toDestination(),
  KD: new Tone.Player('/samples/kd-kick-drum.wav').toDestination(),
}

export async function waitForSamples() {
  await Tone.loaded()
}
