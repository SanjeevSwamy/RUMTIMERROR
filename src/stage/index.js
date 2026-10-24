import * as THREE from 'three';
import { CameraController } from './camera.js';
import {
  buildLed, buildResistor, buildButton, buildKnob, buildSensor, buildBreadboard,
  buildServo, buildBuzzer, buildJumperWire, buildLesson, gl,
} from '../kit/index.js';

const DEG = Math.PI / 180;
const raycaster = new THREE.Raycaster();

export default class Stage {
  constructor(canvas, { onChange, onDragState, onClick } = {}) {
    this.canvas = canvas;
    this.onChange = onChange;
    this.onDragState = onDragState;
    this.onClick = onClick;

    // picked-part state
    this._raycaster = raycaster;
    this._highlight = null;
    this._highlightBox = new THREE.Box3();
    this._highlightMesh = null;
    this._highlightWireGlow = null;

    // builder state (Tinkercad-style): parts palette, drag & drop, wire tool
    this.parts = [];          // entries: { id, group, type, fixed, opts }
    this.wires = [];          // entries: { id, a, b, group }  (a/b anchor refs)
    this.wireMode = false;
    this.selectedPart = null;
    this.buttonPressed = false;
    this.sensorValue = 300;   // arbitrary analog input for lessons without a knob
    this._partSeq = 0;
    this._wireSeq = 0;
    this._pendingAnchor = null;
    this._anchorMesh = null;
    this._anchorList = [];
    this._drag = null;        // { entry, kind: 'move'|'rotate'|'press', plane, start }
    this.boardPins = null;
    this.boardLeds = null;

    // --- renderer ---
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // --- scene ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf6eddd);

    // --- Orthographic Camera ---
    this.camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 1000);

    // --- Camera controller ---
    this.controls = new CameraController(this.camera);
    this.controls.onChange = () => {
      this.placeCamera();
      this.dirty = true;
      if (this.onChange) this.onChange();
    };
    this.controls.onDragState = onDragState;
    this.controls.onClick = onClick;

    // attach pointer events
    canvas.addEventListener('pointerdown', (e) => this.controls.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.controls.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.controls.onPointerUp(e));
    // builder input (registered after camera handlers so camera sees down first)
    canvas.addEventListener('pointerdown', (e) => this._onCanvasDown(e));
    canvas.addEventListener('pointermove', (e) => this._onCanvasMove(e));
    canvas.addEventListener('pointerup', (e) => this._onCanvasUp(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => this.controls.onWheel(e), { passive: false });
    window.addEventListener('keydown', (e) => this._onKey(e));

    // --- state ---
    this.lessonId = 'board';
    this.values = {};
    this.inputs = {};
    this.selection = null;
    this.flowOn = true;
    this.dirty = true;
    this._last = performance.now();
    this._raf = null;
    this._meshes = [];
    this._reducedMotion = false;

    this.setupLights();
    this.placeCamera();
    this._startLoop();

    // resize observer
    const resizeObs = new ResizeObserver(() => this._onResize());
    resizeObs.observe(canvas.parentElement ?? canvas);
    this._onResize();
  }

  setupLights() {
    // Warm ambient light
    const ambient = new THREE.AmbientLight(0xfff5e6, 0.85);
    this.scene.add(ambient);

    // Key directional light with soft shadow
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(120, 220, 160);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 600;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Cool fill light from opposite angle
    const fill = new THREE.DirectionalLight(0xddeeff, 0.45);
    fill.position.set(-100, 80, -100);
    this.scene.add(fill);
  }

  setLesson(lesson) {
    this.lessonId = lesson.id;
    this.clearHighlight();
    // remove old meshes
    for (const obj of this._meshes) this.scene.remove(obj);
    this._meshes = [];
    // reset builder state
    this.parts = [];
    this.wires = [];
    this._clearAnchors();
    this._pendingAnchor = null;
    this.selectedPart = null;
    this.wireMode = false;
    this.sensorValue = 300;

    const built = buildLesson(this.scene, lesson, gl);
    this._meshes = built.meshes;
    this.boardPins = built.pins ?? null;
    this.boardLeds = built.leds ?? null;
    for (const group of built.parts ?? []) {
      if (!group.userData?.partType) continue;
      this.parts.push({ id: ++this._partSeq, group, type: group.userData.partType, fixed: true });
    }
    this.reset();
    this.dirty = true;
  }

  /**
   * Raycast the canvas for a clickable board part.
   * @returns {{ key: string, name: string, desc: string, box: THREE.Box3 } | null}
   */
  pickAt(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this._raycaster.setFromCamera(ndc, this.camera);
    this.scene.updateMatrixWorld(true);
    const hits = this._raycaster.intersectObjects(this._meshes, true);
    for (const hit of hits) {
      let obj = hit.object;
      while (obj) {
        if (obj.userData?.partInfo) {
          const box = new THREE.Box3().setFromObject(obj);
          return { type: 'part', key: obj.userData.partKey, name: obj.userData.partInfo.name, desc: obj.userData.partInfo.desc, box };
        }
        if (obj.userData?.connection) {
          return { type: 'wire', name: 'Jumper Wire', desc: obj.userData.connection, group: obj };
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  setHighlight(hit) {
    this.clearHighlight();
    if (!hit) return;
    if (hit.type === 'wire' && hit.group) {
      // Glow the wire tube + boots via emissive (each wire owns its materials)
      hit.group.traverse((o) => {
        if (o.isMesh && o.material?.emissive) {
          o.material.emissive.setHex(0x1aa3a1);
          o.material.emissiveIntensity = 0.35;
        }
      });
      this._highlightWireGlow = hit.group;
    } else if (hit.box) {
      const helper = new THREE.Box3Helper(hit.box, 0x1aa3a1);
      helper.material.transparent = true;
      helper.material.opacity = 0.9;
      this._highlightMesh = helper;
      this.scene.add(helper);
    }
    this._highlight = hit.key;
    this.dirty = true;
  }

  clearHighlight() {
    if (this._highlightWireGlow) {
      // restore booted colors after emissive glow
      const tube = this._highlightWireGlow.getObjectByProperty('type', 'Mesh');
      // wires carry no shared materials; original colors were already replaced by emissive,
      // so rebuild the wire appearance by resetting emissive intensity and letting the
      // base color show through
      this._highlightWireGlow.traverse((o) => {
        if (o.isMesh && o.material?.emissive) {
          o.material.emissive.setHex(0x000000);
          o.material.emissiveIntensity = 1;
        }
      });
      this._highlightWireGlow = null;
    }
    if (this._highlightMesh) {
      this.scene.remove(this._highlightMesh);
      this._highlightMesh.geometry?.dispose?.();
      this._highlightMesh.material?.dispose?.();
      this._highlightMesh = null;
    }
    this._highlight = null;
    this.dirty = true;
  }

  /* ================= Builder (Tinkercad-style) ================= */

  static BB_Z = -60;
  static ROW_Y = 8.5;
  static WIRE_COLORS = [0xd43d2a, 0x111418, 0xe0b531, 0x3fa84f, 0x2f6fce, 0x8856c9];

  static FEET = {
    led: [[-1.27, 0, 0], [1.27, 0, 0]],
    resistor: [[-3.8, 0, 0], [3.8, 0, 0]],
    button: [[-2.5, 0, -2.5], [2.5, 0, -2.5], [-2.5, 0, 2.5], [2.5, 0, 2.5]],
    buzzer: [[-2.5, 0, 0], [2.5, 0, 0]],
    pot: [[-3.5, 0, 0], [0, 0, 0], [3.5, 0, 0]],
    sensor: [[-3.81, 0, -8], [-1.27, 0, -8], [1.27, 0, -8], [3.81, 0, -8]],
    servo: [[-9, 3, 5], [-6, 3, 5], [-3, 3, 5]],
  };

  static FLOOR_PARTS = new Set(['servo', 'pot']);

  snapColumn(x) {
    return Math.round(x / 2.54) * 2.54;
  }

  snapRow(z) {
    const rel = z - Stage.BB_Z;
    const side = rel < 0 ? -1 : 1;
    const r = Math.min(5, Math.max(1, Math.round(Math.abs(rel) / 2.54)));
    return Stage.BB_Z + side * r * 2.54;
  }

  /* ----- circuit-builder workbench page ----- */
  workbench = false;
  _wbHidden = [];

  /** hide the lesson scene, keep the breadboard + user parts so the page opens empty */
  enterWorkbench() {
    this.workbench = true;
    this._wbHidden = [];
    const keep = new Set();
    let hasBB = false;
    for (const p of this.parts) if (!p.fixed) keep.add(p.group);
    for (const w of this.wires) keep.add(w.group);
    for (const g of this._meshes) {
      if (!g?.isObject3D || keep.has(g)) continue;
      const isBreadboard = !g.userData?.partType && !g.userData?.connection &&
        Math.abs((g.position?.z ?? 0) - Stage.BB_Z) < 0.5;
      if (isBreadboard) { hasBB = true; continue; }
      g.visible = false;
      this._wbHidden.push(g);
    }
    if (!hasBB) {
      const bb = buildBreadboard();
      bb.position.set(0, 0, Stage.BB_Z);
      this.scene.add(bb);
      this._meshes.push(bb);
      this._workbenchBB = bb;
    } else {
      this._workbenchBB = null;
    }
    if (this.wireMode) this.rebuildAnchors();
    this.wbCam = { target: this.controls.view.target.clone(), azimuth: this.controls.view.azimuth, elevation: this.controls.view.elevation, zoom: this.controls.view.zoom };
        this.controls.setView({ target: new THREE.Vector3(0, 0, Stage.BB_Z - 8), zoom: 9 }, 450);
    this.dirty = true;
  }

  exitWorkbench() {
    this.workbench = false;
    for (const g of this._wbHidden) if (g?.isObject3D) g.visible = true;
    this._wbHidden = [];
    if (this._workbenchBB) {
      this.scene.remove(this._workbenchBB);
      this._meshes = this._meshes.filter((m) => m !== this._workbenchBB);
      this._workbenchBB = null;
    }
    if (this.wbCam) {
      this.controls.setView(this.wbCam, 450);
      this.wbCam = null;
    }
    this.dirty = true;
  }

  /** ground point under a client coordinate on a horizontal plane */
  groundPoint(clientX, clientY, y = Stage.ROW_Y) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this._raycaster.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
    const out = new THREE.Vector3();
    return this._raycaster.ray.intersectPlane(plane, out) ? { x: out.x, z: out.z } : null;
  }

  addPart(type, opts = {}) {
    let group;
    if (type === 'led') group = buildLed(opts.color ?? 0xff3b30);
    else if (type === 'resistor') group = buildResistor(opts.ohms ?? 220);
    else if (type === 'button') group = buildButton();
    else if (type === 'knob' || type === 'pot') group = buildKnob();
    else if (type === 'sensor' || type === 'dist') group = buildSensor();
    else if (type === 'servo') group = buildServo();
    else if (type === 'buzzer') group = buildBuzzer();
    else return null;

    if (!group.userData) group.userData = {};
    const id = ++this._partSeq;
    group.userData.partId = id;
    group.userData.movable = true;

    const floor = Stage.FLOOR_PARTS.has(group.userData.partType);
    if (opts.at) {
      // explicit drop point (drag & drop from the builder palette)
      const y = floor ? 0 : Stage.ROW_Y;
      const availZ = Math.abs(opts.at.z - Stage.BB_Z) <= 14 && !floor;
      const z = availZ ? this.snapRow(opts.at.z) : Math.max(-110, Math.min(30, opts.at.z));
      group.position.set(Math.max(-95, Math.min(95, opts.at.x)), y, z);
    } else if (floor) {
      const spot = { servo: [40, 0, 42], pot: [-70, 0, -40] }[group.userData.partType] || [40, 0, -40];
      group.position.set(spot[0], spot[1], spot[2]);
      if (group.userData.partType === 'servo') group.position.x += 25 * (this.parts.filter((p) => p.type === 'servo').length % 4);
    } else {
      const used = this.parts.filter((p) => !Stage.FLOOR_PARTS.has(p.type)).length;
      const cols = 12;
      const x = ((used % cols) - cols / 2 + 0.5) * 2.54;
      const z = Stage.BB_Z - (Math.floor(used / cols) === 0 ? 5.08 : 10.16);
      group.position.set(x, Stage.ROW_Y, z);
    }
    this.scene.add(group);
    this._meshes.push(group);
    const entry = { id, group, type: group.userData.partType, fixed: false, opts: { ...opts } };
    this.parts.push(entry);
    this.selectedPart = id;
    this.dirty = true;
    return id;
  }

  removePart(id) {
    const idx = this.parts.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const entry = this.parts[idx];
    const wIdx = this.wires.filter((w) => w.a.partId === id || w.b.partId === id);
    for (const w of wIdx) this.removeWire(w.id);
    this.scene.remove(entry.group);
    this._meshes = this._meshes.filter((m) => m !== entry.group);
    this.parts.splice(idx, 1);
    if (this.selectedPart === id) this.selectedPart = null;
    if (this.wireMode) this.rebuildAnchors();
    this.dirty = true;
  }

  removeWire(id) {
    const idx = this.wires.findIndex((w) => w.id === id);
    if (idx < 0) return;
    const w = this.wires[idx];
    this.scene.remove(w.group);
    this.wires.splice(idx, 1);
    this.dirty = true;
  }

  clearUserWork() {
    for (const entry of [...this.parts]) {
      if (!entry.fixed) this.removePart(entry.id);
    }
    for (const w of [...this.wires]) this.removeWire(w.id);
    this._pendingAnchor = null;
  }

  /* ----- anchors & wire tool ----- */

  setWireMode(on) {
    this.wireMode = !!on;
    this._pendingAnchor = null;
    this.controls.setCursor?.(this.wireMode ? 'crosshair' : 'default');
    this.canvas.style.cursor = this.wireMode ? 'crosshair' : 'default';
    if (this.wireMode) this.rebuildAnchors();
    else this._clearAnchors();
    this.dirty = true;
  }

  _clearAnchors() {
    if (this._anchorMesh) {
      this.scene.remove(this._anchorMesh);
      this._anchorMesh.geometry?.dispose?.();
      this._anchorMesh.material?.dispose?.();
      this._anchorMesh = null;
      this._anchorList = [];
    }
  }

  _anchorRefs() {
    const refs = [];
    const out = (label, node, world) => {
      refs.push({ label, node, getWorld: () => world.clone(), pos: world });
    };
    this.scene.updateMatrixWorld(true);
    // board header pins (skip digital-protocol pins nobody wires in beginners lessons)
    const skipPins = new Set(['IOREF', 'RESET', 'AREF', 'SCL', 'SDA']);
    for (const [name, p] of Object.entries(this.boardPins ?? {})) {
      if (skipPins.has(name)) continue;
      out(name, 'pin:' + name, p.clone());
    }
    // breadboard tie columns: 10 rows x 27 visible columns
    for (let dz of [-12.7, -10.16, -7.62, -5.08, -2.54, 2.54, 5.08, 7.62, 10.16, 12.7]) {
      const side = dz < 0 ? 'N' : 'S';
      for (let c = -13; c <= 13; c++) {
        const x = c * 2.54;
        const id = `bb:${c}:${side}`;
        out(this._rowLabel(c, side), id, new THREE.Vector3(x, Stage.ROW_Y + 0.2, Stage.BB_Z + dz));
      }
    }
    // power rails (internally continuous → one node per rail strip)
    const rails = [
      ['5V rail (back)', 'rail:red:B', -26.6], ['GND rail (back)', 'rail:blue:B', -21.5],
      ['5V rail (front)', 'rail:red:F', 26.6], ['GND rail (front)', 'rail:blue:F', 21.5],
    ];
    for (const [label, node, dz] of rails) {
      for (let c = -12; c <= 12; c += 6) {
        out(label, node, new THREE.Vector3(c * 2.54, Stage.ROW_Y + 0.2, Stage.BB_Z + dz));
      }
    }
    // part feet (snap to nearby tie column node so nets connect through the breadboard)
    for (const entry of this.parts) {
      const feet = Stage.FEET[entry.type];
      if (!feet) continue;
      feet.forEach((f, i) => {
        const world = entry.group.localToWorld(new THREE.Vector3(f[0], f[1], f[2]));
        let node = `foot:${entry.id}:${i}`;
        let label = `${entry.type} pin ${i + 1}`;
        for (let dz of [-12.7, -10.16, -7.62, -5.08, -2.54, 2.54, 5.08, 7.62, 10.16, 12.7]) {
          if (Math.abs(world.z - (Stage.BB_Z + dz)) < 1.0) {
            const side = dz < 0 ? 'N' : 'S';
            const c = Math.round(world.x / 2.54);
            node = `bb:${c}:${side}`;
            label = `${entry.type} pin ${i + 1} (row ${this._rowLabel(c, side)})`;
            break;
          }
        }
        out(label, node, world);
      });
    }
    // dedupe: two anchors may share node+position (e.g. a foot sitting on a row)
    const seen = new Map();
    for (const r of refs) {
      const k = `${r.node}|${r.pos.x.toFixed(1)}|${r.pos.y.toFixed(1)}|${r.pos.z.toFixed(1)}`;
      if (seen.has(k)) continue;
      seen.set(k, r);
    }
    return [...seen.values()];
  }

  _rowLabel(c, side) {
    // Tinkercad-style labels: A/1..27 in, rows grid
    const col = c + 14; // 1..27 notional letters unnecessary; use number
    return side === 'N' ? `${col}-N` : `${col}-S`;
  }

  rebuildAnchors() {
    this._clearAnchors();
    const list = this._anchorRefs();
    this._anchorList = list;
    const geo = new THREE.SphereGeometry(1.05, 10, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x1aa3a1, transparent: true, opacity: 0.75, depthWrite: false });
    const meshI = new THREE.InstancedMesh(geo, mat, list.length);
    meshI.userData.stageAnchors = true;
    const m = new THREE.Matrix4();
    list.forEach((a, i) => {
      m.makeTranslation(a.pos.x, a.pos.y, a.pos.z);
      meshI.setMatrixAt(i, m);
      meshI.setColorAt?.(i, new THREE.Color(i === this._pendingAnchorIdx ? 0xffcc33 : 0x1aa3a1));
    });
    if (meshI.instanceColor) meshI.instanceColor.needsUpdate = true;
    this.scene.add(meshI);
    this._anchorMesh = meshI;
    this.dirty = true;
  }

  pickAnchorAt(clientX, clientY) {
    if (!this._anchorMesh) return null;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this._raycaster.setFromCamera(ndc, this.camera);
    const hits = this._raycaster.intersectObject(this._anchorMesh);
    if (!hits.length) return null;
    const idx = hits[0].instanceId;
    return idx == null ? null : this._anchorList[idx] ?? null;
  }

  wirePick(clientX, clientY) {
    const a = this.pickAnchorAt(clientX, clientY);
    if (!a) { this._pendingAnchor = null; this.rebuildAnchors(); this.dirty = true; return null; }
    if (this._pendingAnchor) {
      const first = this._anchorList[this._pendingAnchor];
      this._pendingAnchor = null;
      if (first.node !== a.node) {
        const id = this.connect(first, a);
        this.rebuildAnchors();
        return { done: true, id, a: first, b: a };
      }
      this.rebuildAnchors();
      return { done: false };
    }
    this._pendingAnchor = this._anchorList.indexOf(a);
    this.rebuildAnchors();
    return { done: false, pending: a };
  }

  connect(a, b, label) {
    const p1 = a.getWorld();
    const p2 = b.getWorld();
    const dist = p1.distanceTo(p2);
    const arch = Math.min(32, 9 + dist * 0.28);
    const color = Stage.WIRE_COLORS[this._wireSeq % Stage.WIRE_COLORS.length];
    this._wireSeq++;
    const group = buildJumperWire(p1, p2, color, arch, label || `${a.label} → ${b.label}`);
    group.userData.nodes = [a.node, b.node];
    group.userData.aNode = a.node;
    group.userData.bNode = b.node;
    this.scene.add(group);
    const wire = { id: ++this._wireSeq, a: { ...a }, b: { ...b }, group };
    this.wires.push(wire);
    this.dirty = true;
    return wire.id;
  }

  /** net edges for the circuit simulator */
  getNetEdges() {
    return this.wires.map((w) => ({ a: w.a.node, b: w.b.node, id: w.id }));
  }

  /* ----- part dragging / pressing / knob rotation ----- */

  _partAt(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this._raycaster.setFromCamera(ndc, this.camera);
    this.scene.updateMatrixWorld(true);
    const hits = this._raycaster.intersectObjects(this._meshes, true);
    for (const hit of hits) {
      let obj = hit.object;
      while (obj) {
        if (obj.userData?.partId) {
          return this.parts.find((p) => p.id === obj.userData.partId) ?? null;
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  _onCanvasDown(ev) {
    if (this.wireMode) return; // camera + wire tool share clicks; dragging disabled
    const entry = this._partAt(ev.clientX, ev.clientY);
    if (!entry) { this.selectedPart = null; return; }
    this.selectedPart = entry.id;
    if (entry.type === 'button') {
      this._drag = { entry, kind: 'press', sx: ev.clientX, sy: ev.clientY, moved: false };
      this.buttonPressed = true;
      this.controls.setEnabled(false);
      return;
    }
    if (entry.type === 'pot') {
      this._drag = { entry, kind: 'rotate', sx: ev.clientX, val: entry.group.userData.value ?? 512 };
      this.controls.setEnabled(false);
      return;
    }
    // move
    const planeY = Stage.FLOOR_PARTS.has(entry.type) ? 0 : Stage.ROW_Y;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    // lift the group slightly while dragging for feedback
    entry.group.position.y += 1.2;
    this.scene.updateMatrixWorld(true);
    const rc = this._ndcRay(ev.clientX, ev.clientY);
    const hit = new THREE.Vector3();
    rc.ray.intersectPlane(plane, hit);
    this._drag = { entry, kind: 'move', plane, offset: hit ? new THREE.Vector3().subVectors(entry.group.position, hit) : new THREE.Vector3(), moved: false, sx: ev.clientX, sy: ev.clientY };
    this.controls.setEnabled(false);
    this.dirty = true;
  }

  _ndcRay(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this._raycaster.setFromCamera(ndc, this.camera);
    return this._raycaster;
  }

  _onCanvasMove(ev) {
    if (!this._drag) return;
    const d = this._drag;
    if (d.kind === 'press') {
      if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 5) d.moved = true;
      return;
    }
    if (d.kind === 'rotate') {
      const val = Math.min(1023, Math.max(0, Math.round(d.val - (ev.clientX - d.sx) * 3)));
      d.entry.group.userData.value = val;
      const spin = d.entry.group.userData.spinMesh;
      if (spin) spin.rotation.y = (val / 1023) * Math.PI * 1.6 - Math.PI * 0.8;
      this.dirty = true;
      return;
    }
    const entry = d.entry;
    const rc = this._ndcRay(ev.clientX, ev.clientY);
    const hit = new THREE.Vector3();
    if (!rc.ray.intersectPlane(d.plane, hit)) return;
    hit.add(d.offset);
    const floor = Stage.FLOOR_PARTS.has(entry.type);
    let x = hit.x, z = hit.z;
    if (floor) {
      const lim = entry.type === 'servo' ? { x: [-40, 90], z: [10, 90] } : { x: [-110, -35], z: [-90, 30] };
      x = Math.min(lim.x[1], Math.max(lim.x[0], this.snapColumn(x)));
      z = Math.min(lim.z[1], Math.max(lim.z[0], this.snapRowFloor(z, entry.type)));
    } else {
      x = Math.min(38.1, Math.max(-38.1, this.snapColumn(x)));
      z = this.snapRow(Math.min(Stage.BB_Z + 13, Math.max(Stage.BB_Z - 13, z)));
    }
    entry.group.position.set(x, floor ? 0 : Stage.ROW_Y + 1.2, z);
    if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 5) d.moved = true;
    if (this.wireMode) this.rebuildAnchors();
    this.dirty = true;
  }

  snapRowFloor(z, type) {
    // floor knobs servos: loose 5mm grid to avoid overlap feel
    return Math.round(z / 5) * 5;
  }

  _onCanvasUp(ev) {
    if (!this._drag) return;
    const d = this._drag;
    this._drag = null;
    this.controls.setEnabled(true);
    if (d.kind === 'press') {
      this.buttonPressed = false;
      return;
    }
    if (d.kind === 'move') {
      const entry = d.entry;
      const floor = Stage.FLOOR_PARTS.has(entry.type);
      entry.group.position.y = floor ? 0 : Stage.ROW_Y;
      if (d.moved && this.wireMode) this.rebuildAnchors();
      if (!d.moved && entry.fixed === false) return; // pure click → stays selected
      return;
    }
  }

  /** netlist node ids for a part's feet (matches anchor-node ids from the wire tool) */
  footNodes(entry) {
    const feet = Stage.FEET[entry.type] ?? [];
    this.scene.updateMatrixWorld(true);
    return feet.map((f, i) => {
      const world = entry.group.localToWorld(new THREE.Vector3(f[0], f[1], f[2]));
      for (let dz of [-12.7, -10.16, -7.62, -5.08, -2.54, 2.54, 5.08, 7.62, 10.16, 12.7]) {
        if (Math.abs(world.z - (Stage.BB_Z + dz)) < 1.0) {
          const side = dz < 0 ? 'N' : 'S';
          return `bb:${Math.round(world.x / 2.54)}:${side}`;
        }
      }
      return `foot:${entry.id}:${i}`;
    });
  }

  /* ----- simulated device visuals ----- */

  setBoardLed(key, glow) {
    const led = this.boardLeds?.[key];
    if (!led?.material?.emissive) return;
    led.material.emissiveIntensity = 0.35 + Math.max(0, Math.min(1, glow)) * 1.3;
    this.dirty = true;
  }

  resetDeviceVisuals() {
    for (const key of Object.keys(this.boardLeds ?? {})) this.setBoardLed(key, 0);
    for (const entry of this.parts) {
      if (entry.type === 'led') entry.group.traverse((o) => {
        if (o.isMesh && o.material?.emissive) o.material.emissiveIntensity = 0;
      });
      if (entry.type === 'servo') {
        // reset horn to 90° neutral
        entry.group.traverse((o) => { if (o.userData?.isHorn) o.rotation.y = -Math.PI / 2; });
      }
    }
  }

  setLedGlow(id, glow) {
    const entry = this.parts.find((p) => p.id === id);
    if (!entry || entry.type !== 'led') return;
    const g = Math.max(0, Math.min(1, glow));
    entry.group.traverse((o) => {
      if (o.isMesh && o.material?.emissive) o.material.emissiveIntensity = g * 1.6;
    });
    this.dirty = true;
  }

  setServoAngle(id, deg) {
    const entry = this.parts.find((p) => p.id === id);
    if (!entry || entry.type !== 'servo') return;
    entry.group.traverse((o) => { if (o.userData?.isHorn) o.rotation.y = (deg / 180) * Math.PI - Math.PI / 2; });
    this.dirty = true;
  }

  potValue(id) {
    const entry = this.parts.find((p) => p.id === id);
    return entry?.group?.userData?.value ?? Math.floor(1023 / 2);
  }

  reset() {
    this.controls.animateTo({
      target: new THREE.Vector3(0, 0, this.lessonId === 'board' ? 0 : -20),
      azimuth: 36 * DEG,
      elevation: 43 * DEG,
      zoom: 8.4
    }, 600);
    this.dirty = true;
  }

  setGrid(on) {
    this._gridOn = on;
    this.dirty = true;
  }

  setFlow(on) {
    this.flowOn = on;
    this.dirty = true;
  }

  setVisible(on) {
    this._visible = on;
    this.dirty = true;
  }

  setReducedMotion(on) {
    this._reducedMotion = on;
    this.controls.autoRotate = false;
  }

  get autoRotate() { return this.controls.autoRotate; }
  set autoRotate(v) { this.controls.autoRotate = v; }

  get isHome() { return this.lessonId === 'board'; }

  placeCamera() {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;

    const { target, azimuth, elevation, zoom } = this.controls.view;
    const r = Math.max(1, zoom);
    const o = w / 2;
    const s = h / 2;

    const c = this.camera;
    c.left = -o / r;
    c.right = (w - o) / r;
    c.top = s / r;
    c.bottom = -(h - s) / r;
    c.updateProjectionMatrix();

    // Distance 320 mm along spherical coordinates
    const dist = 320;
    c.position.set(
      target.x + Math.sin(azimuth) * Math.cos(elevation) * dist,
      target.y + Math.sin(elevation) * dist,
      target.z + Math.cos(azimuth) * Math.cos(elevation) * dist
    );
    c.lookAt(target);
    this.dirty = true;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
  }

  _onResize() {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.placeCamera();
    this.dirty = true;
  }

  _onKey(e) {
    if (e.target !== document.body && e.target.tagName !== 'BODY') return;
    const speed = 20;
    switch (e.code) {
      case 'KeyW': this.controls.panBy(0, -speed); break;
      case 'KeyS': this.controls.panBy(0,  speed); break;
      case 'KeyA': this.controls.panBy(-speed, 0); break;
      case 'KeyD': this.controls.panBy( speed, 0); break;
      case 'KeyQ': this.controls.turn(-1); break;
      case 'KeyE': this.controls.turn( 1); break;
      case 'KeyR': this.reset(); break;
      case 'KeyF': this.setFlow(!this.flowOn); break;
      case 'Delete':
      case 'Backspace':
        if (this.selectedPart) { this.removePart(this.selectedPart); this.selectedPart = null; }
        break;
      case 'Escape':
        if (this.wireMode) { this._pendingAnchor = null; this.rebuildAnchors(); }
        break;
    }
  }

  _startLoop() {
    const loop = (ts) => {
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(ts - this._last, 64);
      this._last = ts;
      this.controls.update(dt);
      if (this.dirty) this.render();
    };
    this._raf = requestAnimationFrame((ts) => { this._last = ts; loop(ts); });
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    this.renderer.dispose();
  }
}
