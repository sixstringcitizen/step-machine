// Audio engine — Tone.js wrapper
// Synthesized drum voices (no external samples needed)

const TRACKS = [
  { id: 'HH', name: 'Hi-Hat',   sub: 'Hat' },
  { id: 'SN', name: 'Snare',    sub: 'Snr' },
  { id: 'HT', name: 'High Tom', sub: 'Tom1' },
  { id: 'FT', name: 'Floor Tom',sub: 'Tom2' },
  { id: 'KD', name: 'Kick',     sub: 'Kick' },
];

const STEPS = 8;
const KNOB_GAINS = [0.5, 0.85, 1.15]; // 1 / 2 / 3

class StepEngine {
  constructor() {
    this.ready = false;
    this.voices = {};
    this.master = null;
    this.loopId = null;
    this.tickListeners = new Set();
    this.bpm = 110;
  }

  async init() {
    if (this.ready) return;
    await Tone.start();
    this.master = new Tone.Gain(0.85).toDestination();
    const limiter = new Tone.Limiter(-1).connect(this.master);

    // KICK
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.04,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.32, sustain: 0.0, release: 0.5 },
    });
    const kickGain = new Tone.Gain(1).connect(limiter);
    kick.connect(kickGain);
    this.voices.KD = { node: kick, gain: kickGain, trigger: (t, vel) => {
      kick.triggerAttackRelease('C2', '8n', t, vel);
    }};

    // SNARE — noise + body
    const snareNoise = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0 },
    });
    const snareBody = new Tone.MembraneSynth({
      pitchDecay: 0.02, octaves: 4,
      envelope: { attack: 0.001, decay: 0.12, sustain: 0 },
    });
    const snareHpf = new Tone.Filter(1500, 'highpass');
    const snareGain = new Tone.Gain(0.7).connect(limiter);
    snareNoise.connect(snareHpf); snareHpf.connect(snareGain);
    snareBody.connect(snareGain);
    this.voices.SN = { node: snareNoise, gain: snareGain, trigger: (t, vel) => {
      snareNoise.triggerAttackRelease('16n', t, vel);
      snareBody.triggerAttackRelease('G2', '16n', t, vel * 0.7);
    }};

    // HIHAT — metallic noise, short
    const hh = new Tone.MetalSynth({
      frequency: 250,
      envelope: { attack: 0.001, decay: 0.12, release: 0.04 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    });
    const hhHpf = new Tone.Filter(5000, 'highpass');
    const hhGain = new Tone.Gain(0.7).connect(limiter);
    hh.connect(hhHpf); hhHpf.connect(hhGain);
    this.voices.HH = { node: hh, gain: hhGain, trigger: (t, vel) => {
      hh.triggerAttackRelease('32n', t, vel * 0.9);
    }};

    // HIGH TOM
    const ht = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 4,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0 },
    });
    const htGain = new Tone.Gain(0.7).connect(limiter);
    ht.connect(htGain);
    this.voices.HT = { node: ht, gain: htGain, trigger: (t, vel) => {
      ht.triggerAttackRelease('A2', '8n', t, vel);
    }};

    // FLOOR TOM
    const ft = new Tone.MembraneSynth({
      pitchDecay: 0.06, octaves: 4,
      envelope: { attack: 0.001, decay: 0.45, sustain: 0 },
    });
    const ftGain = new Tone.Gain(0.75).connect(limiter);
    ft.connect(ftGain);
    this.voices.FT = { node: ft, gain: ftGain, trigger: (t, vel) => {
      ft.triggerAttackRelease('E2', '8n', t, vel);
    }};

    Tone.Transport.bpm.value = this.bpm;
    this.ready = true;
  }

  setKnob(trackId, position /* 0,1,2 */) {
    const v = this.voices[trackId];
    if (!v) return;
    v.gain.gain.rampTo(KNOB_GAINS[position] ?? 0.85, 0.05);
  }

  setBpm(bpm) {
    this.bpm = bpm;
    if (Tone.Transport) Tone.Transport.bpm.rampTo(bpm, 0.05);
  }

  triggerOne(trackId, velocity = 1) {
    const v = this.voices[trackId];
    if (!v) return;
    try { v.trigger(Tone.now(), velocity); } catch(e) {}
  }

  start(getPattern, onTick) {
    if (this.loopId !== null) return;
    let step = 0;
    this.loopId = Tone.Transport.scheduleRepeat((time) => {
      const pattern = getPattern();
      TRACKS.forEach(t => {
        if (pattern[t.id] && pattern[t.id][step]) {
          this.voices[t.id].trigger(time, 1);
        }
      });
      Tone.Draw.schedule(() => onTick && onTick(step), time);
      step = (step + 1) % STEPS;
    }, '8n');
    Tone.Transport.start();
  }

  stop() {
    if (this.loopId !== null) {
      Tone.Transport.clear(this.loopId);
      this.loopId = null;
    }
    Tone.Transport.stop();
    Tone.Transport.position = 0;
  }
}

window.StepEngine = StepEngine;
window.STEP_TRACKS = TRACKS;
window.STEP_COUNT = STEPS;
window.STEP_KNOB_GAINS = KNOB_GAINS;
