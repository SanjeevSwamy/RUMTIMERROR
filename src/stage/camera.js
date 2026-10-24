import { Vector2, Vector3 } from 'three';

const DEG = Math.PI / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.view = {
      target: new Vector3(0, 0, -10),
      azimuth: 36 * DEG,
      elevation: 43 * DEG,
      zoom: 8.4,
    };
    this.zoomGoal = this.view.zoom;
    this.zoomAnchor = null;
    this.glide = new Vector2(0, 0);
    this.tweens = [];
    this.onChange = null;
    this.onClick = null;
    this.onDragState = null;
    this.onGrab = null;
    this.autoRotate = false;
    this.enabled = true;
    this._dragging = false;
    this._down = null;
    this._moved = 0;
    this._pinch = null;
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (!on) this._down = null;
  }

  animateTo(dest, ms = 500) {
    const src = {
      target: this.view.target.clone(),
      azimuth: this.view.azimuth,
      elevation: this.view.elevation,
      zoom: this.view.zoom,
    };
    const dur = Math.max(1, ms);
    let elapsed = 0;
    this.zoomGoal = dest.zoom ?? this.view.zoom;
    const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

    this.tweens.push({
      tick(dt) {
        elapsed = Math.min(dur, elapsed + dt);
        const t = ease(elapsed / dur);
        this.view.target.lerpVectors(src.target, dest.target ?? src.target, t);
        if (dest.azimuth != null) this.view.azimuth = lerpAngle(src.azimuth, dest.azimuth, t);
        if (dest.elevation != null) this.view.elevation = src.elevation + (dest.elevation - src.elevation) * t;
        if (dest.zoom != null) this.view.zoom = src.zoom + (dest.zoom - src.zoom) * t;
        return elapsed >= dur;
      },
    });
    this.emit();
  }

  setView(dest, ms) {
    Object.assign(this.view, dest);
    if (dest.zoom != null) this.zoomGoal = dest.zoom;
    if (ms) this.animateTo(dest, ms);
    this.emit();
  }

  panBy(dx, dy) {
    const axes = this.axes();
    const ax = axes.right, ay = axes.down;
    const s = 1.0 / Math.max(1, this.view.zoom);
    this.view.target.addScaledVector(ax, -dx * s);
    this.view.target.addScaledVector(ay, -dy * s);
    this.view.target.x = clamp(this.view.target.x, -90, 150);
    this.view.target.y = 0;
    this.view.target.z = clamp(this.view.target.z, -110, 90);
    this.emit();
  }

  axes() {
    const { azimuth } = this.view;
    return {
      right: new Vector3(Math.cos(azimuth), 0, -Math.sin(azimuth)),
      down: new Vector3(Math.sin(azimuth), 0, Math.cos(azimuth)),
    };
  }

  turn(dir) {
    this.animateTo({ azimuth: this.view.azimuth + dir * 30 * DEG }, 300);
  }

  update(dt) {
    this.glide.multiplyScalar(Math.exp(-dt / 150));
    if (this.glide.lengthSq() > 1e-4) {
      this.panBy(this.glide.x * dt * 0.05, this.glide.y * dt * 0.05);
    }
    if (Math.abs(this.zoomGoal - this.view.zoom) > 1e-3) {
      this.view.zoom += (this.zoomGoal - this.view.zoom) * (1 - Math.exp(-dt / 75));
      this.emit();
    }
    if (this.autoRotate) {
      this.view.azimuth += dt * 0.0003;
      this.emit();
    }
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      if (this.tweens[i].tick.call(this, dt)) {
        this.tweens.splice(i, 1);
      }
    }
    this.emit();
  }

  emit() {
    if (this.onChange) this.onChange();
  }

  onPointerDown(ev) {
    if (this.enabled === false) return;
    try { ev.target.setPointerCapture?.(ev.pointerId); } catch {}
    this._down = { x: ev.clientX, y: ev.clientY, button: ev.button };
    this._moved = 0;
    this._dragging = false;
    this.glide.set(0, 0);
    if (this.onGrab) this.onGrab();
  }

  onPointerMove(ev) {
    if (this.enabled === false) { this._down = null; return; }
    if (!this._down) return;
    const dx = ev.clientX - this._down.x;
    const dy = ev.clientY - this._down.y;
    if (!this._dragging) {
      if (Math.hypot(dx, dy) < 4) return;
      this._dragging = true;
      if (this.onDragState) this.onDragState(true);
    }
    this._down.x = ev.clientX;
    this._down.y = ev.clientY;

    if (this._down.button === 2 || ev.shiftKey) {
      // Orbit (rotate azimuth & elevation)
      this.view.azimuth -= dx * 0.01;
      this.view.elevation = clamp(this.view.elevation + dy * 0.01, 15 * DEG, 80 * DEG);
      this.emit();
    } else {
      // Pan
      this.panBy(dx, dy);
    }
    this._moved += Math.abs(dx) + Math.abs(dy);
  }

  onPointerUp(ev) {
    try { ev.target.releasePointerCapture?.(ev.pointerId); } catch {}
    const wasDrag = this._dragging;
    this._down = null;
    if (this._dragging) {
      this._dragging = false;
      if (this.onDragState) this.onDragState(false);
    }
    if (!wasDrag && this.onClick) this.onClick(ev);
  }

  onWheel(ev) {
    if (this.enabled === false) return;
    ev.preventDefault();
    const d = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY;
    const factor = Math.exp(-d * 0.0018);
    this.zoomGoal = clamp(this.zoomGoal * factor, 3.0, 18.0);
    this.emit();
  }
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
