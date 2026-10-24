export class SignalsReadout {
  constructor(el) {
    this.el = el
    this.rows = new Map()
    this._layout()
  }

  _layout() {
    if (!this.el) return
    this.el.innerHTML = ''
    this.rows.clear()
  }

  setLesson(lesson) {
    this.clear()
    if (this.el) this.el.dataset.lesson = lesson ? lesson.id : ''
  }

  push(label, value) {
    if (!this.el) return
    let row = this.rows.get(label)
    if (!row) {
      row = document.createElement('div')
      row.className = 'signal-row'
      const name = document.createElement('span')
      name.className = 'signal-name'
      name.textContent = label
      const val = document.createElement('span')
      val.className = 'signal-value'
      row.appendChild(name)
      row.appendChild(val)
      this.el.appendChild(row)
      row._valueEl = val
      this.rows.set(label, row)
    }
    row._valueEl.textContent = String(value)
  }

  remove(label) {
    const row = this.rows.get(label)
    if (row) {
      row.remove()
      this.rows.delete(label)
    }
  }

  clear() {
    if (!this.el) return
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild)
    this.rows.clear()
  }
}
