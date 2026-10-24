import * as THREE from 'three';
import { buildArduinoUno, PCB_W, PCB_H } from './board.js';

export const nc = 2.54;

export const gl = {
  board:       '#008184',
  pin:         '#cdb07a',
  wire_red:    '#d64a3a',
  wire_black:  '#22252a',
  wire_yellow: '#f5b444',
  wire_green:  '#30a050',
  wire_blue:   '#3d6fc4',
  breadboard:  '#f5efe3',
  led_red:     '#ff3b30',
  led_green:   '#34c759',
  led_blue:    '#007aff',
  led_yellow:  '#ffcc00',
  resistor:    '#d6b98c',
  button:      '#3a3d46',
  servo:       '#2555bb',
  motor:       '#b0b5be',
  buzzer:      '#1c1d22',
};

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rt, rb, h, segs, mat, x = 0, y = 0, z = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, segs);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Realistic Breadboard with tie points and power rails */
export function buildBreadboard() {
  const group = new THREE.Group();
  const W = 82, H = 8.5, D = 55;

  const matBody = new THREE.MeshStandardMaterial({ color: 0xf4eee4, roughness: 0.6 });
  const matSocket = new THREE.MeshStandardMaterial({ color: 0x3a3d46, roughness: 0.8 });

  // Main white plastic base
  const base = box(W, H, D, matBody);
  group.add(base);

  // Power rails: red (+) and blue (-) lines
  const matRed = new THREE.MeshStandardMaterial({ color: 0xd64a3a });
  const matBlue = new THREE.MeshStandardMaterial({ color: 0x3d6fc4 });
  const linePlus = box(W - 8, 0.2, 0.8, matRed, 0, H, -D / 2 + 3);
  const lineMinus = box(W - 8, 0.2, 0.8, matBlue, 0, H, -D / 2 + 5.5);
  const linePlus2 = box(W - 8, 0.2, 0.8, matRed, 0, H, D / 2 - 3);
  const lineMinus2 = box(W - 8, 0.2, 0.8, matBlue, 0, H, D / 2 - 5.5);
  group.add(linePlus, lineMinus, linePlus2, lineMinus2);

  // Center divider trench
  const trench = box(W - 4, 1.2, 2.54, matSocket, 0, H - 1.2, 0);
  group.add(trench);

  // Full tie-point socket grid: 33 columns x 5 rows each side of the trench
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.9 });
  const holeGeom = new THREE.BoxGeometry(0.85, 0.35, 0.85);
  const cols = Math.floor((W - 8) / 2.54); // 29 usable columns at 2.54 pitch
  const rows = 5;
  const instHoles = new THREE.InstancedMesh(holeGeom, holeMat, cols * rows * 2 * 2);
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let c = 0; c < cols; c++) {
    const x = -((cols - 1) / 2) * 2.54 + c * 2.54;
    for (let r = 0; r < rows; r++) {
      for (const side of [-1, 1]) {
        const z = side * (2.54 + r * 2.54);
        dummy.position.set(x, H - 0.02, z);
        dummy.updateMatrix();
        instHoles.setMatrixAt(idx++, dummy.matrix);
      }
    }
  }
  // Power-rail hole strips flanking the red/blue lines
  const railRows = 2;
  const instRails = new THREE.InstancedMesh(holeGeom, holeMat, cols * railRows * 2 * 2);
  idx = 0;
  for (let c = 0; c < cols; c++) {
    const x = -((cols - 1) / 2) * 2.54 + c * 2.54;
    for (let r = 0; r < railRows; r++) {
      for (const side of [-1, 1]) {
        const z = side * (D / 2 - 1.0 - r * 2.54); // just outside the colored lines
        dummy.position.set(x, H - 0.02, z);
        dummy.updateMatrix();
        instRails.setMatrixAt(idx++, dummy.matrix);
      }
    }
  }
  group.add(instHoles, instRails);
  instHoles.instanceMatrix.needsUpdate = true;
  instRails.instanceMatrix.needsUpdate = true;

  return group;
}

/** 5mm LED with curved epoxy dome and bent wire leads */
export function buildLed(colorHex = 0xff3b30) {
  const group = new THREE.Group();
  const matLens = new THREE.MeshPhysicalMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.4,
    roughness: 0.15,
    transmission: 0.85,
    thickness: 2.5,
    transparent: true,
    opacity: 0.9
  });
  const matWire = new THREE.MeshStandardMaterial({ color: 0xd0d5da, metalness: 0.8, roughness: 0.3 });

  // LED dome
  const dome = cyl(2.5, 2.5, 5, 20, matLens, 0, 0, 0);
  const capGeom = new THREE.SphereGeometry(2.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const cap = new THREE.Mesh(capGeom, matLens);
  cap.position.y = 5;
  const collar = cyl(2.8, 2.8, 1.0, 20, matLens, 0, -1.0, 0);
  group.userData = { partType: 'led', colorHex };
  group.add(dome, cap, collar);

  // Wire leads
  const lead1 = cyl(0.3, 0.3, 14, 8, matWire, -1.27, -8, 0);
  const lead2 = cyl(0.3, 0.3, 12, 8, matWire, 1.27, -7, 0);
  group.add(lead1, lead2);

  return group;
}

/** 1/4W Resistor with color bands derived from the ohm value */
export function buildResistor(ohms = 220) {
  const group = new THREE.Group();
  const matBody = new THREE.MeshStandardMaterial({ color: 0xd6b98c, roughness: 0.5 });
  const matWire = new THREE.MeshStandardMaterial({ color: 0xd0d5da, metalness: 0.8, roughness: 0.3 });

  // Tan body
  const body = cyl(1.2, 1.2, 6.5, 16, matBody);
  body.rotation.z = Math.PI / 2;
  body.position.y = 4;
  group.add(body);

  // 4-band code: 2 significant digits + multiplier + gold tolerance
  const CODE = [
    [0x000000, 'black'], [0x994b1e, 'brown'], [0xcc2222, 'red'], [0xe8720c, 'orange'],
    [0xe8c70c, 'yellow'], [0x3ba53b, 'green'], [0x3366cc, 'blue'], [0x8b4fd6, 'violet'],
    [0x8f8f96, 'grey'], [0xf2f2f2, 'white']
  ];
  const multipliers = [0x000000, 0x994b1e, 0xcc2222, 0xe8720c, 0xe8c70c, 0x3ba53b, 0x3366cc, 0x8b4fd6, 0x8f8f96, 0xf2f2f2, 0xd4af37];
  let exp = Math.floor(Math.log10(Math.max(1, ohms))) - 1;
  exp = Math.max(0, Math.min(10, exp));
  const sig = Math.round(ohms / Math.pow(10, exp));
  const digits = [Math.floor(sig / 10) % 10, sig % 10];
  const bandColor = (idxOrMul, isMul = false) => {
    const hex = isMul ? multipliers[idxOrMul] : CODE[idxOrMul][0];
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45 });
    if (isMul && idxOrMul === 10) mat.metalness = 0.7;
    return mat;
  };

  const band = (x, mat) => {
    const b = cyl(1.23, 1.23, 0.5, 16, mat, x, 4, 0);
    b.rotation.z = Math.PI / 2;
    group.add(b);
  };
  band(-1.8, bandColor(digits[0]));
  band(-0.9, bandColor(digits[1]));
  band(0.0, bandColor(exp, true));
  band(1.6, bandColor(10, true)); // gold tolerance band

  // Leads bent down into breadboard
  const w1 = cyl(0.3, 0.3, 8, 8, matWire, -3.8, 0, 0);
  const w2 = cyl(0.3, 0.3, 8, 8, matWire, 3.8, 0, 0);
  group.userData = { partType: 'resistor', ohms };
  group.add(w1, w2);

  return group;
}

/** 6mm Tactile Pushbutton */
export function buildButton() {
  const group = new THREE.Group();
  const matBase = new THREE.MeshStandardMaterial({ color: 0x333742, roughness: 0.5 });
  const matPlate = new THREE.MeshStandardMaterial({ color: 0xccd0d6, metalness: 0.7, roughness: 0.3 });
  const matCap = new THREE.MeshStandardMaterial({ color: 0xdd3333, roughness: 0.4 });
  const matLegs = new THREE.MeshStandardMaterial({ color: 0xb0b4bc, metalness: 0.8 });

  const base = box(6.0, 3.5, 6.0, matBase);
  const plate = box(5.4, 0.2, 5.4, matPlate, 0, 3.5, 0);
  const cap = cyl(1.6, 1.6, 2.0, 16, matCap, 0, 3.7, 0);
  group.add(base, plate, cap);

  for (let x of [-2.5, 2.5]) {
    for (let z of [-2.5, 2.5]) {
      const leg = box(0.5, 4.0, 0.3, matLegs, x, -2.0, z);
      group.add(leg);
    }
  }
  group.userData = { partType: 'button' };
  return group;
}

/** 10k Rotary Potentiometer / Knob */
export function buildKnob() {
  const group = new THREE.Group();
  const matBody = new THREE.MeshStandardMaterial({ color: 0x335577, roughness: 0.5 });
  const matCollar = new THREE.MeshStandardMaterial({ color: 0xb0b5bc, metalness: 0.8 });
  const matShaft = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.7 });
  const matKnob = new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.4 });
  const matIndicator = new THREE.MeshStandardMaterial({ color: 0xffffff });

  const body = box(9.5, 7.0, 9.5, matBody);
  const collar = cyl(3.5, 3.5, 4.0, 16, matCollar, 0, 7.0, 0);
  const shaft = cyl(3.0, 3.0, 10.0, 16, matShaft, 0, 11.0, 0);
  const knob = cyl(7.0, 6.5, 8.0, 24, matKnob, 0, 14.0, 0);
  const indicator = box(0.8, 8.1, 2.5, matIndicator, 0, 14.0, -5.0);
  group.userData = { partType: 'pot', value: 512, spinMesh: knob };
  group.add(body, collar, shaft, knob, indicator);

  return group;
}

/** HC-SR04 Ultrasonic Distance Sensor */
export function buildSensor() {
  const group = new THREE.Group();
  const matPcb = new THREE.MeshStandardMaterial({ color: 0x1a4f88, roughness: 0.5 });
  const matCan = new THREE.MeshStandardMaterial({ color: 0xd8dde4, metalness: 0.75, roughness: 0.25 });
  const matMesh = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.9 });
  const matPins = new THREE.MeshStandardMaterial({ color: 0xcdb07a, metalness: 0.7 });

  // Blue PCB 45 x 20 x 1.6 mm
  const pcb = box(45, 20, 1.6, matPcb);
  pcb.rotation.x = Math.PI / 2;
  group.add(pcb);

  // STC11 logic chip + 24 MHz oscillator (SMD blocks on the PCB)
  const matChip = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.5 });
  const chip = box(9.0, 9.0, 1.2, matChip, -2.0, 1.6, 0);
  chip.rotation.x = Math.PI / 2;
  group.add(chip);
  const osc = box(6.0, 3.2, 1.0, matCan, -14.5, 1.6, 5.0);
  osc.rotation.x = Math.PI / 2;
  group.add(osc);
  const trickle = box(3.0, 1.6, 0.8, matCan, 14.0, 1.6, -4.0);
  trickle.rotation.x = Math.PI / 2;
  group.add(trickle);

  // Two ultrasonic transducers (T & R)
  for (let x of [-13, 13]) {
    const can = cyl(8.0, 8.0, 12.0, 24, matCan, x, 6.0, 0);
    can.rotation.x = Math.PI / 2;
    const meshCover = cyl(7.2, 7.2, 0.4, 24, matMesh, x, 6.0, 6.0);
    meshCover.rotation.x = Math.PI / 2;
    group.add(can, meshCover);
  }

  // 4 Male Header Pins
  for (let i = 0; i < 4; i++) {
    const pin = cyl(0.3, 0.3, 7.0, 6, matPins, -3.81 + i * 2.54, -3.5, -8.0);
    group.add(pin);
  }
  group.userData = { partType: 'sensor' };
  return group;
}

/** Micro Servo SG90 */
export function buildServo() {
  const group = new THREE.Group();
  const matBody = new THREE.MeshPhysicalMaterial({
    color: 0x1d58b0,
    transmission: 0.4,
    roughness: 0.3,
    transparent: true,
    opacity: 0.85
  });
  const matHorn = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3 });
  const matScrew = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8 });

  // Main blue housing
  const body = box(22.8, 22.8, 12.2, matBody);
  const mountTabs = box(32.0, 2.5, 12.2, matBody, 0, 16.0, 0);
  const gearTower = cyl(6.0, 6.0, 5.0, 16, matBody, 5.0, 22.8, 0);
  group.add(body, mountTabs, gearTower);

  // White servo horn
  // Horn cluster pivots at its center for animated angles
  const horn = new THREE.Group();
  horn.position.set(5.0, 29.5, 0);
  const hornArm = box(18.0, 1.5, 4.0, matHorn, 5.0, -0.75, 0);
  const hornCenter = cyl(3.5, 3.5, 2.5, 16, matHorn, 0, -1.25, 0);
  const screw = cyl(1.0, 1.0, 1.0, 8, matScrew, 0, 0, 0);
  horn.add(hornArm, hornCenter, screw);
  horn.userData = { isHorn: true };
  group.add(horn);

  // Case screws at corners of the mounting tab
  for (let ex of [-14.2, 14.2]) {
    const caseScrew = cyl(1.1, 1.1, 0.8, 10, matScrew, ex, 16.0, 0);
    group.add(caseScrew);
  }

  // Power/signal cable stub exiting the bottom
  const matWire = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.7 });
  const cable = cyl(1.6, 1.6, 6.0, 10, matWire, -9.0, -3.0, 5.0);
  group.add(cable);

  return group;
}

/** Piezo Buzzer */
export function buildBuzzer() {
  const group = new THREE.Group();
  const matBody = new THREE.MeshStandardMaterial({ color: 0x1e2025, roughness: 0.5 });
  const matHole = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9 });
  const matPins = new THREE.MeshStandardMaterial({ color: 0xb0b5bc, metalness: 0.8 });

  const disc = cyl(6.0, 6.0, 4.5, 24, matBody, 0, 0, 0);
  const centerHole = cyl(1.5, 1.5, 0.4, 16, matHole, 0, 4.3, 0);
  group.add(disc, centerHole);
  // Ring of acoustic vents around the center port
  const ventGeom = new THREE.CylinderGeometry(0.9, 0.9, 0.4, 10);
  const vents = new THREE.InstancedMesh(ventGeom, matHole, 6);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    dummy.position.set(Math.cos(a) * 3.6, 4.5, Math.sin(a) * 3.6);
    dummy.updateMatrix();
    vents.setMatrixAt(i, dummy.matrix);
  }
  vents.instanceMatrix.needsUpdate = true;
  group.add(vents);
  const pin1 = cyl(0.3, 0.3, 8.0, 6, matPins, -2.5, -4.0, 0);
  const pin2 = cyl(0.3, 0.3, 8.0, 6, matPins, 2.5, -4.0, 0);
  group.add(pin1, pin2);
  group.userData = { partType: 'buzzer' };
  return group;
}

/** Smooth Jumper Wire between 2 points in 3D space */
export function buildJumperWire(p1, p2, colorHex = 0xd64a3a, arch = 16, label = '') {
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  mid.y += arch;

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(p1.x, p1.y + 3, p1.z),
    new THREE.Vector3(p1.x, p1.y + arch * 0.7, p1.z),
    mid,
    new THREE.Vector3(p2.x, p2.y + arch * 0.7, p2.z),
    new THREE.Vector3(p2.x, p2.y + 3, p2.z),
  ]);

  const geom = new THREE.TubeGeometry(curve, 48, 0.7, 8, false);
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
  const wire = new THREE.Mesh(geom, mat);
  wire.castShadow = true;

  // Rubber boot collars at ends (seated over the pin tops)
  const matBoot = new THREE.MeshStandardMaterial({ color: 0x22252a });
  const boot1 = cyl(1.1, 1.1, 4.0, 8, matBoot, p1.x, p1.y, p1.z);
  const boot2 = cyl(1.1, 1.1, 4.0, 8, matBoot, p2.x, p2.y, p2.z);

  const group = new THREE.Group();
  group.name = label ? `jumper: ${label}` : 'jumper';
  if (label) group.userData.connection = label;
  group.add(wire, boot1, boot2);
  return group;
}

/** Builders registry */
export const builders = {
  board:      () => buildArduinoUno().root,
  breadboard: buildBreadboard,
  led:        buildLed,
  resistor:   buildResistor,
  button:     buildButton,
  knob:       buildKnob,
  sensor:     buildSensor,
  servo:      buildServo,
  buzzer:     buildBuzzer,
};

/**
 * Build parts and wiring for a lesson.
 * Positions the Arduino Uno, breadboard, components, and wires.
 */
export function buildLesson(scene, lesson) {
  const meshes = [];
  const parts = [];

  // 1. Every lesson features the authentic Arduino Uno R3 at center
  const { root: boardMesh, pins: boardPins, leds: boardLeds } = buildArduinoUno();
  boardMesh.position.set(0, 0, 0);
  scene.add(boardMesh);
  meshes.push(boardMesh);

  // If this is just lesson 1 (Meet the Board), board is the star!
  if (lesson.id === 'board') {
    return { meshes, pins: boardPins, parts, leds: boardLeds };
  }

  // 2. For circuits, place Breadboard directly above/adjacent to Arduino Uno
  const bb = buildBreadboard();
  bb.position.set(0, 0, -60);
  scene.add(bb);
  meshes.push(bb);

  // 3. Lesson-specific parts & wires — endpoints snap onto the breadboard hole grid
  switch (lesson.id) {
    case 'blink': {
      const led = buildLed(0xff3b30);
      led.position.set(10.16, 8.5, -62.54);
      const res = buildResistor(220);
      res.position.set(0, 8.5, -62.54);
      scene.add(led, res);
      meshes.push(led, res);

      // Wire D13 to breadboard pin
      const w1 = buildJumperWire(boardPins.D13, new THREE.Vector3(-5.08, 8.5, -62.54), 0xf5b444, 18, 'D13 → resistor row');
      // Wire GND to breadboard rail
      const w2 = buildJumperWire(boardPins.GND, new THREE.Vector3(12.7, 8.5, -62.54), 0x22252a, 22, 'GND → LED return row');
      scene.add(w1, w2);
      meshes.push(w1, w2);
      break;
    }
    case 'button': {
      const btn = buildButton();
      btn.position.set(0, 8.5, -60);
      const res = buildResistor(10000);
      res.position.set(12.7, 8.5, -60);
      scene.add(btn, res);
      meshes.push(btn, res);

      const w1 = buildJumperWire(boardPins['5V'], new THREE.Vector3(-7.62, 8.5, -86.5), 0xd64a3a, 26, '5V → red power rail');
      const w2 = buildJumperWire(boardPins.D2, new THREE.Vector3(-5.08, 8.5, -62.54), 0x3d6fc4, 18, 'D2 → button leg row');
      const w3 = buildJumperWire(boardPins.GND, new THREE.Vector3(15.24, 8.5, -62.54), 0x22252a, 20, 'GND → pull-down row');
      scene.add(w1, w2, w3);
      meshes.push(w1, w2, w3);
      break;
    }
    case 'knob': {
      const pot = buildKnob();
      pot.position.set(0, 8.5, -65.08);
      scene.add(pot);
      meshes.push(pot);

      const w1 = buildJumperWire(boardPins['5V'], new THREE.Vector3(-5.08, 8.5, -62.54), 0xd64a3a, 24, '5V → pot supply row');
      const w2 = buildJumperWire(boardPins.A0, new THREE.Vector3(0, 8.5, -62.54), 0x30a050, 20, 'A0 → pot wiper row');
      const w3 = buildJumperWire(boardPins.GND1, new THREE.Vector3(7.62, 8.5, -62.54), 0x22252a, 22, 'GND → pot leg row');
      scene.add(w1, w2, w3);
      meshes.push(w1, w2, w3);
      break;
    }
    case 'rgb': {
      const ledR = buildLed(0xff3b30); ledR.position.set(-6.35, 8.5, -62.54);
      const ledG = buildLed(0x34c759); ledG.position.set(0, 8.5, -62.54);
      const ledB = buildLed(0x007aff); ledB.position.set(6.35, 8.5, -62.54);
      scene.add(ledR, ledG, ledB);
      meshes.push(ledR, ledG, ledB);

      const w1 = buildJumperWire(boardPins.D9, new THREE.Vector3(-7.62, 8.5, -62.54), 0xff3b30, 16, 'D9 → red LED row');
      const w2 = buildJumperWire(boardPins.D10, new THREE.Vector3(2.54, 8.5, -62.54), 0x34c759, 18, 'D10 → green LED row');
      const w3 = buildJumperWire(boardPins.D11, new THREE.Vector3(7.62, 8.5, -62.54), 0x007aff, 20, 'D11 → blue LED row');
      scene.add(w1, w2, w3);
      meshes.push(w1, w2, w3);
      break;
    }
    case 'sensor': {
      const s = buildSensor();
      s.position.set(1.27, 8.5, -64.7);
      scene.add(s);
      meshes.push(s);

      const w1 = buildJumperWire(boardPins['5V'], new THREE.Vector3(-2.54, 8.5, -72.7), 0xd64a3a, 28, '5V → sensor VCC');
      const w2 = buildJumperWire(boardPins.D9, new THREE.Vector3(0, 8.5, -72.7), 0xf5b444, 24, 'D9 → sensor Trig');
      const w3 = buildJumperWire(boardPins.D10, new THREE.Vector3(2.54, 8.5, -72.7), 0x30a050, 24, 'D10 → sensor Echo');
      const w4 = buildJumperWire(boardPins.GND1, new THREE.Vector3(5.08, 8.5, -72.7), 0x22252a, 26, 'GND1 → sensor GND');
      scene.add(w1, w2, w3, w4);
      meshes.push(w1, w2, w3, w4);
      break;
    }
    case 'servo': {
      const sv = buildServo();
      sv.position.set(60, 0, -60);
      scene.add(sv);
      meshes.push(sv);

      const w1 = buildJumperWire(boardPins['5V'], new THREE.Vector3(48, 0, -46), 0xd64a3a, 26, '5V → servo red lead');
      const w2 = buildJumperWire(boardPins.D9, new THREE.Vector3(52, 0, -46), 0xf5b444, 24, 'D9 → servo signal lead');
      const w3 = buildJumperWire(boardPins.GND, new THREE.Vector3(56, 0, -46), 0x22252a, 24, 'GND → servo ground lead');
      scene.add(w1, w2, w3);
      meshes.push(w1, w2, w3);
      break;
    }
    case 'sound':
    case 'piano': {
      const bz = buildBuzzer();
      bz.position.set(0, 8.5, -62.54);
      scene.add(bz);
      meshes.push(bz);

      const w1 = buildJumperWire(boardPins.D8, new THREE.Vector3(-2.54, 8.5, -65.08), 0xf5b444, 18, 'D8 → buzzer + row');
      const w2 = buildJumperWire(boardPins.GND, new THREE.Vector3(2.54, 8.5, -65.08), 0x22252a, 20, 'GND → buzzer − row');
      scene.add(w1, w2);
      meshes.push(w1, w2);
      break;
    }
    default: {
      const led = buildLed(0x34c759);
      led.position.set(0, 8.5, -62.54);
      scene.add(led);
      meshes.push(led);
      break;
    }
  }

  return { meshes, pins: boardPins };
}
