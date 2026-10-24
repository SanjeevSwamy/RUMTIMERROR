export class Inspector {
  constructor(el, { svg } = {}) {
    this.el = el
    this.svgEl = svg || null
    this.probeLayer = null
    this.annoLayer = null
    this._probes = new Map()
    this._annos = new Map()
    this._gridOn = false
    this._grid = this.el ? this.el.querySelector('.insp-grid') : null
    if (!this._grid && this.el) {
      this._grid = document.createElement('div')
      this._grid.className = 'insp-grid'
      this.el.appendChild(this._grid)
    }
  }

  setLesson(lesson) {
    this.clearProbes()
    this.clearAnnos()
    const probes = lesson.probes || {}
    for (const [name, fn] of Object.entries(probes)) {
      this.addProbe(name, fn)
    }
    if (this._grid) this._grid.classList.toggle('is-on', this._gridOn)
  }

  addProbe(name, fn) {
    const layer = this._probeLayer()
    if (!layer) return
    const probe = document.createElement('div')
    probe.className = 'insp-probe'
    probe.dataset.probe = name
    layer.appendChild(probe)
    this._probes.set(name, { el: probe, fn })
  }

  updateProbes(values) {
    for (const { el, fn } of this._probes.values()) {
      const v = fn ? fn(values) : ''
      if (el.firstChild) el.firstChild.nodeValue = String(v)
      else el.textContent = String(v)
    }
  }

  clearProbes() {
    this._probes.clear()
    if (this.probeLayer) {
      this.probeLayer.innerHTML = ''
      this.probeLayer.remove()
      this.probeLayer = null
    }
  }

  addAnno(part, text) {
    const layer = this._annoLayer()
    if (!layer) return
    const anno = document.createElement('div')
    anno.className = 'insp-anno'
    anno.dataset.part = part
    anno.textContent = text
    layer.appendChild(anno)
    this._annos.set(part, anno)
  }

  removeAnno(part) {
    const anno = this._annos.get(part)
    if (anno) {
      anno.remove()
      this._annos.delete(part)
    }
  }

  clearAnnos() {
    this._annos.clear()
    if (this.annoLayer) {
      this.annoLayer.innerHTML = ''
      this.annoLayer.remove()
      this.annoLayer = null
    }
  }

  setValues(values) {
    this.updateProbes(values)
  }

  setGrid(on) {
    this._gridOn = !!on
    if (this._grid) this._grid.classList.toggle('is-on', this._gridOn)
  }

  announce(msg) {
    if (this._grid) this._grid.setAttribute('data-msg', msg)
  }

  _probeLayer() {
    if (this.probeLayer && this.probeLayer.isConnected) return this.probeLayer
    if (!this.el) return null
    this.probeLayer = document.createElement('div')
    this.probeLayer.className = 'insp-probe-layer'
    this.el.appendChild(this.probeLayer)
    return this.probeLayer
  }

  _annoLayer() {
    if (this.annoLayer && this.annoLayer.isConnected) return this.annoLayer
    if (!this.el) return null
    this.annoLayer = document.createElement('div')
    this.annoLayer.className = 'insp-anno-layer'
    this.el.appendChild(this.annoLayer)
    return this.annoLayer
  }
}
