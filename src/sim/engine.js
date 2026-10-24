/**
 * Arduino sketch engine.
 *
 * Transpiles the lesson sketches (simple C/Arduino subset — the same code you see
 * in the CodeCard) into JavaScript and executes setup()/loop() against a pin shim.
 * Real-time delays (delay/ms maps 1:1 to wall clock) keep the 3D scene and the
 * virtual MCU in sync. Inputs (buttons, pots) read live through callbacks, and
 * outputs (LEDs, buzzer, servo, serial) are pushed out via hooks the host installs.
 */

const _win = typeof window !== 'undefined' ? window : globalThis;
const _raf = typeof requestAnimationFrame === 'function'
  ? requestAnimationFrame
  : (cb) => setTimeout(() => cb(performance.now()), 16);

export const CONSTANTS = {
  HIGH: 1,
  LOW: 0,
  INPUT: 0,
  OUTPUT: 1,
  INPUT_PULLUP: 2,
  LED_BUILTIN: 13,
  CHANGE: 1,
  RISING: 2,
  FALLING: 3,
  A0: 'A0', A1: 'A1', A2: 'A2', A3: 'A3', A4: 'A4', A5: 'A5',
};

export class Serial_t {
  constructor(engine) { this._engine = engine; }
  begin(_baud) { /* informational only */ }
  print(...args) {
    const text = args.map(_fmt).join('');
    this._engine.hooks.hookSerial?.(text);
  }
  println(...args) {
    const text = args.map(_fmt).join('');
    this._engine.hooks.hookSerial?.(text + '\n');
  }
  write(x) { this._engine.hooks.hookSerial?.(typeof x === 'number' ? String.fromCharCode(x) : String(x)); }
  _available() { return 0; }
  _read() { return -1; }
  end() {}
}

function _fmt(v) {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return 'nan';
    return Number.isInteger(v) ? String(Math.round(v)) : String(Math.round(v * 100) / 100);
  }
  return typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v);
}

/** Servo shim — mirrors the C++ library surface the lessons use */
export class Servo {
  constructor(engine) {
    this._engine = engine ?? getEngine();
    this._pin = null;
  }
  attach(pin, _min, _max) { this._pin = pin; }
  write(deg) { this._engine.hooks.hookServo?.(this._pin, Math.max(0, Math.min(180, Number(deg) || 0))); }
  attached() { return this._pin !== null; }
  detach() { this._pin = null; }
}

export class Stepper {
  constructor(actuallySteps, ...pins) {
    this._engine = getEngine();
    this.stepsPerRev = actuallySteps;
    this.pins = pins;
    this._pos = 0;
  }
  setSpeed(_rpm) {}
  step(n) {
    this._engine.hooks.hookStepper?.(this.pins, n);
    this._pos += n;
  }
}

// Engine context for classes the sketch news up directly
let _currentEngine = null;
export function getEngine() { return _currentEngine ?? { hookServo() {}, hookStepper() {}, hooks: {} }; }

export class SimEngine {
  /**
   * @param {object} hooks
   *   hookSerial(text)          — serial monitor output
   *   hookPinWrite(pin, v)      — digital 0/1 or analog 0..255 (PWM values come
   *                               through the same path with the pin's mode)
   *   hookTone(pin, freq, dur)  — piezo pitch in Hz
   *   hookNoTone()
   *   hookServo(pin, deg)
   *   hookStepper(pins, steps)
   *   readPin(pin)              — last-call digital input source
   *   readAnalog(pin)           — analog input source
   *   pulseEcho(mm)             — distance sensing (returns round-trip ms)
   */
  constructor(source, hooks = {}) {
    this.hooks = {
      hookSerial: hooks.hookSerial ?? null,
      hookPinWrite: hooks.hookPinWrite ?? null,
      hookTone: hooks.hookTone ?? null,
      hookNoTone: hooks.hookNoTone ?? null,
      hookServo: hooks.hookServo ?? null,
      hookStepper: hooks.hookStepper ?? null,
      readPin: hooks.readPin ?? null,
      readAnalog: hooks.readAnalog ?? null,
      pulseEcho: hooks.pulseEcho ?? null,
    };
    this.pins = new Map(); // pin -> { mode, pwm }
    this.alive = false;
    this._t0 = 0;
    this._runToken = 0;
    this._timeouts = new Set();
    this.api = this._makeApi();
    const compiled = this._compile(source);
    this.setup = compiled.setup;
    this.loop = compiled.loop;
    this.error = compiled.error;
  }

  _makeApi() {
    const engine = this;
    const pins = this.pins;
    this.Serial = new Serial_t(this);

    const pinMode = (pin, mode) => { pins.set(pin, { mode, pwm: 0 }); };
    const digitalRead = (pin) => {
      const p = pins.get(pin) ?? {};
      const src = engine.hooks.readPin?.(pin);
      if (typeof src === 'number') return src ? CONSTANTS.HIGH : CONSTANTS.LOW;
      // treat floating inputs as pulled up HIGH
      return (p.mode === CONSTANTS.INPUT_PULLUP ? 1 : (src ? 1 : 0)) ? CONSTANTS.HIGH : CONSTANTS.LOW;
    };
    const digitalWrite = (pin, value) => {
      if (!pins.get(pin)) pins.set(pin, { mode: CONSTANTS.OUTPUT, pwm: 0 });
      engine.hooks.hookPinWrite?.(pin, value ? CONSTANTS.HIGH : CONSTANTS.LOW);
    };
    const analogWrite = (pin, val) => {
      if (!pins.get(pin)) pins.set(pin, { mode: CONSTANTS.OUTPUT, pwm: val });
      pins.get(pin).pwm = val;
      engine.hooks.hookPinWrite?.(pin, val);
    };
    const analogRead = (pin) => engine.hooks.readAnalog?.(pin) ?? 0;

    const delay = (ms) => new Promise((res) => {
      const id = _win.setTimeout(() => {
        res();
      }, Math.max(0, Math.min(Number(ms) || 0, 10000)));
      engine._timeouts.add(id);
    }).then(() => engine.alive);
    const delayMicroseconds = (us) => delay(Math.max(Number(us) || 0, 1) / 1000);
    const millis = () => performance.now() - this._t0;
    const micros = () => (performance.now() - this._t0) * 1000;
    const pulseIn = (_pin, _val, timeout = 1000000) => engine.hooks.pulseEcho?.(_pin) ?? 0;

    const tone = (pin, freq, dur) => {
      engine.hooks.hookTone?.(pin, Number(freq) || 440, Number(dur) || 500);
    };
    const noTone = (pin) => engine.hooks.hookNoTone?.(pin);

    return {
      ...CONSTANTS, pinMode, digitalRead, digitalWrite, analogRead, analogWrite,
      delay, delayMicroseconds, millis, micros, pulseIn, tone, noTone,
      Serial: this.Serial,
      // bind Servo/Stepper instances to *this* engine, not whatever engine was
      // current when the sketch factory ran (compile happens in the constructor)
      Servo: class extends Servo { constructor() { super(engine); } },
      Stepper: class extends Stepper { constructor(steps, ...pins2) { super(steps, ...pins2); this._engine = engine; } },
      map: (v, a1, a2, b1, b2) => (v - a1) * (b2 - b1) / (a2 - a1) + b1,
    };
  }

  _compile(source) {
    if (!source || !source.trim()) return { setup: null, loop: null, error: 'empty sketch' };
    try {
      const js = transpile(source);
      const factory = new Function(
        'api',
        `const { pinMode, digitalRead, digitalWrite, analogRead, analogWrite,
               delay, delayMicroseconds, millis, micros, pulseIn, tone, noTone,
               map, OUTPUT, INPUT, INPUT_PULLUP, HIGH, LOW, LED_BUILTIN,
               A0, A1, A2, A3, A4, A5 } = api;
         const Serial = api.Serial;
         void Serial; void map;
         ${js}
         return { setup: typeof setup === 'function' ? setup : null,
                  loop:  typeof loop  === 'function' ? loop  : null };`
      );
      let out = null;
      // Detect construction of Servo/Stepper inside the source and bind them to this engine
      out = factory(this.api);
      return { setup: out.setup, loop: out.loop, error: null };
    } catch (err) {
      return { setup: null, loop: null, error: err?.message || String(err) };
    }
  }

  async start() {
    if (this.error) return this.error;
    if (this.alive) return null;
    this.alive = true;
    _currentEngine = this;
    const runToken = ++this._runToken;
    this._timeouts = new Set();
    this._t0 = performance.now();
    try {
      if (this.setup) await this.setup();
      while (this.alive && this._runToken === runToken) {
        if (!this.loop) break;
        await this.loop();
        // yield to the render loop, and bail if run was cut short
        await new Promise((r) => _raf(r));
      }
    } catch (err) {
      this.hooks.hookSerial?.('⚠ Sketch error: ' + (err?.message || err));
    }
    return null;
  }

  stop() {
    this.alive = false;
    this._runToken++;
    if (this._timeouts) for (const id of this._timeouts) _win.clearTimeout(id);
    this._timeouts = new Set();
  }
}

/**
 * Very lenient down-compile of the sketch subset used by the lessons.
 * Handles: comments, #include, #define, typed declarations (int/byte/float/const),
 * Serial/Millis-ish calls, tells loop()/setup() to be async and awaits delay-ish
 * calls, misc C++ shorthands (bool, true/false), Servo/Stepper instances.
 */
export function transpile(src) {
  let js = String(src);

  // strip block comments + line comments + preprocessor
  js = js.replace(/\/\*[\s\S]*?\*\//g, ' ');
  js = js.replace(/^\s*\/\/.*$/gm, ' ');
  js = js.replace(/^\s*#.*$/gm, ' ');

  // standalone arity-safe lexical massaging
  js = js
    .replace(/\btrue\b/g, 'true').replace(/\bfalse\b/g, 'false')
    .replace(/(\b(?:const\s|static\s)?)(?:int|byte|char|float|double|long|unsigned\s+int|unsigned\s+long)(\s+[A-Za-z_$])/g,
             (_m, pre, name) => `${pre.trim().startsWith('const') ? '' : pre}var${name}`)
    .replace(/\b(?:void|int|byte|char|float|double|long|unsigned\s+int|unsigned\s+long|bool)\s+(setup|loop)\s*\(/g, 'async function $1(')
    .replace(/\b(?:void|int|byte|char|float|double|long|unsigned\s+int|unsigned\s+long|bool)\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g,
             (_m, name, args) => `async function ${name}(${args}) {`)
    .replace(/\bint\s+[A-Za-z_$][\w$]*\s*\(`,/g, 'var ')

    // var decls in function bodies: "int x = 5;" or "int x;" → var
    .replace(/(^|[^.\w$])(?:int|byte|char|float|double|long|bool|unsigned\s+long|unsigned\s+int)\s+([A-Za-z_$][\w$]*)\s*(\[\])?\s*(;|=)/g,
             (_m, pre, name, arr, term) => `${pre}var ${name}${arr ?? ''}${term}`)
    // declarations inside exec: "int b = digitalRead(..);"
    // serial calls
    .replace(/Serial\.(begin|end|print|println|write|available?|read)\(/g, (_m, m) => {
      if (m === 'available') return 'Serial._available(';
      if (m === 'read') return 'Serial._read(';
      return `Serial.${m}(`;
    })
    // Servo / stepper variable construction: "Servo s;" → s = new Servo()
    .replace(/\bServo\s+([A-Za-z_$][\w$]*)\s*;/g, '$1 = new api.Servo();')
    .replace(/\bStepper\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*;/g, 'var $1 = new api.Stepper($2);')
    // stepper.step/attach calls with manual pin calls fine as is

    // awaits on timed things
    .replace(/(?<![/\w$])delay\s*\(/g, 'await delay(')
    .replace(/(?<![/\w$])delayMicroseconds\s*\(/g, 'await delayMicroseconds(')
    .replace(/(?<![/\w$])pulseIn\s*\(/g, 'await pulseIn(');

  // ensure brace overload of typing loops yields to avoid infinite-loop blocking
  js = js.replace(/\bdo\s*\{/g, 'do{');
  return js;
}
