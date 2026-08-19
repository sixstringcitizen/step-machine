// App — Step Machine
const { useState, useRef, useEffect, useCallback, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "wood": "walnut",
  "metal": "aluminum",
  "accent": true,
  "labelStyle": "saira",
  "showHint": true
}/*EDITMODE-END*/;

const WOOD_PRESETS = {
  walnut:  { '--wood-1': '#6b4423', '--wood-2': '#5b3a22', '--wood-3': '#432a18' },
  teak:    { '--wood-1': '#7a5232', '--wood-2': '#5e3d20', '--wood-3': '#3d2511' },
  rosewood:{ '--wood-1': '#5a2a1f', '--wood-2': '#3f1c14', '--wood-3': '#2a120c' },
  oak:     { '--wood-1': '#a07845', '--wood-2': '#7e5a2e', '--wood-3': '#553a18' },
  ebony:   { '--wood-1': '#2a2018', '--wood-2': '#1a130d', '--wood-3': '#0e0907' },
};
const METAL_PRESETS = {
  aluminum: { '--metal-1': '#d8d6d2', '--metal-2': '#b6b4af', '--metal-3': '#8c8a85' },
  steel:    { '--metal-1': '#c2c4c8', '--metal-2': '#9b9da1', '--metal-3': '#6e7074' },
  brass:    { '--metal-1': '#e8d49a', '--metal-2': '#bfa066', '--metal-3': '#806a3c' },
  black:    { '--metal-1': '#3a3835', '--metal-2': '#262422', '--metal-3': '#141210' },
};

// Default pattern — a useful starting groove (boots & cats-ish but original)
const initialPattern = () => ({
  HH: [1,0,1,0,1,0,1,0],
  SN: [0,0,0,0,1,0,0,0],
  HT: [0,0,0,0,0,0,0,0],
  FT: [0,0,0,0,0,0,0,0],
  KD: [1,0,0,0,0,0,1,0],
});

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const engineRef = useRef(null);

  const [pattern, setPattern] = useState(initialPattern);
  const [knobs, setKnobs] = useState({ HH:0, SN:1, HT:1, FT:1, KD:1 });
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(110);
  const [loop, setLoop] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [triggered, setTriggered] = useState({}); // {trackId: stepIdx} for flash

  const patternRef = useRef(pattern);
  useEffect(() => { patternRef.current = pattern; }, [pattern]);
  const knobsRef = useRef(knobs);
  useEffect(() => { knobsRef.current = knobs; }, [knobs]);

  // Apply CSS overrides for wood/metal
  useEffect(() => {
    const root = document.documentElement;
    const wood = WOOD_PRESETS[tweaks.wood] || WOOD_PRESETS.walnut;
    const metal = METAL_PRESETS[tweaks.metal] || METAL_PRESETS.aluminum;
    Object.entries(wood).forEach(([k,v]) => root.style.setProperty(k, v));
    Object.entries(metal).forEach(([k,v]) => root.style.setProperty(k, v));
  }, [tweaks.wood, tweaks.metal]);

  // Engine init
  const ensureEngine = async () => {
    if (!engineRef.current) engineRef.current = new StepEngine();
    await engineRef.current.init();
    engineRef.current.setBpm(bpm);
    Object.entries(knobsRef.current).forEach(([id, v]) => engineRef.current.setKnob(id, v));
  };

  // BPM sync
  useEffect(() => {
    if (engineRef.current && engineRef.current.ready) engineRef.current.setBpm(bpm);
  }, [bpm]);

  // Knob sync
  useEffect(() => {
    if (engineRef.current && engineRef.current.ready) {
      Object.entries(knobs).forEach(([id, v]) => engineRef.current.setKnob(id, v));
    }
  }, [knobs]);

  const togglePlay = async () => {
    await ensureEngine();
    if (playing) {
      engineRef.current.stop();
      setPlaying(false);
      setTriggered({});
    } else {
      engineRef.current.start(
        () => patternRef.current,
        (step) => {
          // Visual trigger flash for active cells on this step
          const flash = {};
          window.STEP_TRACKS.forEach(t => {
            if (patternRef.current[t.id][step]) flash[t.id] = step;
          });
          setTriggered(flash);
          setTimeout(() => setTriggered((cur) => {
            // clear only the ones we set
            const next = { ...cur };
            Object.keys(flash).forEach(k => { if (next[k] === flash[k]) delete next[k]; });
            return next;
          }), 200);
        }
      );
      setPlaying(true);
    }
  };

  // Drag-paint handling
  const dragMode = useRef(null); // 'on' | 'off' | null
  const onDragStart = (trackId) => (idx, willTurnOn) => {
    // First click toggles, but for drag-painting we paint ON only (per brief)
    dragMode.current = 'on';
  };
  const onDragEnter = (trackId) => (idx) => {
    if (dragMode.current !== 'on') return;
    setPattern(p => {
      if (p[trackId][idx]) return p;
      const next = { ...p, [trackId]: [...p[trackId]] };
      next[trackId][idx] = 1;
      return next;
    });
    // also fire sound for live feedback
    if (engineRef.current && engineRef.current.ready) {
      engineRef.current.triggerOne(trackId, 1);
    }
  };
  useEffect(() => {
    const up = () => { dragMode.current = null; };
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  }, []);

  const toggleStep = (trackId, idx) => async () => {
    await ensureEngine();
    setPattern(p => {
      const next = { ...p, [trackId]: [...p[trackId]] };
      next[trackId][idx] = next[trackId][idx] ? 0 : 1;
      // Sound feedback only when turning ON
      if (next[trackId][idx] && engineRef.current && engineRef.current.ready) {
        engineRef.current.triggerOne(trackId, 1);
      }
      return next;
    });
  };

  const triggerOne = (trackId) => async () => {
    await ensureEngine();
    engineRef.current.triggerOne(trackId, 1);
  };

  const setKnob = (trackId) => (v) => {
    setKnobs(k => ({ ...k, [trackId]: v }));
  };

  // Exports
  const buildExportFilename = (loops, ext) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `step-machine-${bpm}bpm-${loops}x-${stamp}.${ext}`;
  };

  const onExportWav = async (loops) => {
    await ensureEngine();
    setExporting('wav');
    try {
      const blob = await window.renderLoopToWav(patternRef.current, knobsRef.current, bpm, loops);
      window.downloadBlob(blob, buildExportFilename(loops, 'wav'));
    } catch (e) {
      console.error('WAV export failed', e);
      alert('WAV export failed: ' + e.message);
    } finally {
      setExporting(null);
    }
  };
  const onExportMidi = (loops) => {
    const blob = window.buildMidi(patternRef.current, bpm, loops);
    window.downloadBlob(blob, buildExportFilename(loops, 'mid'));
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.key === 'Backspace') {
        e.preventDefault();
        setPattern({ HH:[0,0,0,0,0,0,0,0], SN:[0,0,0,0,0,0,0,0], HT:[0,0,0,0,0,0,0,0], FT:[0,0,0,0,0,0,0,0], KD:[0,0,0,0,0,0,0,0] });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing]);

  // Apply font tweak
  useEffect(() => {
    const stylesheet = document.getElementById('label-font-override') || (() => {
      const s = document.createElement('style'); s.id = 'label-font-override'; document.head.appendChild(s); return s;
    })();
    const map = {
      saira: '"Saira Condensed", sans-serif',
      space: '"Space Grotesk", sans-serif',
      mono:  '"DM Mono", monospace',
    };
    stylesheet.textContent = `.row-label, .brand, .panel-title, .knob-label, .knob-positions, .switch-label, .bpm-label, .hw-btn { font-family: ${map[tweaks.labelStyle] || map.saira} !important; }`;
  }, [tweaks.labelStyle]);

  return (
    <React.Fragment>
      {tweaks.showHint && (
        <div className="hint">
          <kbd>SPACE</kbd> play/stop &nbsp;·&nbsp; click circles to toggle beats &nbsp;·&nbsp; drag bpm up/down to change speed
        </div>
      )}

      <div className="machine-stage">
      <div className="machine">
        {/* photographic wood frame: 4 scaled pieces (top, bottom, left, right) */}
        <span className="frame-piece top"></span>
        <span className="frame-piece bottom"></span>
        <span className="frame-piece left"></span>
        <span className="frame-piece right"></span>
        <TopBar
          playing={playing}
          onTogglePlay={togglePlay}
          bpm={bpm}
          onBpmChange={setBpm}
          loop={loop}
          onLoopChange={setLoop}
          onExportWav={onExportWav}
          onExportMidi={onExportMidi}
          exporting={exporting}
        />

        <div className="body">
          <div className="panel">
            <div className="rows">
              {window.STEP_TRACKS.map(t => (
                <GridRow
                  key={t.id}
                  track={t}
                  steps={pattern[t.id]}
                  knob={knobs[t.id]}
                  onToggleStep={(i) => toggleStep(t.id, i)()}
                  onDragStart={onDragStart(t.id)}
                  onDragEnter={onDragEnter(t.id)}
                  onKnobChange={setKnob(t.id)}
                  triggeredStep={triggered[t.id] ?? -1}
                  onTriggerOne={triggerOne(t.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Enclosure" />
        <TweakSelect
          label="Wood"
          value={tweaks.wood}
          onChange={(v) => setTweak('wood', v)}
          options={[
            { value: 'walnut', label: 'Walnut' },
            { value: 'teak', label: 'Teak' },
            { value: 'rosewood', label: 'Rosewood' },
            { value: 'oak', label: 'Oak' },
            { value: 'ebony', label: 'Ebony' },
          ]}
        />
        <TweakRadio
          label="Top panel"
          value={tweaks.metal}
          onChange={(v) => setTweak('metal', v)}
          options={[
            { value: 'aluminum', label: 'Alu' },
            { value: 'steel', label: 'Steel' },
            { value: 'brass', label: 'Brass' },
            { value: 'black', label: 'Black' },
          ]}
        />
        <TweakSection label="Type" />
        <TweakRadio
          label="Label font"
          value={tweaks.labelStyle}
          onChange={(v) => setTweak('labelStyle', v)}
          options={[
            { value: 'saira', label: 'Saira' },
            { value: 'space', label: 'Grotesk' },
            { value: 'mono', label: 'Mono' },
          ]}
        />
        <TweakSection label="Display" />
        <TweakToggle
          label="Keyboard hint"
          value={tweaks.showHint}
          onChange={(v) => setTweak('showHint', v)}
        />
        <TweakSection label="Pattern" />
        <TweakButton label="Reset to default groove" onClick={() => setPattern(initialPattern())} />
        <TweakButton label="Load: Driving" onClick={() => setPattern({
          HH:[1,1,1,1,1,1,1,1], SN:[0,0,0,0,1,0,0,0],
          HT:[0,0,0,0,0,0,0,0], FT:[0,0,0,0,0,0,1,0],
          KD:[1,0,0,1,0,0,1,0],
        })} />
        <TweakButton label="Load: Halftime" onClick={() => setPattern({
          HH:[1,0,1,0,1,0,1,0], SN:[0,0,1,0,0,0,1,0],
          HT:[0,0,0,0,0,1,0,0], FT:[0,0,0,0,0,0,0,1],
          KD:[1,0,0,0,1,0,0,0],
        })} />
        <TweakButton label="Clear all" onClick={() => setPattern({
          HH:[0,0,0,0,0,0,0,0], SN:[0,0,0,0,0,0,0,0],
          HT:[0,0,0,0,0,0,0,0], FT:[0,0,0,0,0,0,0,0],
          KD:[0,0,0,0,0,0,0,0],
        })} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
