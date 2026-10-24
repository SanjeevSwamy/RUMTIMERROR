const strings = {
  en: {
    loading: 'Loading',
    loaded: 'Ready',
    home: 'Home',
    lessons: 'Lessons',
    components: 'Components',
    simulator: 'Run',
    settings: 'Settings',
    language: 'Language',
    designBy: 'Designed by',
    overview: 'Overview',
    pinout: 'Pinout',
    example: 'Example',
    specifications: 'Specifications',
    inView: '{n} in view',
    runSketch: 'Run sketch',
    running: 'Stop sketch',
    copyCode: 'Copy code',
    copied: 'Copied!',
    expandCode: 'Expand code editor',
    collapseCode: 'Collapse code editor',
    serialMonitor: 'Serial monitor',
    stopped: 'Stopped',
    started: 'Running',
    progress: '{done} of {total} lessons done',
    onTheBoard: 'On the board',
    timeSpent: 'Time spent exploring',
    expandPanel: 'Expand panel',
    collapsePanel: 'Collapse panel',
    resetView: 'Reset view',
    rotateLeft: 'Rotate left',
    rotateRight: 'Rotate right',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    toggleFlow: 'Show signal flow',
    showSchematic: 'Show schematic',
    markDone: 'Mark lesson as done',
    done: 'Done',
    markNotDone: 'Mark lesson as not done',
    notDone: 'Not done',
    complete: 'Complete',
    measureHint: 'Drag from one pin to another to measure the distance.',
    probeHint: 'Click a point to inspect it.',
    clickPartHint: 'Click a component to select it.',
    noComponents: 'Nothing in view yet — pick a lesson.',
    closeSchematic: 'Close schematic',
    hoverPin: 'Hover a component to highlight it in the schematic.',
    lessonN: 'Lesson {n}',
    current: 'Current lesson',
    startLesson: 'Start lesson',
    openLesson: 'Open lesson',
    settingsLabels: 'Pin labels',
    settingsGrid: 'Ground grid',
    settingsAutoRotate: 'Auto-rotate camera',
    settingsSound: 'Sound effects',
    settingsReducedMotion: 'Reduced motion',
    settingsFlow: 'Signal flow',
    settingsSchematic: 'Schematic open',
  },
};

export function t(key, params) {
  let str = strings.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

export default t;
