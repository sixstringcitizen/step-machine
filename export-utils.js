// WAV + MIDI export

// ---------- WAV ----------
function audioBufferToWav(buffer) {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const length = buffer.length * numCh * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);
  let offset = 0;
  function writeStr(s) { for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i)); }
  function w16(v) { view.setUint16(offset, v, true); offset += 2; }
  function w32(v) { view.setUint32(offset, v, true); offset += 4; }
  writeStr('RIFF'); w32(length - 8); writeStr('WAVE');
  writeStr('fmt '); w32(16); w16(1); w16(numCh);
  w32(sampleRate); w32(sampleRate * numCh * 2);
  w16(numCh * 2); w16(bitDepth);
  writeStr('data'); w32(buffer.length * numCh * 2);
  // interleave
  const channels = [];
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([out], { type: 'audio/wav' });
}

async function renderLoopToWav(pattern, knobPositions, bpm) {
  const stepDur = 60 / bpm / 2; // 8th notes
  const totalDur = stepDur * window.STEP_COUNT + 0.6; // tail
  const buffer = await Tone.Offline(async ({ transport }) => {
    transport.bpm.value = bpm;
    const limiter = new Tone.Limiter(-1).toDestination();

    const make = {
      KD: () => {
        const k = new Tone.MembraneSynth({ pitchDecay:0.04, octaves:6,
          envelope:{attack:0.001,decay:0.32,sustain:0,release:0.5}});
        const g = new Tone.Gain(1); k.connect(g); g.connect(limiter);
        return { g, fire: (t,v) => k.triggerAttackRelease('C2','8n',t,v) };
      },
      SN: () => {
        const n = new Tone.NoiseSynth({ envelope:{attack:0.001,decay:0.18,sustain:0}});
        const b = new Tone.MembraneSynth({ pitchDecay:0.02, octaves:4,
          envelope:{attack:0.001,decay:0.12,sustain:0}});
        const hp = new Tone.Filter(1500,'highpass');
        const g = new Tone.Gain(0.7); n.connect(hp); hp.connect(g); b.connect(g); g.connect(limiter);
        return { g, fire: (t,v) => { n.triggerAttackRelease('16n',t,v); b.triggerAttackRelease('G2','16n',t,v*0.7); } };
      },
      HH: () => {
        const h = new Tone.MetalSynth({ frequency:250, envelope:{attack:0.001,decay:0.08,release:0.02},
          harmonicity:5.1, modulationIndex:32, resonance:4000, octaves:1.5});
        const hp = new Tone.Filter(7000,'highpass');
        const g = new Tone.Gain(0.22); h.connect(hp); hp.connect(g); g.connect(limiter);
        return { g, fire: (t,v) => h.triggerAttackRelease('32n',t,v*0.9) };
      },
      HT: () => {
        const m = new Tone.MembraneSynth({ pitchDecay:0.05, octaves:4,
          envelope:{attack:0.001,decay:0.3,sustain:0}});
        const g = new Tone.Gain(0.7); m.connect(g); g.connect(limiter);
        return { g, fire: (t,v) => m.triggerAttackRelease('A2','8n',t,v) };
      },
      FT: () => {
        const m = new Tone.MembraneSynth({ pitchDecay:0.06, octaves:4,
          envelope:{attack:0.001,decay:0.45,sustain:0}});
        const g = new Tone.Gain(0.75); m.connect(g); g.connect(limiter);
        return { g, fire: (t,v) => m.triggerAttackRelease('E2','8n',t,v) };
      },
    };
    const voices = {};
    for (const t of window.STEP_TRACKS) {
      voices[t.id] = make[t.id]();
      voices[t.id].g.gain.value = (window.STEP_KNOB_GAINS[knobPositions[t.id]] ?? 0.85);
    }
    for (let i = 0; i < window.STEP_COUNT; i++) {
      const t = i * stepDur;
      for (const tr of window.STEP_TRACKS) {
        if (pattern[tr.id] && pattern[tr.id][i]) voices[tr.id].fire(t, 1);
      }
    }
    transport.start();
  }, totalDur, 2);

  return audioBufferToWav(buffer.get ? buffer.get() : buffer);
}

// ---------- MIDI ----------
// Minimal SMF Type 0 writer
function midiVarLen(value) {
  const bytes = [];
  bytes.push(value & 0x7f);
  value >>= 7;
  while (value > 0) {
    bytes.unshift(0x80 | (value & 0x7f));
    value >>= 7;
  }
  return bytes;
}
function buildMidi(pattern, bpm) {
  // GM drum notes (channel 10 / 9 zero-indexed)
  const noteMap = { KD: 36, SN: 38, HH: 42, HT: 50, FT: 41 };
  const ticksPerBeat = 480;
  const stepTicks = ticksPerBeat / 2; // 8th notes
  // gather events
  const events = []; // {tick, type:'on'|'off', note}
  for (let i = 0; i < window.STEP_COUNT; i++) {
    for (const tr of window.STEP_TRACKS) {
      if (pattern[tr.id] && pattern[tr.id][i]) {
        const note = noteMap[tr.id];
        const onTick = i * stepTicks;
        const offTick = onTick + Math.floor(stepTicks * 0.4);
        events.push({ tick: onTick, type: 'on', note });
        events.push({ tick: offTick, type: 'off', note });
      }
    }
  }
  events.sort((a,b) => a.tick - b.tick || (a.type === 'off' ? -1 : 1));

  const tempoBytes = (() => {
    const microsPerBeat = Math.round(60000000 / bpm);
    return [(microsPerBeat >> 16) & 0xff, (microsPerBeat >> 8) & 0xff, microsPerBeat & 0xff];
  })();

  const trackBytes = [];
  // tempo meta
  trackBytes.push(0x00, 0xff, 0x51, 0x03, ...tempoBytes);
  // time sig 4/4
  trackBytes.push(0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  let lastTick = 0;
  for (const ev of events) {
    const delta = ev.tick - lastTick;
    lastTick = ev.tick;
    trackBytes.push(...midiVarLen(delta));
    const status = ev.type === 'on' ? 0x99 : 0x89; // ch 10
    trackBytes.push(status, ev.note, ev.type === 'on' ? 100 : 0);
  }
  // end of loop tick
  const endDelta = (window.STEP_COUNT * stepTicks) - lastTick;
  trackBytes.push(...midiVarLen(Math.max(0, endDelta)), 0xff, 0x2f, 0x00);

  // Header
  const header = [
    0x4d,0x54,0x68,0x64, 0,0,0,6,
    0,0, 0,1, (ticksPerBeat>>8)&0xff, ticksPerBeat & 0xff,
  ];
  const trackHeader = [0x4d,0x54,0x72,0x6b,
    (trackBytes.length >> 24) & 0xff,
    (trackBytes.length >> 16) & 0xff,
    (trackBytes.length >> 8) & 0xff,
    trackBytes.length & 0xff];
  return new Blob([new Uint8Array([...header, ...trackHeader, ...trackBytes])], { type: 'audio/midi' });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

window.renderLoopToWav = renderLoopToWav;
window.buildMidi = buildMidi;
window.downloadBlob = downloadBlob;
