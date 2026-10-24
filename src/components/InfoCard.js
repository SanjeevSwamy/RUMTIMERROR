// dom.js lives in src/, not src/components/


const lede = (h, lesson) => {
  h.innerHTML = '';
  const head = document.createElement('h2');
  head.textContent = lesson.heading;
  const p = document.createElement('p');
  p.className = 'lede';
  p.textContent = lesson.lede;
  h.append(head, p);
};

const ICONS = {
  usb: ['0 0 32 52', '<path d="M10.5 3.5h11v15h-11z"/><path d="M13.6 7.5v3.4M18.4 7.5v3.4"/><path d="M7 18.5h18v10.8c0 2.6-2.1 4.7-4.7 4.7h-8.6C9.1 34 7 31.9 7 29.3z"/><path d="M14 34v5h4v-5M16 39v10"/>'],
  chip: ['0 0 40 40', '<rect x="9.5" y="9.5" width="21" height="21" rx="2"/><rect x="14" y="14" width="12" height="12" rx="1" class="fill"/><path d="M14.5 4v5.5M20 4v5.5M25.5 4v5.5M14.5 30.5V36M20 30.5V36M25.5 30.5V36M4 14.5h5.5M4 20h5.5M4 25.5h5.5M30.5 14.5H36M30.5 20H36M30.5 25.5H36"/>'],
  pins: ['0 0 40 40', '<path d="M5 34.5h30M7.5 34.5v-6h25v6"/><path d="M12 28.5V8.5c0-1.4 1-2.5 2.2-2.5s2.3 1.1 2.3 2.5v20M23.5 28.5v-20c0-1.4 1-2.5 2.3-2.5s2.2 1.1 2.2 2.5v20"/>'],
  bolt: ['0 0 40 46', '<path d="M24.5 3 9.5 25.5h10L15.5 43 31 19.5H21z"/>'],
  orbit: ['0 0 40 40', '<circle cx="20" cy="20" r="14"/><ellipse cx="20" cy="20" rx="16" ry="6" transform="rotate(-30 20 20)"/><circle cx="20" cy="20" r="3" class="fill"/>'],
  tap: ['0 0 40 40', '<path d="M20 12v12M14 18h12"/><circle cx="20" cy="18" r="9"/>'],
  wire: ['0 0 44 40', '<path d="M4 26c6-12 12-12 18 0s12 12 18 0"/>'],
  play: ['0 0 40 40', '<path d="M14 10v20l16-10z" class="fill"/>'],
  wrench: ['0 0 40 40', '<path d="M27 7a7 7 0 0 0-9 2.5l-9 9a3 3 0 0 0 4.2 4.2l9-9A7 7 0 0 0 27 7z"/>'],
  resistor: ['0 0 44 40', '<path d="M2 20h8M34 20h8"/><rect x="10" y="13.5" width="24" height="13" rx="5.5"/><path d="M16.5 13.8v12.4M21.5 13.8v12.4M28 13.8v12.4"/>'],
  led: ['0 0 40 40', '<path d="M13.5 23v-8.5a6.5 6.5 0 0 1 13 0V23"/><path d="M10.5 23h19"/><path d="M16.5 23v13M23.5 23v9"/><path d="M20 2.5v3.2M7.5 7.5l2.3 2.3M32.5 7.5l-2.3 2.3"/>'],
  button: ['0 0 40 40', '<rect x="6" y="15" width="28" height="15" rx="2.5"/><path d="M13 15v-3.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2V15"/><path d="M11 30v5M29 30v5"/>'],
  knob: ['0 0 40 40', '<circle cx="20" cy="22" r="11"/><path d="M20 22l-5.5-7"/><path d="M6.5 32.5a16 16 0 0 1 0-21M33.5 11.5a16 16 0 0 1 0 21"/>'],
  sensor: ['0 0 44 40', '<rect x="2.5" y="9" width="39" height="22" rx="3"/><circle cx="13" cy="20" r="6.5"/><circle cx="31" cy="20" r="6.5"/><circle cx="13" cy="20" r="2.2" class="fill"/><circle cx="31" cy="20" r="2.2" class="fill"/>'],
  motor: ['0 0 44 40', '<rect x="4" y="10" width="23" height="20" rx="4"/><path d="M27 14h4.5v12H27M31.5 20H41"/><path d="M10 10V6.5M20 10V6.5"/>'],
  servo: ['0 0 44 40', '<rect x="6" y="12" width="28" height="20" rx="3"/><path d="M28 12V6h4v6M12 6h20"/>'],
};

function getIconSvg(name) {
  const [viewBox, paths] = ICONS[name] ?? ICONS.chip;
  return `<svg viewBox="${viewBox}" aria-hidden="true">${paths}</svg>`;
}

function renderFeatures(container, lesson) {
  container.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'features';
  for (const f of lesson.features ?? []) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="feature-icon" data-icon="${f.icon}">${getIconSvg(f.icon)}</span><span class="feature-text">${f.text}</span>`;
    ul.append(li);
  }
  container.append(ul);
}

function renderPinout(container, lesson) {
  container.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'pinout-table';
  const tbody = document.createElement('tbody');
  for (const row of lesson.pinout ?? []) {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    nameTd.innerHTML = `<code>${row.pin}</code>`;
    if (row.color) nameTd.style.setProperty('--pin-color', row.color);
    const descTd = document.createElement('td');
    descTd.innerHTML = row.desc;
    tr.append(nameTd, descTd);
    tbody.append(tr);
  }
  table.append(tbody);
  container.append(table);
}

function renderSpecs(container, lesson) {
  container.innerHTML = '';
  const dl = document.createElement('dl');
  dl.className = 'spec-grid';
  const rows = [
    ['Difficulty', lesson.difficulty ?? 'Beginner'],
    ['Duration', lesson.duration ?? '5 min'],
    ['Components', lesson.componentCount ?? '3'],
    ['Sketch', lesson.sketch ?? lesson.id],
  ];
  for (const [label, value] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    dl.append(dt, dd);
  }
  container.append(dl);
}

export default class InfoCard {
  constructor(el, { onExpand } = {}) {
    this.el = el;
    this.onExpand = onExpand;
    this.lesson = null;
    this.tab = 'overview';

    this.tabs = [...el.querySelectorAll('[role="tab"]')];
    this.body = el.querySelector('.info-body');
    this.content = el.querySelector('.info-content');
    this.btnExpand = el.querySelector('.expand');

    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => this.selectTab(tab.dataset.tab ?? tab.textContent.trim().toLowerCase()));
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const dir = e.key === 'ArrowRight' ? 1 : -1;
          const i = this.tabs.indexOf(this.tabs.find((t) => t.getAttribute('aria-selected') === 'true'));
          const next = this.tabs[(i + dir + this.tabs.length) % this.tabs.length];
          this.selectTab(next.dataset.tab ?? next.textContent.trim().toLowerCase());
          next.focus();
        }
      });
    });

    if (this.btnExpand) {
      this.btnExpand.addEventListener('click', () => {
        const on = this.el.classList.toggle('is-expanded');
        this.btnExpand.setAttribute('aria-expanded', String(on));
        this.onExpand?.(on);
      });
    }
  }

  selectTab(name) {
    this.tab = name;
    this.tabs.forEach((tab) => {
      const active = (tab.dataset.tab ?? '') === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.setAttribute('tabindex', active ? '0' : '-1');
    });
    if (this.lesson) this.render();
    if (this.body) this.body.setAttribute('aria-labelledby', `tab-${name}`);
  }

  setLesson(lesson) {
    this.lesson = lesson;
    this.tabs.forEach((tab) => {
      if (!tab.dataset.tab) tab.dataset.tab = tab.textContent.trim().toLowerCase();
    });
    this.render();
  }

  render() {
    if (!this.lesson || !this.content) return;
    switch (this.tab) {
      case 'overview':
        lede(this.content, this.lesson);
        renderFeatures(this.content, this.lesson);
        break;
      case 'pinout':
        renderPinout(this.content, this.lesson);
        break;
      case 'specifications':
        renderSpecs(this.content, this.lesson);
        break;
      case 'example':
        this.content.innerHTML = `<p class="lede">Open the sketch on the right and press <code>Run sketch</code> to see this lesson in action.</p>`;
        break;
      default:
        lede(this.content, this.lesson);
        renderFeatures(this.content, this.lesson);
    }
  }
}
