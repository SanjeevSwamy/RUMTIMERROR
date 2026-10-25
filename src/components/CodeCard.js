const SKETCHES = {
  board: `// 1. Meet the Board\n// Built-in LED on pin 13 (L)\n\nvoid setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(1000);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(1000);\n}`,
  blink: `// 2. Blink an LED\nconst int ledPin = 13;\n\nvoid setup() {\n  pinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(ledPin, HIGH);\n  delay(500);\n  digitalWrite(ledPin, LOW);\n  delay(500);\n}`,
  button: `// 3. Push a Button\nconst int buttonPin = 2;\nconst int ledPin = 13;\n\nvoid setup() {\n  pinMode(buttonPin, INPUT);\n  pinMode(ledPin, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int state = digitalRead(buttonPin);\n  Serial.print("Button: ");\n  Serial.println(state ? "PRESSED" : "RELEASED");\n  digitalWrite(ledPin, state);\n  delay(100);\n}`,
  knob: `// 4. Turn a Knob\nconst int potPin = A0;\n\nvoid setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int val = analogRead(potPin);\n  Serial.print("Knob: ");\n  Serial.println(val);\n  delay(150);\n}`,
  rgb: `// 5. Mix Colours\nconst int rPin = 9;\nconst int gPin = 10;\nconst int bPin = 11;\n\nvoid setup() {\n  pinMode(rPin, OUTPUT);\n  pinMode(gPin, OUTPUT);\n  pinMode(bPin, OUTPUT);\n}\n\nvoid loop() {\n  analogWrite(rPin, 255);\n  analogWrite(gPin, 128);\n  analogWrite(bPin, 0);\n  delay(500);\n}`,
  light: `// 6. Sense Light\nconst int ldrPin = A0;\n\nvoid setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int light = analogRead(ldrPin);\n  Serial.print("Light level: ");\n  Serial.println(light);\n  delay(200);\n}`,
  sensor: `// 7. Read a Sensor (HC-SR04)\nconst int trig = 9;\nconst int echo = 10;\n\nvoid setup() {\n  pinMode(trig, OUTPUT);\n  pinMode(echo, INPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  digitalWrite(trig, LOW);\n  delayMicroseconds(2);\n  digitalWrite(trig, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(trig, LOW);\n  long dur = pulseIn(echo, HIGH);\n  int dist = dur * 0.034 / 2;\n  Serial.print("Distance: ");\n  Serial.print(dist);\n  Serial.println(" cm");\n  delay(200);\n}`,
  sound: `// 8. Make a Sound\nconst int buzzerPin = 8;\n\nvoid setup() {\n  pinMode(buzzerPin, OUTPUT);\n}\n\nvoid loop() {\n  tone(buzzerPin, 440, 200);\n  delay(300);\n  tone(buzzerPin, 523, 300);\n  delay(500);\n}`,
  piano: `// 9. Mini Piano\nconst int buzzer = 8;\nconst int btn = 2;\n\nvoid setup() {\n  pinMode(btn, INPUT_PULLUP);\n}\n\nvoid loop() {\n  if (digitalRead(btn) == LOW) {\n    tone(buzzer, 523);\n  } else {\n    noTone(buzzer);\n  }\n}`,
  motor: `// 10. Control a Motor\nconst int motorPin = 9;\n\nvoid setup() {\n  pinMode(motorPin, OUTPUT);\n}\n\nvoid loop() {\n  analogWrite(motorPin, 180);\n  delay(1000);\n  analogWrite(motorPin, 255);\n  delay(1000);\n  analogWrite(motorPin, 0);\n  delay(1000);\n}`,
  heat: `// 11. Sense Heat (TMP36)\nconst int tempPin = A0;\n\nvoid setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int reading = analogRead(tempPin);\n  float v = reading * (5.0 / 1024.0);\n  float tempC = (v - 0.5) * 100;\n  Serial.print("Temperature: ");\n  Serial.print(tempC);\n  Serial.println(" C");\n  delay(500);\n}`,
  servo: `// 12. Sweep a Servo\n#include <Servo.h>\nServo s;\n\nvoid setup() {\n  s.attach(9);\n}\n\nvoid loop() {\n  s.write(0);\n  delay(600);\n  s.write(90);\n  delay(600);\n  s.write(180);\n  delay(600);\n}`,
  stepper: `// 13. Spin the Wheel\n#include <Stepper.h>\nconst int steps = 2048;\nStepper stp(steps, 8, 10, 9, 11);\n\nvoid setup() {\n  stp.setSpeed(12);\n}\n\nvoid loop() {\n  stp.step(steps);\n  delay(1000);\n}`,
  plant: `// 14. Smart Plant\nconst int soilPin = A0;\n\nvoid setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int moist = analogRead(soilPin);\n  Serial.print("Moisture: ");\n  Serial.println(moist);\n  delay(1000);\n}`,
  force: `// 15. Feel the Force\nconst int fsrPin = A0;\n\nvoid setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int force = analogRead(fsrPin);\n  Serial.print("Force: ");\n  Serial.println(force);\n  delay(100);\n}`,
  project: `// 16. Build a Project\nconst int trig = 9, echo = 10;\nconst int redLed = 12, grnLed = 11;\n\nvoid setup() {\n  pinMode(trig, OUTPUT);\n  pinMode(echo, INPUT);\n  pinMode(redLed, OUTPUT);\n  pinMode(grnLed, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  digitalWrite(trig, LOW); delayMicroseconds(2);\n  digitalWrite(trig, HIGH); delayMicroseconds(10);\n  digitalWrite(trig, LOW);\n  long dur = pulseIn(echo, HIGH);\n  int cm = dur * 0.034 / 2;\n  bool alert = (cm > 0 && cm < 15);\n  digitalWrite(redLed, alert);\n  digitalWrite(grnLed, !alert);\n  Serial.println(alert ? "STOP!" : "CLEAR");\n  delay(150);\n}`
};

export class CodeCard {
  constructor(el, { onRun, onStop, onParam, onExpand } = {}) {
    this.el = el
    this.onRun = onRun || null
    this.onStop = onStop || null
    this.onParam = onParam || null
    this.onExpand = onExpand || null
    this._code = ''
    this._running = false

    this.btnRun = el ? el.querySelector('.btn-run') : null
    this.btnCopy = el ? el.querySelector('.btn-copy') : null
    this.btnExpand = el ? el.querySelector('.btn-expand') : null
    this.consoleEl = el ? el.querySelector('.console') : null
    this.consoleClose = el ? el.querySelector('.console-close') : null
    this.consoleText = el ? (el.querySelector('.console-lines') || el.querySelector('.console-text')) : null
    this.codeEl = el ? el.querySelector('code') : null

    // the code area is contenteditable; keep _code in sync or typed edits never compile
    if (this.codeEl) {
      this.codeEl.addEventListener('input', () => {
        this._code = this.codeEl.textContent ?? ''
      })
    }

    if (this.btnRun) this.btnRun.addEventListener('click', () => this._toggleRun())
    if (this.btnCopy) {
      this.btnCopy.addEventListener('click', async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(this._code)
          } else {
            const ta = document.createElement('textarea')
            ta.value = this._code
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            ta.remove()
          }
          this.btnCopy.classList.add('is-copied')
          setTimeout(() => this.btnCopy.classList.remove('is-copied'), 1200)
        } catch (err) {
          this.appendLine('Copy failed: ' + err.message)
        }
      })
    }
    if (this.btnExpand && this.el) {
      this.btnExpand.addEventListener('click', () => {
        this.el.classList.toggle('is-expanded')
        this.onExpand && this.onExpand(this.el.classList.contains('is-expanded'))
      })
    }
    if (this.consoleClose && this.el) {
      this.consoleClose.addEventListener('click', () => {
        this.el.setAttribute('data-state', 'idle')
        this.onStop && this.onStop()
      })
    }
  }

  setLesson(arg) {
    if (typeof arg === 'string') {
      this._code = arg
    } else if (arg && typeof arg === 'object') {
      this._code = arg.code || arg.sketch || SKETCHES[arg.id] || `// Lesson: ${arg.title || arg.id}\nvoid setup() {}\nvoid loop() {}`
    } else {
      this._code = ''
    }
    this.renderFormattedCode(this._code)
    el_setState(this.el, 'idle')
    if (this.consoleText) this.consoleText.textContent = ''
  }

  renderFormattedCode(text) {
    if (!this.codeEl) return
    const lines = (text ?? '').split('\n')
    this._traceSpans = []
    this._traceSpanCount = lines.length
    this._traceLine = null
    this.codeEl.innerHTML = ''
    const frag = document.createDocumentFragment()
    lines.forEach((lineText, idx) => {
      const lineSpan = document.createElement('span')
      lineSpan.className = 'line'
      lineSpan.dataset.l = String(idx + 1)
      const ln = document.createElement('span')
      ln.className = 'ln'
      ln.textContent = String(idx + 1)
      lineSpan.appendChild(ln)
      const codeSpan = document.createElement('span')
      codeSpan.className = 'code-text'
      codeSpan.textContent = lineText || ' '
      lineSpan.appendChild(codeSpan)
      frag.appendChild(lineSpan)
      this._traceSpans.push(lineSpan)
    })
    this.codeEl.appendChild(frag)
  }

  getCode() {
    return this._code
  }

  // ─── runtime line tracing ──────────────────────────────────────────────────
  highlightLine(n) {
    if (!this.codeEl || !n || n === this._traceLine) return
    const isRunning = this.el?.getAttribute('data-state') === 'running'
    if (!isRunning) return
    if (!this._traceSpans || this._traceSpans.length === 0) {
      this.renderFormattedCode(this._code)
    }
    if (this._traceLine != null && this._traceSpans[this._traceLine - 1]) {
      this._traceSpans[this._traceLine - 1].classList.remove('is-running', 'is-traced')
    }
    this._traceLine = n
    const span = this._traceSpans[n - 1]
    if (span) {
      span.classList.add('is-running', 'is-traced')
      span.scrollIntoView({ block: 'nearest' })
    }
  }

  clearTrace() {
    if (this._traceLine != null && this._traceSpans?.[this._traceLine - 1]) {
      this._traceSpans[this._traceLine - 1].classList.remove('is-running', 'is-traced')
    }
    this._traceLine = null
  }

  setToggle(on) {
    this._running = !!on
    if (this.btnRun) this.btnRun.setAttribute('aria-pressed', String(!!on))
  }

  setState(state) {
    el_setState(this.el, state)
  }

  _toggleRun() {
    const running = this.el.getAttribute('data-state') === 'running'
    if (running) {
      el_setState(this.el, 'idle')
      this.onStop && this.onStop()
    } else {
      el_setState(this.el, 'running')
      this.onRun && this.onRun()
    }
  }

  appendLine(text) {
    if (!this.consoleText) return
    const line = document.createElement('div')
    line.textContent = text
    this.consoleText.appendChild(line)
    const consoleBox = this.consoleText.parentElement
    if (consoleBox) consoleBox.scrollTop = consoleBox.scrollHeight
  }

  clearConsole() {
    if (this.consoleText) this.consoleText.textContent = ''
  }
}

function el_setState(el, state) {
  if (el) el.setAttribute('data-state', state)
}
