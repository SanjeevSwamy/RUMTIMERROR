export class Leaders {
  constructor({ rig, svg, tags, onChange } = {}) {
    this.rig = rig || null
    this.svg = svg || null
    this.tags = tags || null
    this.onChange = onChange || null
    this.tagEls = []
    this.visible = false
    this.entries = []
    if (this.svg) this.svg.classList.toggle('is-on', false)
  }

  setVisible(on) {
    this.visible = !!on
    if (this.rig) this.rig.classList.toggle('is-on', this.visible)
    if (this.svg) this.svg.classList.toggle('is-on', this.visible)
    if (this.tags) this.tags.classList.toggle('is-on', this.visible)
    this.onChange && this.onChange(this.visible)
  }

  setEntries(entries) {
    this.entries = entries || []
    this._renderTags()
  }

  _renderTags() {
    if (!this.tags) return
    this.tags.innerHTML = ''
    this.tagEls = []
    for (const entry of this.entries) {
      const tag = document.createElement('div')
      tag.className = 'tag'
      tag.dataset.part = entry.part
      const label = document.createElement('span')
      label.className = 'tag-label'
      label.textContent = entry.label
      tag.appendChild(label)
      this.tags.appendChild(tag)
      this.tagEls.push({ entry, el: tag })
    }
    this.update()
  }

  update(frameData) {
    if (!this.visible) return
    const wpx = this.svg ? this.svg.clientWidth : 0
    const hpx = this.svg ? this.svg.clientHeight : 0
    if (this.svg && wpx && hpx) {
      this.svg.setAttribute('viewBox', `0 0 ${wpx} ${hpx}`)
    }
    while (this.svg && this.svg.firstChild) this.svg.removeChild(this.svg.firstChild)
    for (const { entry, el } of this.tagEls) {
      const sx = frameData ? frameData.sx : 0
      const sy = frameData ? frameData.sy : 0
      el.style.transform = `translate(${sx}px, ${sy}px)`
      if (this.svg) {
        const svgNS = 'http://www.w3.org/2000/svg'
        const line = document.createElementNS(svgNS, 'line')
        line.setAttribute('x1', sx)
        line.setAttribute('y1', sy)
        const lx = sx + 40, ly = sy - 40
        line.setAttribute('x2', lx)
        line.setAttribute('y2', ly)
        line.setAttribute('class', 'leader-line')
        this.svg.appendChild(line)
        const dot = document.createElementNS(svgNS, 'circle')
        dot.setAttribute('cx', sx)
        dot.setAttribute('cy', sy)
        dot.setAttribute('r', 3)
        dot.setAttribute('class', 'leader-dot')
        this.svg.appendChild(dot)
      }
    }
  }
}
