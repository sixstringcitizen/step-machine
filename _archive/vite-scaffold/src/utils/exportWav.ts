import * as Tone from 'tone'
import { saveAs } from 'file-saver'
import { calcVelocity } from './velocityMap'
import type { AppState, RowId } from '../types'

const ROW_IDS: RowId[] = ['HH', 'SN', 'HT', 'FT', 'KD']

export async function exportWav(state: Pick<AppState, 'grid' | 'rowKnobs' | 'bpm'>) {
  const stepDuration = (60 / state.bpm) / 2  // 8th note in seconds
  const totalDuration = stepDuration * 8

  const sampleUrls: Record<RowId, string> = {
    HH: '/samples/hh-hi-hat.wav',
    SN: '/samples/sn-snare-drum.wav',
    HT: '/samples/ht-high-tom.wav',
    FT: '/samples/ft-floor-tom.wav',
    KD: '/samples/kd-kick-drum.wav',
  }

  const buffer = await Tone.Offline(async () => {
    const offlinePlayers: Record<RowId, Tone.Player> = {
      HH: new Tone.Player(sampleUrls.HH).toDestination(),
      SN: new Tone.Player(sampleUrls.SN).toDestination(),
      HT: new Tone.Player(sampleUrls.HT).toDestination(),
      FT: new Tone.Player(sampleUrls.FT).toDestination(),
      KD: new Tone.Player(sampleUrls.KD).toDestination(),
    }

    await Tone.loaded()

    for (let step = 0; step < 8; step++) {
      ROW_IDS.forEach(row => {
        const level = state.grid[row][step]
        if (level > 0) {
          const velocity = calcVelocity(level, state.rowKnobs[row])
          const player = offlinePlayers[row]
          player.volume.value = Tone.gainToDb(velocity)
          player.start(step * stepDuration)
        }
      })
    }
  }, totalDuration)

  const wavBlob = bufferToWav(buffer)
  saveAs(wavBlob, 'step-machine.wav')
}

function bufferToWav(buffer: Tone.ToneAudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const length = buffer.length

  const arrayBuffer = new ArrayBuffer(44 + length * numChannels * 2)
  const view = new DataView(arrayBuffer)

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  function writeUint16(offset: number, v: number) { view.setUint16(offset, v, true) }
  function writeUint32(offset: number, v: number) { view.setUint32(offset, v, true) }

  writeString(0, 'RIFF')
  writeUint32(4, 36 + length * numChannels * 2)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  writeUint32(16, 16)
  writeUint16(20, 1)
  writeUint16(22, numChannels)
  writeUint32(24, sampleRate)
  writeUint32(28, sampleRate * numChannels * 2)
  writeUint16(32, numChannels * 2)
  writeUint16(34, 16)
  writeString(36, 'data')
  writeUint32(40, length * numChannels * 2)

  let offset = 44
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}
