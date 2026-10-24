export const H = {
  nav: 'home',
  lessonId: 'board',
  values: {},
  inputs: {},
  selection: null,
  done: new Set(),
  settings: {
    labels: true,
    grid: true,
    autoRotate: false,
    sound: true,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    flow: true,
    schematic: false,
  },
};

const DONE_KEY = 'learn-arduino:done';
const VALUES_KEY = 'learn-arduino:values';

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadPersisted() {
  const savedDone = readJson(DONE_KEY);
  if (Array.isArray(savedDone)) H.done = new Set(savedDone);
  const savedValues = readJson(VALUES_KEY);
  if (savedValues && typeof savedValues === 'object') H.values = savedValues;
}

export function saveDone() {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify([...H.done]));
  } catch { /* storage unavailable */ }
}

export function saveValues() {
  try {
    localStorage.setItem(VALUES_KEY, JSON.stringify(H.values));
  } catch { /* storage unavailable */ }
}
