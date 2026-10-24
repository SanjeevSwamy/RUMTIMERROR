export class Sidebar {
  constructor(sidebarEl, flyoutEl, { onNav, onSettings } = {}) {
    this.sidebar = sidebarEl
    this.flyout = flyoutEl
    this.onNav = onNav || null
    this.onSettings = onSettings || null
    this._currentNav = ''
    this._toggles = {}

    if (this.sidebar) {
      const navEls = this.sidebar.querySelectorAll('[data-nav]')
      for (const el of navEls) {
        el.addEventListener('click', () => {
          const nav = el.getAttribute('data-nav')
          this._setNavItem(nav)
          this.onNav && this.onNav(nav)
        })
      }
      const toggles = this.sidebar.querySelectorAll('[data-setting]')
      for (const el of toggles) {
        const key = el.getAttribute('data-setting')
        this._toggles[key] = el
        el.addEventListener('click', () => {
          const next = !el.getAttribute('aria-pressed') || el.getAttribute('aria-pressed') !== 'true'
          el.setAttribute('aria-pressed', String(next))
          this.onSettingDo(key, next)
        })
      }
    }
  }

  _setNavItem(nav) {
    this._currentNav = nav
    if (!this.sidebar) return
    const navEls = this.sidebar.querySelectorAll('[data-nav]')
    for (const el of navEls) {
      const active = el.getAttribute('data-nav') === nav
      el.classList.toggle('is-nav-current', active)
      el.setAttribute('aria-current', active ? 'page' : 'false')
    }
  }

  setNav(nav) {
    this.refresh({ nav })
  }

  refresh(H) {
    if (!this.sidebar || !this.flyout) return
    if (H && H.nav) this._setNavItem(H.nav)
    let nav = this._currentNav
    this.flyout.innerHTML = ''
    if (nav === 'builder') {
      this._renderBuilder(H)
    } else {
      nav = ''
    }
    this.flyout.dataset.nav = nav
    this.flyout.classList.toggle('is-open', nav === 'builder')
  }

  _renderBuilder(H) {
    this.flyout.dataset.nav = 'builder'
    const h = document.createElement('h2')
    h.textContent = 'Circuit Builder'
    this.flyout.appendChild(h)
    const p = document.createElement('p')
    p.className = 'fly-count'
    p.textContent = 'add parts · drag to place · wire pins'
    this.flyout.appendChild(p)

    const palette = document.createElement('div')
    palette.className = 'fly-palette'
    const items = [
      ['led', 'LED', 'led'],
      ['resistor', 'Resistor', 'res'],
      ['button', 'Button', 'btn'],
      ['knob', 'Knob', 'pot'],
      ['sensor', 'Distance', 'dist'],
      ['buzzer', 'Buzzer', 'buz'],
      ['servo', 'Servo', 'servo'],
    ]
    for (const [add, label, cls] of items) {
      const btn = document.createElement('button')
      btn.className = `palette-part ${cls}`
      btn.dataset.add = add
      btn.textContent = label
      palette.appendChild(btn)
    }
    this.flyout.appendChild(palette)

    const tools = document.createElement('div')
    tools.className = 'fly-tools'
    const wireBtn = document.createElement('button')
    wireBtn.className = 'fly-toggle'
    wireBtn.dataset.btool = 'wire'
    wireBtn.setAttribute('aria-pressed', String(!!(H && H.wireMode)))
    wireBtn.textContent = '⚡ Wire tool'
    const clearBtn = document.createElement('button')
    clearBtn.className = 'fly-toggle'
    clearBtn.dataset.btool = 'clear'
    clearBtn.textContent = '⌫ Clear board'
    tools.appendChild(wireBtn)
    tools.appendChild(clearBtn)
    this.flyout.appendChild(tools)

    const help = document.createElement('p')
    help.className = 'fly-help'
    help.textContent = 'Drag parts onto the breadboard. Wire tool: click a pin, then click a row. Rotate knobs by dragging, press buttons by clicking them. Delete removes the selected part.'
    this.flyout.appendChild(help)
  }

  onSettingDo(key, next) {
    this.onSettings && this.onSettings(key, next)
  }

  setSetting(key, val) {
    const el = this._toggles[key]
    if (el) el.setAttribute('aria-pressed', String(!!val))
  }

  setLang(code, label) {
    if (!this.sidebar) return
    const codeEl = this.sidebar.querySelector('.side-code')
    const labelEl = this.sidebar.querySelector('.side-label')
    if (codeEl) codeEl.textContent = code
    if (labelEl) labelEl.textContent = label
  }
}
