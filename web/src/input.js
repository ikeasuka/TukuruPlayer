// RGSS Input state. Sources: keyboard (JS), native controller / virtual pad (bitmask from iOS).

export const BTN = {
  DOWN: 0, LEFT: 1, RIGHT: 2, UP: 3,
  A: 4, B: 5, C: 6, X: 7, Y: 8, Z: 9, L: 10, R: 11,
  SHIFT: 12, CTRL: 13, ALT: 14, F5: 15, F6: 16, F7: 17, F8: 18, F9: 19,
};
const NBTN = 20;

// Default RGSS keyboard mapping (F1 settings)
const KEYMAP = {
  ArrowDown: [BTN.DOWN], ArrowLeft: [BTN.LEFT], ArrowRight: [BTN.RIGHT], ArrowUp: [BTN.UP],
  Numpad2: [BTN.DOWN], Numpad4: [BTN.LEFT], Numpad6: [BTN.RIGHT], Numpad8: [BTN.UP],
  Space: [BTN.C], Enter: [BTN.C], NumpadEnter: [BTN.C], KeyZ: [BTN.C],
  Escape: [BTN.B], KeyX: [BTN.B], Numpad0: [BTN.B], Insert: [BTN.B],
  ShiftLeft: [BTN.A, BTN.SHIFT], ShiftRight: [BTN.A, BTN.SHIFT],
  KeyA: [BTN.X], KeyS: [BTN.Y], KeyD: [BTN.Z],
  KeyQ: [BTN.L], PageUp: [BTN.L], KeyW: [BTN.R], PageDown: [BTN.R],
  ControlLeft: [BTN.CTRL], ControlRight: [BTN.CTRL], AltLeft: [BTN.ALT], AltRight: [BTN.ALT],
  F5: [BTN.F5], F6: [BTN.F6], F7: [BTN.F7], F8: [BTN.F8], F9: [BTN.F9],
};

export class Input {
  constructor() {
    this.keyMask = 0;
    this.nativeMask = 0;
    this.prev = 0;
    this.latched = 0; // presses released before the next update still count once
    this.counts = new Int32Array(NBTN);
    this.dirOrder = []; // most recent last
    this.onReset = null;
    this.onAnyKey = null;
    window.addEventListener("keydown", (e) => this.key(e, true));
    window.addEventListener("keyup", (e) => this.key(e, false));
    window.addEventListener("blur", () => { this.keyMask = 0; });
  }

  key(e, down) {
    if (e.code === "F12" && down) { if (this.onReset) this.onReset(); e.preventDefault(); return; }
    const bits = KEYMAP[e.code];
    if (!bits) return;
    e.preventDefault();
    for (const b of bits) {
      if (down) { this.keyMask |= 1 << b; this.latched |= 1 << b; }
      else this.keyMask &= ~(1 << b);
    }
    if (down && this.onAnyKey) this.onAnyKey();
  }

  setNative(mask) {
    mask |= 0;
    this.latched |= mask & ~this.nativeMask;
    this.nativeMask = mask;
    if (mask && this.onAnyKey) this.onAnyKey();
  }

  current() { return this.keyMask | this.nativeMask; }

  // Called once per Input.update from Ruby. Returns "press,trigger,repeat,dir4,dir8".
  update() {
    const cur = this.current() | (this.latched & ~this.prev);
    this.latched = 0;
    const trigger = cur & ~this.prev;
    let repeat = 0;
    for (let b = 0; b < NBTN; b++) {
      if (cur & (1 << b)) {
        const c = ++this.counts[b];
        if (c === 1 || (c >= 24 && (c - 24) % 6 === 0)) repeat |= 1 << b;
      } else {
        this.counts[b] = 0;
      }
    }
    // direction ordering (latest pressed wins for dir4)
    for (const [b, d] of [[BTN.DOWN, 2], [BTN.LEFT, 4], [BTN.RIGHT, 6], [BTN.UP, 8]]) {
      const idx = this.dirOrder.indexOf(d);
      if (cur & (1 << b)) { if (idx < 0) this.dirOrder.push(d); }
      else if (idx >= 0) this.dirOrder.splice(idx, 1);
    }
    let dir4 = 0;
    // ignore opposite pairs
    const down = !!(cur & (1 << BTN.DOWN)), up = !!(cur & (1 << BTN.UP));
    const left = !!(cur & (1 << BTN.LEFT)), right = !!(cur & (1 << BTN.RIGHT));
    const vy = down && !up ? 2 : up && !down ? 8 : 0;
    const vx = left && !right ? 4 : right && !left ? 6 : 0;
    for (let i = this.dirOrder.length - 1; i >= 0; i--) {
      const d = this.dirOrder[i];
      if (d === vy || d === vx) { dir4 = d; break; }
    }
    let dir8 = 0;
    if (vx && vy) {
      dir8 = vy === 2 ? (vx === 4 ? 1 : 3) : (vx === 4 ? 7 : 9);
    } else dir8 = vx || vy;
    this.prev = cur;
    return `${cur},${trigger},${repeat},${dir4},${dir8}`;
  }
}
