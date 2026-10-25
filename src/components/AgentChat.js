// Builder assistant chat — dumb terminal, smart brain. The component only
// manages DOM + history; the answering logic lives in src/agent/brain.js so it
// can be unit-tested against snapshots without a DOM.

export class AgentChat {
  constructor(root, { respond } = {}) {
    this.root = root
    this.respond = respond || (() => '')
    this.msgs = root?.querySelector('.agent-msgs') ?? null
    this.form = root?.querySelector('.agent-form') ?? null
    this.input = root?.querySelector('.agent-input') ?? null
    this._history = []
    this._greeted = false
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault()
        const text = this.input?.value?.trim()
        if (!text) return
        this.input.value = ''
        this.send(text)
      })
    }
  }

  _bubble(role, text) {
    if (!this.msgs) return
    const b = document.createElement('div')
    b.className = `agent-msg agent-msg--${role}`
    b.textContent = text
    this.msgs.appendChild(b)
    this.msgs.scrollTop = this.msgs.scrollHeight
    while (this.msgs.children.length > 60) this.msgs.firstChild.remove()
    this._history.push({ role, text, at: Date.now() })
  }

  send(text) {
    const reply = this.respond(text)
    this._bubble('user', text)
    if (reply) {
      // slight stagger so replies read like conversation, not a database dump
      const chunks = String(reply).split('\n\n')
      chunks.forEach((chunk, i) => {
        setTimeout(() => this._bubble('agent', chunk), 90 * (i + 1))
      })
    }
    return reply
  }

  /** context-aware greeting the first time the builder opens */
  greetOnce(text) {
    if (this._greeted) return
    this._greeted = true
    this._bubble('agent', text)
  }

  get history() {
    return this._history.slice()
  }
}
