import * as THREE from 'three';

export const PCB_W = 68.58;
export const PCB_H = 53.34;
export const PCB_THICK = 1.6;

const PCB_OUTLINE = [
  [0, 0], [66.04, 0], [68.58, 2.54], [68.58, 37.85], [66.04, 40.39], [66.04, 51.82], [64.52, 53.34], [0, 53.34],
];
const MOUNT_HOLES = [
  [13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56],
];
const HEADER_SPECS = [
  { id: 'digitalA', n: 10, x: 30.23, y: 50.8 },
  { id: 'digitalB', n: 8, x: 54.61, y: 50.8 },
  { id: 'power', n: 8, x: 36.83, y: 2.54 },
  { id: 'analog', n: 6, x: 57.15, y: 2.54 },
];
const PIN_LABELS = ['SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8', '7', '~6', '~5', '4', '~3', '2', 'TX>1', 'RX<0'];
const DIG_X = [18.8, 21.34, 23.88, 26.42, 28.96, 31.5, 34.04, 36.58, 39.12, 41.66, 45.72, 48.26, 50.8, 53.34, 55.88, 58.42, 60.96, 63.5];

const { Group, Mesh, InstancedMesh, Object3D,   BoxGeometry, CylinderGeometry, SphereGeometry,
  MeshStandardMaterial, MeshBasicMaterial, MeshPhysicalMaterial, CanvasTexture,
  ExtrudeGeometry, Shape, Path, CatmullRomCurve3, TubeGeometry, Vector3, SRGBColorSpace } = THREE;

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new Mesh(new BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rTop, rBot, h, seg, mat, x = 0, y = 0, z = 0) {
  const m = new Mesh(new CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** high-res canvas texture: teal PCB, copper traces, silk labels, pin numbers */
export function createPcbTexture() {
  const cv = document.createElement('canvas');
  cv.width = Math.round(PCB_W * 24);
  cv.height = Math.round(PCB_H * 24);
  const ctx = cv.getContext('2d');
  const X = (v) => v * 24;
  const Z = (v) => (PCB_H - v) * 24; // silk position on the top face

  ctx.fillStyle = '#008184';
  ctx.fillRect(0, 0, cv.width, cv.height);

  // soft radial highlight
  const glow = ctx.createRadialGradient(X(40), Z(30), 200, X(34), Z(26), 1200);
  glow.addColorStop(0, 'rgba(255,255,255,0.08)');
  glow.addColorStop(1, 'rgba(10,30,40,0.25)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, cv.width, cv.height);

  // copper traces
  ctx.strokeStyle = 'rgba(0,160,165,0.45)';
  ctx.lineWidth = 1.2 * 24;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(X(47), Z(19)); ctx.lineTo(X(47), Z(35)); ctx.lineTo(X(55), Z(45)); ctx.lineTo(X(55), Z(50));
  ctx.moveTo(X(40), Z(19)); ctx.lineTo(X(35), Z(28)); ctx.lineTo(X(30), Z(45));
  ctx.moveTo(X(50), Z(19)); ctx.lineTo(X(50), Z(10)); ctx.lineTo(X(55), Z(5));
  ctx.stroke();

  ctx.fillStyle = '#cdb07a';
  for (const [mx, my] of MOUNT_HOLES) {
    ctx.beginPath();
    ctx.arc(X(mx), Z(my), 3.2 * 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(X(mx), Z(my), 1.6 * 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cdb07a';
  }

  ctx.strokeStyle = 'rgba(205,176,122,0.9)';
  ctx.lineWidth = 0.35 * 24;
  const hole = (x, y, r = 0.9) => {
    ctx.beginPath();
    ctx.arc(X(x), Z(y), r * 24, 0, Math.PI * 2);
    ctx.stroke();
  };
  for (let i = 0; i < 28; i++) hole(30.5 + (i % 14) * 2.54, 19 + (i < 14 ? 4.2 : -4.2), 1.1);
  [[64.9, 29.6], [20.2, 45.4]].forEach(([hx, hy]) => {
    for (let c = 0; c < 3; c++)
      for (let r = 0; r < 2; r++) hole(hx - 2.54 + c * 2.54, hy - 1.27 + r * 2.54, 1);
  });
  hole(17.7, 9.4, 1);
  hole(24.6, 8.2, 1);
  for (let i = 0; i < 4; i++) hole(6.9 - 1.8 + i * 1.2, 49, 0.7);
  hole(17.4 - 4.5, 30.4, 0.9);
  hole(21.9, 30.4, 0.9);

  // fine traces along component rows
  ctx.strokeStyle = 'rgba(0,160,165,0.45)';
  ctx.lineWidth = 1.2 * 24;
  ctx.beginPath();
  ctx.moveTo(X(12), Z(7.85)); ctx.lineTo(X(26), Z(9)); ctx.lineTo(X(34), Z(12));
  ctx.moveTo(X(6), Z(38.1)); ctx.lineTo(X(14), Z(38.1)); ctx.lineTo(X(22.6), Z(37.4));
  ctx.moveTo(X(22.6), Z(37.4)); ctx.lineTo(X(28), Z(33)); ctx.lineTo(X(44), Z(29)); ctx.lineTo(X(47), Z(24));
  ctx.moveTo(X(17.4), Z(30.4)); ctx.lineTo(X(24), Z(27)); ctx.lineTo(X(30), Z(27));
  ctx.moveTo(X(5.6), Z(18.8)); ctx.lineTo(X(10), Z(14)); ctx.lineTo(X(10), Z(6));
  ctx.moveTo(X(27.3), Z(40.2)); ctx.lineTo(X(27.3), Z(31)); ctx.lineTo(X(47), Z(27));
  ctx.moveTo(X(58.6), Z(28)); ctx.lineTo(X(58.6), Z(20)); ctx.lineTo(X(56), Z(16));
  ctx.stroke();

  // silkscreen component outlines
  ctx.fillStyle = '#eef2f5';
  ctx.strokeStyle = '#eef2f5';
  ctx.lineWidth = 5.28;
  ctx.strokeStyle = 'rgba(238,242,245,0.55)';
  const frame = (x, y, w, h) => ctx.strokeRect(X(x - w / 2), Z(y + h / 2), w * 24, h * 24);
  frame(36.6, 19, 36.6, 10.2);
  frame(17.4, 30.4, 11.2, 4.9);
  frame(17.7, 9.4, 7, 7);
  frame(24.6, 8.2, 7, 7);
  frame(6.9, 49, 6, 6);
  frame(5.6, 18.8, 6.6, 7);
  frame(22.6, 37.4, 6.4, 6.4);
  frame(1.8, 38.1, 9.2, 11.6);
  frame(5.3, 7.85, 12.4, 9);
  [[64.9, 29.6], [20.2, 45.4]].forEach(([hx, hy]) => frame(hx, hy, 7.62, 5.08));
  [[17.7, 9.4], [24.6, 8.2]].forEach(([hx, hy]) => {
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('+', X(hx - 2.6), Z(hy));
  });

  // polarity ticks on sockets
  const tick = (x, y, w = 2, h = 1.2) => {
    ctx.strokeRect(X(x - w / 2), Z(y + h / 2), w * 24, h * 24);
    ctx.beginPath();
    ctx.moveTo(X(x + 0.15), Z(y));
    ctx.lineTo(X(x - 0.15), Z(y));
    ctx.stroke();
  };
  [[13.5, 35], [15.8, 35], [13.5, 33], [15.8, 33], [40, 8], [42.5, 8], [45, 8], [47.5, 8], [60, 44], [62, 44], [9, 26], [9, 28], [9, 30]]
    .forEach(([tx, ty]) => tick(tx, ty));

  // MCU logo circles
  ctx.fillStyle = '#eef2f5';
  ctx.beginPath();
  ctx.arc(X(30.5), Z(23.2), 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(X(62.9), Z(31.9), 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `bold ${1.1 * 24}px "Barlow Semi Condensed", sans-serif`;
  ctx.fillText('L', X(27.3), Z(43.4));
  ctx.fillText('TX', X(27.3), Z(38.9));
  ctx.fillText('RX', X(27.3), Z(33));
  ctx.fillText('ON', X(58.6), Z(25.8));

  ctx.save();
  ctx.translate(X(6.9), Z(45.2));
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('RESET', 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(X(64.9), Z(25.4));
  ctx.fillText('ICSP', 0, 0);
  ctx.restore();

  ctx.font = '24px "Barlow Semi Condensed", sans-serif';
  ctx.fillText('MADE IN ITALY', X(8), Z(2.2));
  ctx.fillText('UNO R3  rev 3.0', X(60), Z(52));

  // digital header pin numbers, rotated / slanted labels
  ctx.font = `bold ${1.3 * 24}px "Barlow Semi Condensed", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  PIN_LABELS.forEach((label, i) => {
    ctx.save();
    ctx.translate(X(DIG_X[i]), Z(47.2));
    if (label.length > 2) ctx.rotate(Math.PI / 2);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });

  ctx.lineWidth = 6;
  HEADER_SPECS.forEach((h) => {
    ctx.strokeRect(X(h.x - h.n * 2.54 / 2), Z(h.y + 1.27), h.n * 2.54 * 24, 60.96);
  });

  ctx.font = `bold 43.2px "Barlow Semi Condensed", sans-serif`;
  ctx.fillText('DIGITAL (PWM~)', X(55), Z(43.5));
  ['IOREF', 'RESET', '3.3V', '5V', 'GND', 'GND', 'VIN'].forEach((label, i) => {
    ctx.save();
    ctx.translate(X(30.48 + i * 2.54), Z(5.2));
    ctx.rotate(-Math.PI / 2);
    ctx.font = `bold ${1.1 * 24}px "Barlow Semi Condensed", sans-serif`;
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });
  ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'].forEach((label, i) => {
    ctx.font = `bold ${1.3 * 24}px "Barlow Semi Condensed", sans-serif`;
    ctx.fillText(label, X(50.8 + i * 2.54), Z(5.2));
  });
  ctx.font = `bold 43.2px "Barlow Semi Condensed", sans-serif`;
  ctx.fillText('POWER', X(37.5), Z(11));
  ctx.fillText('ANALOG IN', X(57.5), Z(11));

  // infinity logo top-left
  ctx.save();
  ctx.translate(X(38), Z(36));
  ctx.strokeStyle = '#eef2f5';
  ctx.lineWidth = 0.7 * 24;
  ctx.beginPath();
  ctx.arc(-60, 0, 60, 0, Math.PI * 2);
  ctx.arc(60, 0, 60, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `bold ${2.2 * 24}px sans-serif`;
  ctx.fillText('\u2212', -60, 0);
  ctx.fillText('+', 60, 0);
  ctx.font = `bold ${3.2 * 24}px "Barlow Semi Condensed", sans-serif`;
  ctx.fillText('ARDUINO', 0, -108);
  ctx.strokeStyle = '#eef2f5';
  ctx.lineWidth = 0.35 * 24;
  ctx.strokeRect(-108, 84, 216, 3.2 * 24);
  ctx.font = `bold ${2.6 * 24}px "Barlow Semi Condensed", sans-serif`;
  ctx.fillText('UNO', 0, 5.1 * 24);
  ctx.restore();

  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.generateMipmaps = true;
  return tex;
}

/** catalogue of clickable board regions, shared with the components page */
export const PART_INFO = {
  usb:       { name: 'USB-B Port',      desc: 'USB Type-B connector \u2014 programs the board from a computer and powers it with 5V.' },
  jack:      { name: 'DC Barrel Jack',  desc: '2.1mm power jack \u2014 feed it 7\u201312V DC for use away from a computer.' },
  mcu:       { name: 'ATmega328P',      desc: 'The main microcontroller \u2014 a DIP-28 chip that stores and runs your sketch.' },
  hex16u2:   { name: 'ATmega16U2',      desc: 'A small control chip that bridges USB to the serial line for uploads.' },
  crystal:   { name: '16 MHz Crystal',  desc: 'The quartz heartbeat of the board \u2014 sets the exact clock for the ATmega328P.' },
  ecap1:     { name: '47\u00b5F Capacitor', desc: 'Bridges supply dips on the 5V rail \u2014 keeps power smooth and steady.' },
  ecap2:     { name: '47\u00b5F Capacitor', desc: 'Bridges supply dips on the 5V rail \u2014 keeps power smooth and steady.' },
  reset:     { name: 'RESET Button',    desc: 'Press to restart the microcontroller \u2014 your sketch reboots from the top.' },
  regulator: { name: '5V Regulator',    desc: 'Takes raw input (jack or USB) and delivers a steady 5V to logic and headers.' },
  icspA:     { name: 'ICSP Header',     desc: '6-pin header for flashing the main chip directly \u2014 bootloader territory.' },
  icspB:     { name: 'ICSP Header',     desc: 'Used to reprogram the ATmega16U2 \u2014 rare, but handy if the bridge is bricked.' },
  leds:      { name: 'Onboard LEDs',    desc: 'Status lights: L (D13), TX/RX (serial chatter), and ON (power present).' },
  headerA:   { name: 'Digital Headers', desc: 'Digital pins 8\u201313 with SCL, SDA, AREF and GND \u2014 sockets for your loop wires.' },
  headerB:   { name: 'Digital Headers', desc: 'Digital pins 0\u20137 \u2014 serial pins RX/TX live here, plus six more GPIO.' },
  headerP:   { name: 'Power Header',    desc: 'IOREF, RESET, 3.3V, 5V, GND and VIN \u2014 power tap for your circuits.' },
  headerAn:  { name: 'Analog Header',   desc: 'A0\u2013A5 sockets \u2014 analog inputs that read voltages 0\u20135V.' },
};

/** authentic Arduino Uno R3, board-relative coordinates, silk + pick zones */
export function buildArduinoUno() {
  const root = new Group();
  const inner = new Group();
  inner.position.set(-PCB_W / 2, 0, PCB_H / 2);
  root.add(inner);

  const matDark = new MeshStandardMaterial({ color: 13480058, roughness: 0.8 });       // body plastics
  const matSilk = new MeshStandardMaterial({ map: createPcbTexture(), roughness: 0.5, metalness: 0.05 });
  const matSocket = new MeshStandardMaterial({ color: 2237738, roughness: 0.6 });
  const matHeader = new MeshStandardMaterial({ color: 2369584, roughness: 0.5 });
  const matMetal = new MeshStandardMaterial({ color: 14738664, metalness: 0.75, roughness: 0.25 });
  const matSteel = new MeshStandardMaterial({ color: 13150574, metalness: 0.7, roughness: 0.3 });
  const matLedAmber = new MeshStandardMaterial({ color: 16755200, emissive: 16746496, emissiveIntensity: 0.5 });
  const matLedGreen = new MeshStandardMaterial({ color: 3407701, emissive: 2280516, emissiveIntensity: 0.6 });

  const place = (mesh, x, z, y = 0, rotDeg = 0) => (
    mesh.position.set(x, y, -z), mesh.rotation.y = (rotDeg * Math.PI) / 180, inner.add(mesh), mesh
  );

  // PCB with corner mounting holes
  const outline = new Shape();
  PCB_OUTLINE.forEach(([x, y], i) => (i === 0 ? outline.moveTo(x, y) : outline.lineTo(x, y)));
  outline.closePath();
  for (const [mx, my] of MOUNT_HOLES) {
    const hole = new Path();
    hole.absarc(mx, my, 1.6, 0, Math.PI * 2, true);
    outline.holes.push(hole);
  }
  const pcbGeo = new ExtrudeGeometry(outline, { depth: PCB_THICK, bevelEnabled: false });
  pcbGeo.rotateX(-Math.PI / 2);
  const pcb = new Mesh(pcbGeo, [matSilk, matDark]);
  pcb.position.set(0, -1.6, 0);
  pcb.receiveShadow = true;
  inner.add(pcb);

  // headers: black strip, gold stubs above, dark sockets and pin pins
  HEADER_SPECS.forEach((h) => {
    const stripLen = h.n * 2.54;
    const strip = box(stripLen, 8.5, 2.54, matHeader);
    place(strip, h.x, h.y);
    for (let i = 0; i < h.n; i++) {
      const px = h.x - stripLen / 2 + 1.27 + i * 2.54;
      const socketCap = box(1.1, 0.2, 1.1, matSocket);
      place(socketCap, px, h.y, 8.5);
      const socketDot = cyl(0.55, 0.55, 0.25, 6, matSocket);
      place(socketDot, px, h.y, 8.7);
      const pin = cyl(0.28, 0.28, 3.4, 6, matSteel);
      place(pin, px, h.y, 5.3);
    }
  });

  // USB-B port
  place(box(9.2, 10.4, 11.6, matMetal), 1.8, 38.1);
  place(box(7, 7.5, 4, matSocket), -1, 38.1, 1.5);
  place(box(6.6, 0.8, 2.2, matSteel), -1.2, 38.1, 1.8);
  place(box(0.8, 1.2, 3, matMetal), 1.8, 38.1 + 3.2, 10.2);
  place(box(0.8, 1.2, 3, matMetal), 1.8, 34.9, 10.2);
  place(box(9.3, 0.3, 11.7, matMetal), 1.8, 38.1, 6.2);

  // DC barrel jack
  place(box(12.4, 11, 9, matSocket), 5.3, 7.85);
  const barrelBody = cyl(3.2, 3.2, 5, 16, matMetal);
  barrelBody.rotation.z = Math.PI / 2;
  place(barrelBody, 0.5, 7.85, 4);
  const barrelCollar = cyl(4.6, 4.6, 1.4, 12, matMetal);
  barrelCollar.rotation.z = Math.PI / 2;
  place(barrelCollar, 0.9, 7.85, 4);
  const barrelRing = cyl(3.4, 3.4, 1.5, 16, matSocket);
  barrelRing.rotation.z = Math.PI / 2;
  place(barrelRing, 1, 7.85, 4);
  place(box(12.5, 0.3, 9.1, matSocket), 5.3, 7.85, 5.5);

  // ATmega328P (DIP-28) on the center rows
  place(box(36.6, 2.4, 10.2, matSocket), 47, 19);
  place(box(35, 3.8, 7.6, matSocket), 47, 19, 2);
  place(box(1.4, 0.6, 10.3, matDark), 28.7, 19, 2.4);
  place(box(1.4, 0.6, 10.3, matDark), 65.3, 19, 2.4);
  place(cyl(0.8, 0.8, 0.25, 12, matDark), 31.5, 19, 5.9);
  place(box(35.1, 0.25, 7.7, matDark), 47, 19, 5.65);
  for (let i = 0; i < 14; i++) {
    const px = 30.5 + i * 2.54;
    place(box(0.6, 2.5, 1, matMetal), px, 23.2, 0.5);
    place(box(0.6, 2.5, 1, matMetal), px, 14.8, 0.5);
  }

  // 16 MHz crystal
  place(box(11.2, 3.6, 4.9, matMetal), 17.4, 30.4);
  const crystalDomeA = cyl(2.05, 2.05, 3.7, 12, matMetal);
  place(crystalDomeA, 13.2, 30.4, 3.6);
  crystalDomeA.rotation.x = Math.PI / 2;
  const crystalDomeB = cyl(2.05, 2.05, 3.7, 12, matMetal);
  place(crystalDomeB, 17.4 + 4.2, 30.4, 3.6);
  crystalDomeB.rotation.x = Math.PI / 2;

  // electrolytic capacitors with sleeve bands and vent rings
  place(cyl(3.3, 3.3, 6.9, 20, matMetal), 17.7, 9.4);
  place(cyl(3.3, 3.3, 6.9, 20, matMetal), 24.6, 8.2);
  place(cyl(3.35, 3.35, 0.5, 20, matSocket), 17.7, 9.4, 3.6);
  place(cyl(3.35, 3.35, 0.5, 20, matSocket), 24.6, 8.2, 3.6);
  place(cyl(3, 3, 0.3, 20, matSocket), 17.7, 9.4, 6.9);
  place(cyl(3, 3, 0.3, 20, matSocket), 24.6, 8.2, 6.9);
  place(box(0.6, 0.1, 4.4, matDark), 17.7, 9.4, 7.2);
  place(box(0.6, 0.1, 4.4, matDark), 24.6, 8.2, 7.2);
  place(box(4.4, 0.1, 0.6, matDark), 17.7, 9.4, 7.2);
  place(box(4.4, 0.1, 0.6, matDark), 24.6, 8.2, 7.2);

  // RESET button + legs
  place(box(6, 3.2, 6, matMetal), 6.9, 49);
  place(cyl(1.5, 1.5, 1.2, 16, matSocket), 6.9, 49, 3.2);
  place(cyl(2.1, 2.3, 0.4, 16, matSteel), 6.9, 49, 3.15);
  for (const ex of [-2.2, 2.2])
    for (const ez of [-2.2, 2.2]) place(cyl(0.35, 0.35, 1.6, 6, matMetal), 6.9 + ex, 49 + ez, -0.4);

  // 5V regulator + heatsink fins
  place(box(6.6, 1.7, 7, matSocket), 5.6, 18.8);
  place(box(3.4, 0.4, 1.6, matMetal), 5.6, 22, 0.2);
  place(box(6.7, 0.15, 5.4, matDark), 5.6, 18.8, 1.7);
  for (let i = -1; i <= 1; i++) place(box(0.9, 1.6, 0.5, matMetal), 5.6, 18.8 - 3.6, 0);

  // ATmega16U2 with dimple
  place(box(5, 0.9, 5, matSocket), 22.6, 37.4, 0, 45);
  place(box(2.6, 0.15, 2.6, matSteel), 22.6, 37.4, 0.05);
  place(cyl(0.45, 0.45, 0.15, 10, matDark), 22.6 - 1.4, 38.8, 1);

  // silver SMD passives
  const matSmd = new MeshStandardMaterial({ color: 14188858, roughness: 0.7 });
  const matChip = new MeshStandardMaterial({ color: 1710878, roughness: 0.45 });
  const matChipB = new MeshStandardMaterial({ color: 13225168, roughness: 0.55 });
  const cap = (x, y) => {
    const body = cyl(1.7, 1.7, 1.5, 14, matSmd);
    place(body, x, y, 0.3);
    for (const side of [-0.9, 0.9]) {
      const pad = cyl(1.55, 1.55, 0.9, 14, matSmd);
      place(pad, x + side, y, 0.3);
    }
  };
  cap(13.2, 40.5); cap(30.5, 44.5); cap(41, 44.5); cap(60, 6.5);
  const inductor = (x, y) => {
    const body = cyl(1.5, 1.5, 4.6, 12, matChip);
    body.rotation.x = Math.PI / 2;
    place(body, x, y, 1.1);
    const shim = cyl(1.55, 1.55, 0.35, 12, matMetal, x, y - 1.6, 1.1);
    shim.rotation.x = Math.PI / 2;
    const leadA = cyl(0.3, 0.3, 1.8, 6, matMetal, x, y, 0.7);
    leadA.rotation.x = Math.PI / 2;
    const leadB = cyl(0.3, 0.3, 1.8, 6, matMetal, x, y, 0.7);
    leadB.rotation.x = Math.PI / 2;
  };
  inductor(12.5, 12.5); inductor(16, 15);
  const passive = (x, y, rotDeg = 0) => {
    const body = box(2, 0.7, 1.2, matChipB);
    place(body, x, y, 0.15, rotDeg);
    const capL = box(0.5, 0.75, 1.25, matSteel);
    place(capL, x - (rotDeg ? 0.75 : 1.25), y, 0.15);
    const capR = box(0.5, 0.75, 1.25, matSteel);
    place(capR, x + (rotDeg ? 0.75 : 1.25), y, 0.15);
  };
  passive(13.5, 35); passive(15.8, 35, 90); passive(13.5, 33, 90); passive(15.8, 33);
  passive(40, 8, 90); passive(42.5, 8); passive(45, 8, 90); passive(47.5, 8);
  passive(60, 44); passive(62, 44, 90); passive(9, 26); passive(9, 28, 90); passive(9, 30);
  place(box(4.5, 2.6, 4, matChip), 9.5, 5, 0.2);

  // ICSP headers with shrouds + gold pins
  const icsp = (hx, hy) => {
    const body = box(7.62, 2.5, 5.08, matHeader);
    place(body, hx, hy);
    const shroud = box(6.9, 0.3, 4.4, matSocket);
    place(shroud, hx, hy, 2.5);
    for (let c = 0; c < 3; c++)
      for (let r = 0; r < 2; r++) {
        const pin = cyl(0.3, 0.3, 6, 8, matSteel);
        place(pin, hx - 2.54 + c * 2.54, hy - 1.27 + r * 2.54, 2.8);
      }
  };
  icsp(64.9, 29.6);
  icsp(20.2, 45.4);

  // SMD LEDs (ON, L, TX, RX) with tiny lens domes
  const ledL = box(1.6, 0.8, 0.9, matLedAmber);
  place(ledL, 27.3, 40.2);
  const ledTX = box(1.6, 0.8, 0.9, matLedAmber);
  place(ledTX, 27.3, 36.9);
  const ledRX = box(1.6, 0.8, 0.9, matLedAmber);
  place(ledRX, 27.3, 35);
  const ledON = box(1.6, 0.8, 0.9, matLedGreen);
  place(ledON, 58.6, 28);
  [[ledL, 27.3, 40.2], [ledTX, 27.3, 36.9], [ledRX, 27.3, 35], [ledON, 58.6, 28]].forEach(([ledSrc, x, z]) => {
    const dome = new Mesh(new SphereGeometry(0.5, 10, 8), ledSrc.material);
    dome.position.set(x, 1, -z);
    dome.castShadow = true;
    inner.add(dome);
  });

  // 13. Clickable part zones (invisible AABB volumes for raycast picking)
  const zoneMat = new MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0 });
  const ZONES = [
    ['usb',       1.8,  38.1, 9.2, 11.6, 11],
    ['jack',      5.3,  7.85, 12.4, 9, 11.5],
    ['mcu',       47,   19,   36.6, 10.2, 6],
    ['hex16u2',   22.6, 37.4, 6.6, 6.6, 1.6],
    ['crystal',   17.4, 30.4, 11.2, 4.9, 4.2],
    ['ecap1',     17.7, 9.4,  7.2, 7.2, 7.2],
    ['ecap2',     24.6, 8.2,  7.2, 7.2, 7.2],
    ['reset',     6.9,  49,   6.2, 6.2, 4.6],
    ['regulator', 5.6,  18.8, 6.8, 7.2, 3.6],
    ['icspA',     64.9, 29.6, 7.7, 5.2, 9],
    ['icspB',     20.2, 45.4, 7.7, 5.2, 9],
    ['leds',      27.3, 37.6, 2.6, 7, 2.4],
    ['leds',      58.6, 28,   2.6, 2.6, 2.4],
    ['headerA',   30.23, 50.8, 25.5, 2.6, 9],
    ['headerB',   54.61, 50.8, 20.4, 2.6, 9],
    ['headerP',   36.83, 2.54, 20.4, 2.6, 9],
    ['headerAn',  57.15, 2.54, 15.3, 2.6, 9],
  ];
  const partHighlighters = {};
  ZONES.forEach(([key, x, z, w, d, h]) => {
    const zone = new Mesh(new BoxGeometry(w, h, d), zoneMat);
    zone.position.set(x, h / 2, -z);
    zone.userData.partKey = key;
    zone.userData.partInfo = PART_INFO[key];
    inner.add(zone);
    if (!partHighlighters[key]) partHighlighters[key] = [];
    partHighlighters[key].push(zone);
  });

  root.userData.isBoardRoot = true;
  // Return root and map of pin coordinates in 3D world space
  const pins = {};
  const digNames = ['SCL', 'SDA', 'AREF', 'GND', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'];
  DIG_X.forEach((x, i) => {
    pins[digNames[i]] = new Vector3(x - PCB_W / 2, 8.5, -(50.8 - PCB_H / 2));
  });

  const pwrNames = ['IOREF', 'RESET', '3V3', '5V', 'GND1', 'GND2', 'VIN'];
  pwrNames.forEach((name, i) => {
    pins[name] = new Vector3(30.48 + i * 2.54 - PCB_W / 2, 8.5, -(2.54 - PCB_H / 2));
  });

  const anaNames = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
  anaNames.forEach((name, i) => {
    pins[name] = new Vector3(50.8 + i * 2.54 - PCB_W / 2, 8.5, -(2.54 - PCB_H / 2));
  });

  return { root, pins, leds: { L: ledL, TX: ledTX, RX: ledRX, ON: ledON } };
}
