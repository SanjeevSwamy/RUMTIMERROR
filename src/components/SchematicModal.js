export class SchematicModal {
  constructor(el, { onHover, onSelect, onClose } = {}) {
    this.el = el
    this.onHover = onHover || null
    this.onSelect = onSelect || null
    this.onClose = onClose || null
    this._holder = el ? el.querySelector('.schematic-holder') : null
    this._closeBtn = el ? el.querySelector('.schematic-close') : null
    this._closingTimer = null

    this._onAnimEnd = (e) => {
      if (e.target === el && el.classList.contains('is-closing')) {
        el.classList.remove('is-closing')
        el.classList.remove('is-on')
      }
    }
    if (el) el.addEventListener('animationend', this._onAnimEnd)
    if (this._closeBtn) this._closeBtn.addEventListener('click', () => this.close())
  }

  setLesson(lesson, svgString) {
    if (!this._holder) return
    this._holder.innerHTML = ''
    if (!svgString) return
    this._holder.innerHTML = svgString
    const svg = this._holder.querySelector('svg')
    if (svg) {
      svg.setAttribute('width', '100%')
      svg.setAttribute('height', '100%')
      svg.removeAttribute('style')
    }
    this._wireSymbols(this._holder)
  }

  _wireSymbols(scope) {
    if (!scope) return
    const symbols = scope.querySelectorAll('.sym[data-part]')
    for (const sym of symbols) {
      sym.setAttribute('tabindex', '0')
      sym.setAttribute('role', 'button')
      sym.addEventListener('click', () => {
        const part = sym.dataset.part
        this.onSelect && this.onSelect(part)
      })
      sym.addEventListener('pointerenter', () => {
        const part = sym.dataset.part
        this.onHover && this.onHover(part)
      })
      sym.addEventListener('pointerleave', () => {
        this.onHover && this.onHover(null)
      })
    }
  }

  setOpen(on) {
    if (!this.el) return
    if (this._closingTimer) {
      clearTimeout(this._closingTimer)
      this._closingTimer = null
    }
    if (on) {
      this.el.classList.remove('is-closing')
      this.el.classList.add('is-on')
    } else {
      this.close()
    }
  }

  close() {
    if (!this.el) return
    if (!this.el.classList.contains('is-on')) return
    this.el.classList.add('is-closing')
    this.onClose && this.onClose()
    if (this._closingTimer) clearTimeout(this._closingTimer)
    this._closingTimer = setTimeout(() => {
      this.el.classList.remove('is-closing')
      this.el.classList.remove('is-on')
      this._closingTimer = null
    }, 400)
  }
}
