import * as Tone from 'tone'

export async function initAudio() {
  await Tone.start()
}

export function startTransport(bpm: number) {
  Tone.getTransport().bpm.value = bpm
  Tone.getTransport().start()
}

export function stopTransport() {
  Tone.getTransport().stop()
}

export function setBpm(bpm: number) {
  Tone.getTransport().bpm.value = bpm
}
