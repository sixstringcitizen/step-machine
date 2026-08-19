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
      <div className="knob-label">VOL</div>
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
function StepCell({ index, on, downbeat, triggered, onToggle, onDragEnter, onDragStart }) {
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onDragStart();
    onToggle();
  };

  return (
    <div className="step-cell" data-downbeat={downbeat} data-index={index}>
      <div
        className="step"
        data-on={on ? 'true' : 'false'}
        data-trigger={triggered ? 'true' : 'false'}
        onPointerDown={onPointerDown}
        onPointerEnter={(e) => { if (e.buttons & 1) onDragEnter(); }}
        role="checkbox"
        aria-checked={on}
        aria-label={`Step ${index + 1}`}
      ></div>
    </div>
  );
}

// ---- Grid Row ----
function GridRow({ track, steps, knob, onToggleStep, onDragEnter, onDragStart, onKnobChange, triggeredStep, onTriggerOne }) {
  const touchDrag = useRef({ x: 0, y: 0, armed: false });

  const onStepsTouchStart = (e) => {
    const t = e.touches[0];
    touchDrag.current = { x: t.clientX, y: t.clientY, armed: false };
  };

  const paintAtTouch = (e) => {
    if (!e.touches.length) return;
    const t = e.touches[0];
    if (!touchDrag.current.armed) {
      const dx = t.clientX - touchDrag.current.x;
      const dy = t.clientY - touchDrag.current.y;
      if (Math.hypot(dx, dy) < 10) return;
      touchDrag.current.armed = true;
    }
    const cell = document.elementFromPoint(t.clientX, t.clientY)?.closest('.step-cell');
    if (!cell || cell.dataset.index == null) return;
    onDragEnter(Number(cell.dataset.index));
  };

  return (
    <div className="grid-row">
      <div
        className="row-label"
        onClick={onTriggerOne}
        title={`Trigger ${track.name}`}
      >
        {track.id}
        <span className="sub">{track.name}</span>
      </div>
      <div className="steps" onTouchStart={onStepsTouchStart} onTouchMove={paintAtTouch}>
        {steps.map((on, i) => (
          <StepCell
            key={i}
            index={i}
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
    </div>
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
  const screenRef = useRef(null);
  const bpmRef = useRef(bpm);
  const editingRef = useRef(editing);
  bpmRef.current = bpm;
  editingRef.current = editing;

  useEffect(() => {
    const el = screenRef.current;
    if (!el || editing) return;

    let drag = null;

    const applyDrag = (clientY) => {
      if (!drag) return;
      const dy = drag.y - clientY;
      const next = Math.round(Math.max(40, Math.min(220, drag.bpm + dy * 0.4)));
      onChange(next);
    };

    const endDrag = () => {
      drag = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', endDrag);
      window.removeEventListener('touchcancel', endDrag);
    };

    const onMouseMove = (e) => applyDrag(e.clientY);

    const onTouchMove = (e) => {
      if (!drag || !e.touches.length) return;
      e.preventDefault();
      applyDrag(e.touches[0].clientY);
    };

    const onMouseDown = (e) => {
      if (editingRef.current || e.button !== 0) return;
      e.preventDefault();
      drag = { y: e.clientY, bpm: bpmRef.current };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', endDrag);
    };

    const onTouchStart = (e) => {
      if (editingRef.current) return;
      e.preventDefault();
      drag = { y: e.touches[0].clientY, bpm: bpmRef.current };
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', endDrag);
      window.addEventListener('touchcancel', endDrag);
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('touchstart', onTouchStart, { passive: false });

    return () => {
      endDrag();
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('touchstart', onTouchStart);
    };
  }, [editing, onChange]);

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
            ref={screenRef}
            className="bpm-screen"
            onDoubleClick={() => { setDraft(String(bpm)); setEditing(true); }}
            role="slider"
            aria-valuenow={bpm}
            aria-valuemin={40}
            aria-valuemax={220}
            aria-label="Tempo in BPM — drag up or down to change"
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
const EXPORT_LOOP_OPTIONS = [1, 4, 8, 16];

function DownloadIcon() {
  return (
    <svg className="hw-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function ExportDropdown({ label, onExport, exporting }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const handleSelect = (loops) => {
    setOpen(false);
    onExport(loops);
  };

  return (
    <div className={`export-dropdown${open ? ' is-open' : ''}`} ref={wrapRef}>
      <button
        className="hw-btn"
        onClick={() => setOpen((o) => !o)}
        disabled={exporting}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${label} export options`}
      >
        {exporting ? '· · ·' : <><DownloadIcon />{label}</>}
      </button>
      {open && (
        <div className="export-dropdown-menu" role="menu">
          {EXPORT_LOOP_OPTIONS.map((loops) => (
            <button
              key={loops}
              type="button"
              className="hw-btn export-dropdown-item"
              role="menuitem"
              onClick={() => handleSelect(loops)}
            >
              <DownloadIcon />Loop {loops}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
        <ExportDropdown label="WAV" onExport={onExportWav} exporting={exporting === 'wav'} />
        <ExportDropdown label="MIDI" onExport={onExportMidi} exporting={exporting === 'midi'} />
      </div>
    </div>
  );
}

Object.assign(window, { Knob, StepCell, GridRow, Switch, BpmControl, TopBar });
