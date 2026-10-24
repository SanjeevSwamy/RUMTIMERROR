export class LessonList {
  constructor(el, { onSelect, onDrag } = {}) {
    this.el = el
    this.onSelect = onSelect || null
    this.onDrag = onDrag || null
    this.lessons = []
    this.doneSet = new Set()
    this._dragging = false
    this._dragStart = null
    this._items = []
  }

  setLessons(lessons, doneSet) {
    this.lessons = lessons
    this.doneSet = doneSet instanceof Set ? doneSet : new Set(doneSet || [])
    this.render()
  }

  paintDone(doneSet) {
    this.doneSet = doneSet instanceof Set ? doneSet : new Set(doneSet || [])
    for (const li of this._items) {
      li.classList.toggle('is-done', this.doneSet.has(li.dataset.id))
    }
  }

  render() {
    const el = this.el
    el.innerHTML = ''
    this._items = []
    this.lessons.forEach((lesson, i) => {
      const li = document.createElement('li')
      li.className = 'lesson'
      li.setAttribute('role', 'button')
      li.tabIndex = 0
      li.dataset.id = lesson.id
      const w = lesson.ke != null ? lesson.ke : 260
      const tw = lesson.thumbTa != null ? lesson.thumbTa : 96
      li.style.setProperty('--w', `${w}px`)
      li.style.setProperty('--tw', `${tw}px`)
      li.setAttribute('aria-label', `Lesson ${i + 1}: ${lesson.title}`)

      const thumb = document.createElement('img')
      thumb.className = 'lesson-thumb'
      thumb.alt = ''
      thumb.loading = 'lazy'
      const src = lesson.thumbDataUrl || lesson.thumb
      if (src) thumb.src = src

      const meta = document.createElement('div')
      meta.className = 'lesson-meta'
      const title = document.createElement('span')
      title.className = 'lesson-title'
      title.textContent = lesson.title
      meta.appendChild(title)
      const done = document.createElement('span')
      done.className = 'lesson-done'
      done.textContent = '✓'
      meta.appendChild(done)
      const chev = document.createElement('span')
      chev.className = 'lesson-chev'
      chev.textContent = '›'
      li.appendChild(thumb)
      li.appendChild(meta)
      li.appendChild(chev)
      li.classList.toggle('is-done', this.doneSet.has(lesson.id))

      li.addEventListener('click', () => {
        if (this._dragging) return
        this.onSelect && this.onSelect(lesson.id)
      })
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          this.onSelect && this.onSelect(lesson.id)
        }
      })
      li.addEventListener('pointerdown', (e) => {
        this._dragging = false
        this._dragStart = { x: e.clientX, y: e.clientY }
      })
      li.addEventListener('pointermove', (e) => {
        if (!this._dragStart) return
        const dx = e.clientX - this._dragStart.x
        const dy = e.clientY - this._dragStart.y
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          this._dragging = true
          this.onDrag && this.onDrag(true)
        }
      })
      li.addEventListener('pointerup', () => {
        this._dragStart = null
        setTimeout(() => { this._dragging = false }, 0)
      })
      el.appendChild(li)
      this._items.push(li)
    })
  }
}
