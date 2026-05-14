// Components — TopBar, Knob, Step, GridRow

const { useState, useRef, useEffect, useCallback } = React;

// ---- Knob (3-position) ----
function Knob({ value, onChange, label }) {
  // value: 0,1,2
  const angles = [-50, 0, 50]; // degrees
  const positions = ['1', '2', '3'];

  const handleClick = (e) => {
    e.preventDefault();
    onChange((value + 1) % 3);
  };
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) onChange(Math.min(2, value + 1));
    else onChange(Math.max(0, value - 1));
  };

  return (
    <div className="knob-wrap">
      <button
        className="knob"
        onClick={handleClick}
        onWheel={handleWheel}
        aria-label={`${label} volume position ${positions[value]}`}
      >
        <span className="knob-cap"></span>
        <span className="knob-indicator" style={{
          transform: `translateX(-50%) rotate(${angles[value]}deg)`,
          transition: 'transform 140ms cubic-bezier(.2,.9,.3,1.4)',
        }}></span>
      </button>
      <div className="knob-positions">
        {positions.map((p, i) => (
          <span key={p} data-active={i === value}>{p}</span>
        ))}
      </div>
    </div>
  );
}

// ---- Step Cell ----
function StepCell({ on, downbeat, triggered, onToggle, onDragEnter, onDragStart }) {
  const ref = useRef(null);
  return (
    <div className="step-cell" data-downbeat={downbeat}>
      <div
        ref={ref}
        className="step"
        data-on={on ? 'true' : 'false'}
        data-trigger={triggered ? 'true' : 'false'}
        onMouseDown={(e) => { e.preventDefault(); onDragStart(); onToggle(); }}
        onMouseEnter={(e) => { if (e.buttons === 1) onDragEnter(); }}
        onTouchStart={(e) => { onDragStart(); onToggle(); }}
        role="checkbox"
        aria-checked={on}
      ></div>
    </div>
  );
}

// ---- Grid Row ----
function GridRow({ track, steps, knob, onToggleStep, onDragEnter, onDragStart, onKnobChange, triggeredStep, onTriggerOne }) {
  return (
    <React.Fragment>
      <div
        className="row-label"
        onClick={onTriggerOne}
        title={`Trigger ${track.name}`}
        style={{ cursor: 'pointer' }}
      >
        {track.id}
        <span className="sub">{track.name}</span>
      </div>
      <div className="steps">
        {steps.map((on, i) => (
          <StepCell
            key={i}
            on={on}
            downbeat={false}
            triggered={triggeredStep === i && on}
            onToggle={() => onToggleStep(i)}
            onDragStart={() => onDragStart(i, !on)}
            onDragEnter={() => onDragEnter(i)}
          />
        ))}
      </div>
      <Knob value={knob} onChange={onKnobChange} label={track.name} />
    </React.Fragment>
  );
}

// ---- Switch ----
function Switch({ on, onChange, label }) {
  return (
    <div className="switch" data-on={on} onClick={() => onChange(!on)}>
      <div className="switch-track">
        <div className="switch-thumb"></div>
      </div>
      <div className="switch-label">{label}</div>
    </div>
  );
}

// ---- BPM Display + click to edit / drag to change ----
function BpmControl({ bpm, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(bpm));
  const dragState = useRef(null);

  const startDrag = (e) => {
    if (editing) return;
    dragState.current = { y: e.clientY, bpm };
    const move = (ev) => {
      if (!dragState.current) return;
      const dy = dragState.current.y - ev.clientY;
      const next = Math.round(Math.max(40, Math.min(220, dragState.current.bpm + dy * 0.4)));
      onChange(next);
    };
    const up = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div className="bpm">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {editing ? (
          <input
            autoFocus
            className="bpm-screen"
            style={{ border: 0, outline: 'none', width: 84 }}
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
            onBlur={() => {
              const n = Math.max(40, Math.min(220, parseInt(draft || '0', 10) || bpm));
              onChange(n); setDraft(String(n)); setEditing(false);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
          />
        ) : (
          <div
            className="bpm-screen"
            onMouseDown={startDrag}
            onDoubleClick={() => { setDraft(String(bpm)); setEditing(true); }}
            style={{ cursor: 'ns-resize' }}
            title="Drag to change · double-click to type"
          >
            {String(bpm).padStart(3, '0')}<span className="unit">BPM</span>
          </div>
        )}
        <div className="bpm-label">Tempo</div>
      </div>
    </div>
  );
}

// ---- Top bar ----
function TopBar({ playing, onTogglePlay, bpm, onBpmChange, loop, onLoopChange, onExportWav, onExportMidi, exporting }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <button
          className="transport"
          data-playing={playing}
          onClick={onTogglePlay}
          aria-label={playing ? 'Stop' : 'Play'}
        >
          <span className="transport-icon"></span>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0 }}>
          <span className="brand" style={{ whiteSpace: 'nowrap' }}>
            <span className="dot"></span>
            <span>Step Machine</span>
          </span>
          <span style={{
            fontFamily: '"Saira Condensed", sans-serif',
            fontSize: 9, letterSpacing: '0.2em', color: '#6b6660',
            textTransform: 'uppercase', marginTop: 3, paddingLeft: 17,
            whiteSpace: 'nowrap',
          }}>Rhythm Composer</span>
        </div>
      </div>

      <div className="topbar-center">
        <BpmControl bpm={bpm} onChange={onBpmChange} />
      </div>

      <div className="topbar-right">
        <button className="hw-btn" onClick={onExportWav} disabled={exporting}>
          {exporting === 'wav' ? '· · ·' : 'WAV'}
        </button>
        <button className="hw-btn" onClick={onExportMidi}>MIDI</button>
      </div>
    </div>
  );
}

Object.assign(window, { Knob, StepCell, GridRow, Switch, BpmControl, TopBar });
