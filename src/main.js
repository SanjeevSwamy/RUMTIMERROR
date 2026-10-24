import { F } from './dom.js';
import { H, loadPersisted, saveDone, saveValues } from './state.js';
import { t } from './i18n/index.js';
import { lessons, ke } from './lessons.js';
import InfoCard from './components/InfoCard.js';
import { LessonList } from './components/LessonList.js';
import { CodeCard } from './components/CodeCard.js';
import { Inspector } from './components/Inspector.js';
import { Leaders } from './components/Leaders.js';
import { SignalsReadout } from './components/SignalsReadout.js';
import { SchematicModal } from './components/SchematicModal.js';
import { Sidebar } from './components/Sidebar.js';
import Stage from './stage/index.js';
import { SimEngine } from './sim/engine.js';
import { renderThumbnails, Oe } from './kit/thumbnails.js';

// ─── Components ────────────────────────────────────────────────────────────

const infoCard = new InfoCard(F('.info-card'), {
  onExpand: (on) => { /* handle expand */ },
});

const lessonList = new LessonList(F('#lesson-list'), {
  onSelect: (id) => loadLesson(id),
});

const codeCard = new CodeCard(F('.code-card'), {
  onRun:    () => runSketch(),
  onStop:   () => stopSketch(),
  onParam:  (k, v) => updateParam(k, v),
  onExpand: (on) => { /* handle expand */ },
});

const inspector = new Inspector(F('#inspector'), {
  svg:     F('#insp-lines'),
  onParam: (k, v) => updateParam(k, v),
});

const leaders = new Leaders({
  rig:  F('#rig'),
  svg:  F('#leaders'),
  tags: F('#tags'),
});

const signals = new SignalsReadout(F('#signals'));

const schematic = new SchematicModal(F('#schematic'), {
  onHover:  (part) => { /* hover highlight */ },
  onSelect: (part) => { /* select part */ },
  onClose:  () => updateSetting('schematic', false),
});

const sidebar = new Sidebar(F('.sidebar'), F('#flyout'), {
  onNav:     (key) => onNav(key),
  onSettings: (k, v) => updateSetting(k, v),
});

// ─── Stage ─────────────────────────────────────────────────────────────────

const stage = new Stage(F('#board-canvas'), {
  onChange:    () => { /* dirty flag handled inside Stage */ },
  onDragState: (dragging) => {
    // starting a camera drag means the click is not a pick — dismiss the tooltip
    if (dragging) {
      partTip.hidden = true;
      stage.clearHighlight();
    }
  },
  onClick:     (ev) => pickPart(ev),
});

// Dismiss any open tooltip the instant a new pointer press begins on the canvas
F('#board-canvas')?.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0 && ev.button !== 2 && ev.button !== undefined) return;
  partTip.hidden = true;
  stage.clearHighlight();
});

// ─── Part picking (click a component on the Uno board) ──────────────────────

const partTip = document.createElement('div');
partTip.className = 'part-tip';
partTip.hidden = true;
F('#rig')?.appendChild(partTip);

function pickPart(ev) {
  if (stage.wireMode) {
    const res = stage.wirePick(ev.clientX, ev.clientY);
    if (res?.done) {
      codeCard.appendLine?.(`[Wire] ${res.a.label} → ${res.b.label}`);
    } else if (res?.pending) {
      codeCard.appendLine?.(`[Wire] picked ${res.pending.label} — click another anchor to connect`);
    }
    return;
  }
  const hit = stage.pickAt(ev.clientX, ev.clientY);
  if (hit) {
    stage.setHighlight(hit);
    partTip.innerHTML =
      `<b>${hit.name}</b><span>${hit.desc}</span>`;
    partTip.hidden = false;
    const rig = F('#rig');
    const rigRect = rig ? rig.getBoundingClientRect() : { left: 0, top: 0 };
    const x = ev.clientX - rigRect.left;
    const y = ev.clientY - rigRect.top;
    partTip.style.left = `${Math.min(x, (rigRect.width || 0) - 240)}px`;
    partTip.style.top = `${y + 18}px`;
  } else {
    stage.setHighlight(null);
    partTip.hidden = true;
  }
}

// ─── Lesson loading ─────────────────────────────────────────────────────────

function loadLesson(id) {
  const lesson = lessons.find((l) => l.id === id) ?? lessons[0];
  H.lessonId = lesson.id;
  stopSketch(true);

  stage.setLesson(lesson);
  infoCard.setLesson(lesson);
  codeCard.setLesson(lesson);
  inspector.setLesson(lesson);
  signals.setLesson(lesson);
  sidebar.refresh(H);
  updateProgress();

  F('#lesson-list')?.querySelectorAll('.lesson').forEach((li) => {
    li.classList.toggle('is-active', li.dataset.id === lesson.id);
  });
}

// ─── Progress ───────────────────────────────────────────────────────────────

function updateProgress() {
  const done = H.done.size;
  const total = lessons.length;
  const pct = total ? (done / total) * 100 : 0;

  const countEl = F('#progress-count');
  const fillEl  = F('#progress-fill');
  const trackEl = F('.progress-track');

  if (countEl) countEl.textContent = `${done}/${total}`;
  if (fillEl)  fillEl.style.width  = `${pct}%`;
  if (trackEl) trackEl.setAttribute('aria-valuenow', String(done));
}

// ─── Settings ───────────────────────────────────────────────────────────────

function updateSetting(key, val) {
  H.settings[key] = val;
  try { localStorage.setItem('learn-arduino:settings', JSON.stringify(H.settings)); } catch { /* quota */ }

  switch (key) {
    case 'labels':
      leaders.setVisible?.(val);
      break;
    case 'grid':
      stage.setGrid(val);
      inspector.setGrid?.(val);
      break;
    case 'autoRotate':
      stage.autoRotate = val;
      break;
    case 'flow':
      stage.setFlow(val);
      codeCard.setToggle?.(val);
      sidebar.refresh(H);
      break;
    case 'schematic':
      schematic.setOpen(val);
      break;
    case 'reducedMotion':
      stage.setReducedMotion(val);
      document.documentElement.classList.toggle('reduce-motion', val);
      break;
    case 'sound':
      H.settings.sound = val;
      break;
  }
}

function applyAllSettings() {
  for (const [k, v] of Object.entries(H.settings)) updateSetting(k, v);
}

// ─── Sim run/stop (real sketch engine) ──────────────────────────────────────

let sim = null;

// per-lesson default part↔pin bindings for the parts buildLesson pre-places
const LESSON_BINDS = {
  blink:   { leds: [13] },
  button:  { leds: [13], buttons: [2] },
  knob:    { pot: 'A0' },
  rgb:     { leds: [9, 10, 11] },
  sound:   { buzzers: [8] },
  piano:   { buzzers: [8], buttons: [2] },
  sensor:  { sensor: { trig: 9, echo: 10 } },
  project: { sensor: { trig: 9, echo: 10 }, leds: [12, 11] },
  servo:   { servos: [9] },
  light:   { analogDefaults: { A0: 620 } },
  heat:    { analogDefaults: { A0: 340 } },
  plant:   { analogDefaults: { A0: 500 } },
  force:   { analogDefaults: { A0: 120 } },
};

function pinName(n) {
  // 13 → 'D13'; 'A0' passes through unchanged
  return typeof n === 'number' ? `D${n}` : String(n);
}

/** Build part-binding maps for the current lesson, user wires first. */
function buildBindings() {
  const binds = { leds: new Map(), buttons: new Set(), potIds: new Set(), servos: new Set(), buzzers: new Set(), sensor: null, wiredLeds: new Map() };
  const def = LESSON_BINDS[H.lessonId] ?? {};
  const userWiresExist = stage.wires.length > 0;

  // DSU over wire nets
  const parent = new Map();
  const find = (x) => { while (parent.get(x) !== x) parent.set(x, parent.get(parent.get(x))); return parent.get(x); };
  const union = (a, b) => { parent.set(find(a), find(b)); };

  const ledger = { ledIdx: 0, btnIdx: 0, buzzIdx: 0, servoIdx: 0 };
  for (const part of stage.parts) {
    switch (part.type) {
      case 'led':
        // Nth pre-placed LED takes the Nth default pin; user-wired LEDs override via nets
        binds.leds.set(part.id, def.leds?.[ledger.ledIdx] ?? null);
        ledger.ledIdx++;
        break;
      case 'button':
        if ((def.buttons ?? [])[ledger.btnIdx] != null) binds.buttons.add(part.id);
        ledger.btnIdx++;
        break;
      case 'buzzer':
        if ((def.buzzers ?? [])[ledger.buzzIdx] != null) binds.buzzers.add(part.id);
        ledger.buzzIdx++;
        break;
      case 'servo':
        if ((def.servos ?? [])[ledger.servoIdx] != null) binds.servos.add(part.id);
        ledger.servoIdx++;
        break;
      case 'pot':
        if (def.pot) binds.potIds.add(part.id);
        break;
      case 'sensor':
        if (def.sensor) binds.sensor = { part, ...def.sensor };
        break;
    }
  }

  if (!userWiresExist) return binds;
  for (const w of stage.getNetEdges()) { parent.set(w.a, w.a); parent.set(w.b, w.b); union(w.a, w.b); }

  // user wiring: an LED is bound to any digital pin whose net reaches its anode,
  // with cathode tied to a ground net somewhere
  const gndAnchors = ['pin:GND', 'pin:GND1', 'pin:GND2', 'rail:blue:B', 'rail:blue:F'];
  for (const n of gndAnchors) { if (!parent.has(n)) parent.set(n, n); }
  const gndRoots = new Set(gndAnchors.map(find));
  const pinNodes = [...parent.keys()].filter((n) => /^pin:D\d+$/.test(n));
  for (const part of stage.parts) {
    if (part.type !== 'led') continue;
    const [anode, cathode] = stage.footNodes(part);
    for (const n of [anode, cathode]) { if (!parent.has(n)) parent.set(n, n); }
    const aNet = find(anode);
    const cNet = find(cathode);
    for (const pn of pinNodes) {
      if (find(pn) === aNet && gndRoots.has(cNet)) {
        binds.wiredLeds.set(part.id, Number(pn.slice(4)));
        binds.leds.set(part.id, null); // disable the default binding; user wire wins
      }
    }
  }
  return binds;
}

/* tone polyphony: one piezo, one voice */
let toneCtx = null;
let toneOsc = null;
function playTone(freq, dur) {
  if (!H.settings.sound) return;
  try {
    toneCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    stopTone();
    const osc = toneCtx.createOscillator();
    const gain = toneCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = Math.max(20, Math.min(8000, freq));
    gain.gain.value = 0.06;
    osc.connect(gain).connect(toneCtx.destination);
    osc.start();
    if (dur) osc.stop(toneCtx.currentTime + Math.max(0.02, dur / 1000));
    toneOsc = dur ? null : osc;
  } catch { /* audio blocked: visuals only */ }
}
function stopTone() {
  if (!toneOsc) return;
  try { toneOsc.stop(); } catch { /* already stopped */ }
  toneOsc = null;
}

function runSketch() {
  stopSketch(true);
  const code = codeCard.getCode?.();
  if (!code?.trim()) return;

  codeCard.setState?.('running');
  H.running = true;
  codeCard.appendLine?.('[Sketch] compiling…');

  const binds = buildBindings();
  const serialBuf = [];
  let serialFlushTimer = null;

  sim = new SimEngine(code, {
    hookSerial: (text) => { serialBuf.push(text); },
    hookPinWrite: (pin, v) => {
      const name = pinName(pin);
      const num = /^D(\d+)$/.exec(name);
      const pinNum = num ? Number(num[1]) : -1;
      const glow = typeof v === 'number' ? Math.max(0, Math.min(1, v / 255)) : (v ? 1 : 0);
      // board L LED mirrors pin 13 directly
      if (pinNum === 13) stage.setBoardLed('L', v);
      // wired LEDs (user-built circuits), then default-bound LEDs
      for (const [id, ledPin] of binds.wiredLeds) {
        if (ledPin === pinNum) stage.setLedGlow(id, glow);
      }
      for (const [id, ledPin] of binds.leds) {
        if (ledPin == null) continue;
        if (ledPin === pinNum) stage.setLedGlow(id, glow);
      }
    },
    hookTone: (pin, freq, dur) => {
      for (const id of binds.buzzers) void id;
      playTone(freq, dur);
    },
    hookNoTone: () => stopTone(),
    hookServo: (pin, deg) => {
      void pin;
      for (const id of binds.servos) stage.setServoAngle(id, deg);
    },
    hookStepper: (pins, steps) => {
      void pins; void steps; // stepper is a board-drama visual only for now
    },
    readPin: (pin) => {
      const name = pinName(pin);
      const num = /^D(\d+)$/.exec(name);
      const pinNum = num ? Number(num[1]) : -1;
      const boundPins = LESSON_BINDS[H.lessonId]?.buttons ?? [];
      if (boundPins.includes(pinNum) && stage.buttonPressed) return 0;
      return 1;
    },
    readAnalog: (pin) => {
      const name = pinName(pin);
      const lessonDef = LESSON_BINDS[H.lessonId] ?? {};
      for (const id of binds.potIds) {
        if (name === (lessonDef.pot ?? 'A0')) return stage.potValue(id);
      }
      const defaults = lessonDef.analogDefaults ?? {};
      if (defaults[name] != null) return defaults[name];
      return 300;
    },
    pulseEcho: () => {
      const distCm = stage.sensorDist ?? 18;
      return Math.round(distCm * 58); // µs round trip
    },
  });

  if (sim.error) {
    codeCard.appendLine?.(`⚠ Compile error: ${sim.error}`);
    sim = null;
    codeCard.setState?.('idle');
    H.running = false;
    return;
  }

  sim.start();
  codeCard.appendLine?.(`[Sketch] running: ${H.lessonId}`);

  // flush serial ~2.5x per second so the console reads like a real monitor
  serialFlushTimer = setInterval(() => {
    if (!serialBuf.length) return;
    const chunk = serialBuf.splice(0).join('');
    for (const line of chunk.split('\n')) {
      if (line.trim()) codeCard.appendLine?.(line);
    }
  }, 400);
  _serialFlush = serialFlushTimer;

  if (H.lessonId) {
    H.done.add(H.lessonId);
    saveDone();
    paintDone();
    updateProgress();
  }
}

let _serialFlush = null;

function stopSketch(quiet = false) {
  if (_serialFlush) { clearInterval(_serialFlush); _serialFlush = null; }
  sim?.stop();
  sim = null;
  stopTone();
  stage.resetDeviceVisuals();
  codeCard.setState?.('idle');
  H.running = false;
  if (!quiet) codeCard.appendLine?.('[Sketch] Stopped.');
}

function updateParam(key, val) {
  H.values[key] = val;
  inspector.setValues?.(H.values);
  signals.push?.(key, val);
}

// ─── Navigation ─────────────────────────────────────────────────────────────

function onNav(key) {
  H.nav = key;
  if (key !== 'builder' && stage.wireMode) {
    stage.setWireMode(false);
  }
  if (key === 'builder') {
    stopSketch(true);
    codeCard.appendLine?.('[Builder] drag parts from the palette; use ⚡ wire tool to connect pins.');
  }
  sidebar.setNav(key);
  sidebar.refresh(H);
}

// ─── Viewbar buttons ────────────────────────────────────────────────────────

function wireViewbar() {
  const vb = F('#viewbar');
  if (!vb) return;

  vb.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view]');
    if (!btn) return;
    switch (btn.dataset.view) {
      case 'left':     stage.controls.turn(-1); break;
      case 'right':    stage.controls.turn(1);  break;
      case 'out':      stage.controls.zoomGoal = Math.min(8, stage.controls.zoomGoal * 1.25); break;
      case 'in':       stage.controls.zoomGoal = Math.max(0.5, stage.controls.zoomGoal * 0.8); break;
      case 'reset':    stage.reset(); break;
      case 'flow':     updateSetting('flow', !H.settings.flow);
                       btn.setAttribute('aria-pressed', String(H.settings.flow)); break;
      case 'schematic': updateSetting('schematic', !H.settings.schematic);
                       btn.setAttribute('aria-pressed', String(H.settings.schematic)); break;
    }
  });
}

// ─── Builder flyout (palette + wire tool) ───────────────────────────────────

function wireBuilderFlyout() {
  const fly = F('#flyout');
  if (!fly) return;
  fly.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const id = stage.addPart(add.dataset.add);
      if (id) codeCard.appendLine?.(`[Builder] added ${add.dataset.add} — drag it into place`);
      return;
    }
    const tool = e.target.closest('[data-btool]');
    if (tool) {
      const kind = tool.dataset.btool;
      if (kind === 'wire') {
        stage.setWireMode(!stage.wireMode);
        tool.setAttribute('aria-pressed', String(stage.wireMode));
        codeCard.appendLine?.(stage.wireMode
          ? '[Wire] click a pin… then click a row or another pin'
          : '[Wire] tool off');
      } else if (kind === 'clear') {
        stage.clearUserWork();
        codeCard.appendLine?.('[Builder] cleared user parts and wires');
      }
    }
  });
}

// ─── Lesson list setup ───────────────────────────────────────────────────────

function populateLessonList() {
  const ol = F('#lesson-list');
  if (!ol) return;
  H.lessonList = lessons.map((l, index) => ({ id: l.id, title: l.title, index }));
  ol.innerHTML = '';
  lessons.forEach((lesson, idx) => {
    const n = idx + 1;
    const w  = ke[lesson.id]  ?? 260;
    const tw = 96;
    const li = document.createElement('li');
    li.className = 'lesson';
    li.role = 'button';
    li.tabIndex = 0;
    li.dataset.id = lesson.id;
    li.style.cssText = `--w:${w};--tw:${tw}`;
    li.setAttribute('aria-label', `Lesson ${n}: ${lesson.title}`);
    const thumbUrl = Oe[lesson.thumb] || '';
    li.innerHTML = `
      <img class="lesson-thumb ${thumbUrl ? 'is-ready' : ''}" src="${thumbUrl}" alt="" aria-hidden="true" width="${tw}" height="${tw}" />
      <span class="lesson-title">${lesson.cardTitle ?? lesson.title}</span>
      <span class="lesson-done" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span>
      <svg class="chev" viewBox="0 0 24 24"><path d="M9 5.5 15.5 12 9 18.5"/></svg>
    `;

    li.addEventListener('click', () => loadLesson(lesson.id));
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadLesson(lesson.id); }
    });
    ol.append(li);
  });
}

function paintDone() {
  F('#lesson-list')?.querySelectorAll('[data-id]').forEach((li) => {
    li.classList.toggle('is-done', H.done.has(li.dataset.id));
  });
}

// ─── Clock ───────────────────────────────────────────────────────────────────

function startClock() {
  function tick() {
    const now = new Date();
    const dateEl = F('#clock-date');
    const timeEl = F('#clock-time');
    if (dateEl) dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    if (timeEl) timeEl.textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  tick();
  setInterval(tick, 1000);
}

// ─── Visibility ───────────────────────────────────────────────────────────────

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopSketch();
});

// ─── Console resize grip ──────────────────────────────────────────────────────

function wireConsoleGrip() {
  const grip = F('.console-grip');
  const wrap = F('.code-wrap');
  if (!grip || !wrap) return;

  let startY = 0, startH = 0;
  grip.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    startY = e.clientY;
    const consoleEl = F('.console');
    startH = consoleEl ? consoleEl.offsetHeight : 120;
    grip.addEventListener('pointermove', onMove);
    grip.addEventListener('pointerup', () => grip.removeEventListener('pointermove', onMove), { once: true });
  });

  function onMove(e) {
    const consoleEl = F('.console');
    if (!consoleEl) return;
    const newH = Math.max(60, Math.min(400, startH - (e.clientY - startY)));
    consoleEl.style.height = `${newH}px`;
    try { localStorage.setItem('console-height', newH); } catch { /* quota */ }
  }
}

// ─── Copy button ─────────────────────────────────────────────────────────────

function wireCopy() {
  const btn = F('.btn-copy');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const code = F('.code code');
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.textContent ?? '');
      btn.setAttribute('aria-label', 'Copied!');
      setTimeout(() => btn.setAttribute('aria-label', 'Copy code'), 2000);
    } catch { /* permission denied */ }
  });
}

// ─── Init ───────────────────────────────────────────────────────────────────

async function init() {
  loadPersisted();
  applyAllSettings();
  startClock();
  wireViewbar();
  wireConsoleGrip();
  wireCopy();
  wireBuilderFlyout();

  // Render thumbnails (async, may take a moment)
  try {
    await renderThumbnails(lessons);
  } catch (err) {
    console.warn('Thumbnail render failed:', err);
  }

  // Populate lesson list now that Oe may be filled
  populateLessonList();
  paintDone();

  // Load first lesson
  loadLesson('board');

  // Reveal app
  F('#app').removeAttribute('inert');
  document.documentElement.classList.remove('is-loading');
  const loader = F('#loader');
  if (loader) {
    loader.classList.add('is-done');
    loader.style.opacity = '0';
    loader.style.pointerEvents = 'none';
    setTimeout(() => {
      loader.style.display = 'none';
      loader.hidden = true;
    }, 400);
  }
}

init().catch(console.error);
