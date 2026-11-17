// Parses the display list produced by Ruby (Graphics.update) and draws it.
import { TileBuilder } from "./tilemap.js";

const T_SPRITE = 1, T_PLANE = 2, T_WINDOW = 3, T_TILEMAP = 4, T_VIEWPORT = 5;
const LEN = { 1: 32, 2: 19, 3: 31, 4: 17, 5: 22 };

export class SceneDrawer {
  constructor(renderer, bitmaps) {
    this.r = renderer;
    this.bm = bitmaps;
    this.tables = new Map(); // id -> {data, xs, ys, zs}
    this.tiles = new TileBuilder();
  }

  uploadTable(id, b64, xs, ys, zs) {
    const bin = atob(b64);
    const n = bin.length >> 1;
    const data = new Int16Array(n);
    for (let i = 0; i < n; i++) {
      const v = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8);
      data[i] = v > 32767 ? v - 65536 : v;
    }
    this.tables.set(id, { data, xs, ys, zs });
  }

  freeTable(id) { this.tables.delete(id); }

  bmp(id) {
    if (!id) return null;
    return this.bm.map.get(id) || null;
  }

  // ---- main entry --------------------------------------------------------
  render(listStr) {
    const a = listStr.length ? listStr.split(",").map(Number) : [];
    const r = this.r;
    r.brightness = a.length ? a[0] : 255;
    const viewports = new Map();
    const top = [];
    let i = 1;
    // first pass: collect viewports
    const recs = [];
    while (i < a.length) {
      const t = a[i];
      const len = LEN[t];
      if (!len) break;
      if (t === T_VIEWPORT) {
        const vp = {
          uid: a[i + 1], z: a[i + 2], visible: a[i + 3] !== 0,
          rect: [a[i + 4], a[i + 5], a[i + 6], a[i + 7]], ox: a[i + 8], oy: a[i + 9],
          color: [a[i + 10], a[i + 11], a[i + 12], a[i + 13]],
          tone: [a[i + 14], a[i + 15], a[i + 16], a[i + 17]],
          flash: [a[i + 18], a[i + 19], a[i + 20], a[i + 21]],
          children: [],
        };
        viewports.set(vp.uid, vp);
        top.push({ z: vp.z, uid: vp.uid, vp });
      } else {
        recs.push(i);
      }
      i += len;
    }
    for (const k of recs) {
      const t = a[k];
      const vpid = a[k + 2];
      const vp = vpid ? viewports.get(vpid) : null;
      const list = vp ? vp.children : top;
      if (vpid && !vp) continue; // viewport disposed/invisible
      if (t === T_TILEMAP) {
        list.push({ z: 0, uid: a[k + 1], tilemap: k, layer: 0 });
        list.push({ z: 200, uid: a[k + 1], tilemap: k, layer: 1 });
      } else {
        list.push({ z: a[k + 3], uid: a[k + 1], rec: k });
      }
    }
    const cmp = (x, y) => (x.z - y.z) || (x.uid - y.uid);
    top.sort(cmp);
    const W = r.width, Hh = r.height;
    const screenRect = [0, 0, W, Hh];
    this.a = a;
    r.beginScene();
    // tilemap layers share one build per frame
    this.tileCache = new Map();
    for (const it of top) {
      if (it.vp) {
        const vp = it.vp;
        if (!vp.visible) continue;
        const clip = intersect(vp.rect, screenRect);
        if (clip[2] <= 0 || clip[3] <= 0) continue;
        vp.children.sort(cmp);
        r.scissor(clip);
        const offX = vp.rect[0] - vp.ox, offY = vp.rect[1] - vp.oy;
        for (const c of vp.children) this.drawItem(c, offX, offY, vp.rect, clip);
        r.scissor(null);
        const fx = vp.flash[3] > 0 ? vp.flash : vp.color;
        if (fx[3] > 0 || vp.tone[0] || vp.tone[1] || vp.tone[2] || vp.tone[3]) {
          r.applyEffect(clip, fx, vp.tone);
        }
      } else {
        this.drawItem(it, 0, 0, screenRect, screenRect);
      }
    }
    r.scissor(null);
  }

  drawItem(it, offX, offY, area, clip) {
    const a = this.a;
    if (it.tilemap !== undefined) return this.drawTilemap(it.tilemap, it.layer, offX, offY, area, clip);
    const k = it.rec;
    switch (a[k]) {
      case T_SPRITE: return this.drawSprite(k, offX, offY);
      case T_PLANE: return this.drawPlane(k, area, clip);
      case T_WINDOW: return this.drawWindow(k, offX, offY, clip);
    }
  }

  // ---- sprite ---------------------------------------------------------------
  drawSprite(k, offX, offY) {
    const a = this.a, r = this.r;
    const b = this.bmp(a[k + 4]);
    if (!b) return;
    const x = a[k + 5] + offX, y = a[k + 6] + offY, ox = a[k + 7], oy = a[k + 8];
    const zx = a[k + 9], zy = a[k + 10], angle = a[k + 11], mirror = a[k + 12] !== 0;
    let sx = a[k + 13], sy = a[k + 14], sw = a[k + 15], sh = a[k + 16];
    const opacity = a[k + 17] / 255, blend = a[k + 18];
    const bushDepth = a[k + 19], bushOpacity = a[k + 20] / 255;
    const color = [a[k + 21], a[k + 22], a[k + 23], a[k + 24]];
    const tone = [a[k + 25], a[k + 26], a[k + 27], a[k + 28]];
    const waveAmp = a[k + 29], waveLen = a[k + 30], wavePhase = a[k + 31];
    if (opacity <= 0 || zx === 0 || zy === 0) return;
    const fullW = sw;
    // clip src rect to bitmap
    let lx = 0, ly = 0;
    if (sx < 0) { lx = -sx; sw += sx; sx = 0; }
    if (sy < 0) { ly = -sy; sh += sy; sy = 0; }
    if (sx + sw > b.w) sw = b.w - sx;
    if (sy + sh > b.h) sh = b.h - sy;
    if (sw <= 0 || sh <= 0) return;
    const tex = r.texFor(b);
    const tw = b.w, th = b.h;
    let u0 = sx / tw, u1 = (sx + sw) / tw;
    const v0 = sy / th, v1 = (sy + sh) / th;
    if (mirror) { const t = u0; u0 = u1; u1 = t; lx = fullW - lx - sw; }
    const bushV = bushDepth > 0 ? (sy + sh - bushDepth) / th : 2.0;
    r.useSprite(tex, opacity, color, tone, bushV, bushOpacity, blend);
    if (waveAmp > 0 && angle === 0) {
      // horizontal wave: draw in strips
      const strip = 2;
      for (let yy = 0; yy < sh; yy += strip) {
        const hh = Math.min(strip, sh - yy);
        const ph = ((wavePhase + ((ly + yy) * 360) / Math.max(1, waveLen)) * Math.PI) / 180;
        const off = waveAmp * Math.sin(ph);
        const px0 = x + (lx - ox + off) * zx, py0 = y + (ly + yy - oy) * zy;
        r.rect(px0, py0, sw * zx, hh * zy, u0, (sy + yy) / th, u1, (sy + yy + hh) / th);
      }
      r.flush();
      return;
    }
    const L = (lx - ox) * zx, T = (ly - oy) * zy, R = (lx + sw - ox) * zx, B = (ly + sh - oy) * zy;
    if (angle === 0) {
      r.rect(x + L, y + T, R - L, B - T, u0, v0, u1, v1);
    } else {
      const rad = (-angle * Math.PI) / 180;
      const c = Math.cos(rad), s = Math.sin(rad);
      const tf = (px, py) => [x + px * c - py * s, y + px * s + py * c];
      const p0 = tf(L, T), p1 = tf(R, T), p2 = tf(L, B), p3 = tf(R, B);
      r.quad(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1], p3[0], p3[1], u0, v0, u1, v1);
    }
    r.flush();
  }

  // ---- plane ----------------------------------------------------------------
  drawPlane(k, area, clip) {
    const a = this.a, r = this.r;
    const b = this.bmp(a[k + 4]);
    if (!b) return;
    const ox = a[k + 5], oy = a[k + 6], zx = a[k + 7] || 1, zy = a[k + 8] || 1;
    const opacity = a[k + 9] / 255, blend = a[k + 10];
    const color = [a[k + 11], a[k + 12], a[k + 13], a[k + 14]];
    const tone = [a[k + 15], a[k + 16], a[k + 17], a[k + 18]];
    if (opacity <= 0) return;
    const tex = r.texFor(b);
    r.setRepeat(b, true);
    const x = clip[0], y = clip[1], w = clip[2], h = clip[3];
    const pw = b.w * zx, ph = b.h * zy;
    const u0 = (x - area[0] + ox) / pw, v0 = (y - area[1] + oy) / ph;
    const u1 = u0 + w / pw, v1 = v0 + h / ph;
    r.useSprite(tex, opacity, color, tone, 2.0, 1.0, blend);
    r.rect(x, y, w, h, u0, v0, u1, v1);
    r.flush();
    r.setRepeat(b, false);
  }

  // ---- window (RGSS2/RGSS3 skin layout) ---------------------------------------
  drawWindow(k, offX, offY, clip) {
    const a = this.a, r = this.r;
    const skin = this.bmp(a[k + 4]);
    const contents = this.bmp(a[k + 5]);
    const x = a[k + 6] + offX, y = a[k + 7] + offY, w = a[k + 8], h = a[k + 9];
    const ox = a[k + 10], oy = a[k + 11], pad = a[k + 12], padB = a[k + 13];
    const opacity = a[k + 14] / 255, backOp = a[k + 15] / 255, contOp = a[k + 16] / 255;
    const openness = a[k + 17];
    const cx = a[k + 18], cy = a[k + 19], cw = a[k + 20], ch = a[k + 21];
    const active = a[k + 22] !== 0, pause = a[k + 23] !== 0, arrows = a[k + 24] !== 0;
    const tone = [a[k + 25], a[k + 26], a[k + 27], a[k + 28]];
    const anim = a[k + 29], cursorRel = a[k + 30] !== 0;
    if (w <= 0 || h <= 0 || openness <= 0) return;
    const hh = Math.round((h * openness) / 255);
    const yy = y + Math.round((h - hh) / 2);
    if (skin && hh > 0) {
      const tex = r.texFor(skin);
      const TW = skin.w, TH = skin.h;
      const S = (sx, sy, sw, sh, dx, dy, dw, dh) => {
        if (dw <= 0 || dh <= 0) return;
        r.rect(dx, dy, dw, dh, sx / TW, sy / TH, (sx + sw) / TW, (sy + sh) / TH);
      };
      // background (stretched + tiled pattern)
      const bx = x + 2, by = yy + 2, bw = w - 4, bh = hh - 4;
      if (bw > 0 && bh > 0 && backOp * opacity > 0) {
        r.useSprite(tex, backOp * opacity, null, tone);
        S(0, 0, 64, 64, bx, by, bw, bh);
        r.flush();
        r.useSprite(tex, backOp * opacity, null, tone);
        for (let ty = 0; ty < bh; ty += 64) {
          const th2 = Math.min(64, bh - ty);
          for (let tx = 0; tx < bw; tx += 64) {
            const tw2 = Math.min(64, bw - tx);
            S(0, 64, tw2, th2, bx + tx, by + ty, tw2, th2);
          }
        }
        r.flush();
      }
      // frame
      if (opacity > 0) {
        r.useSprite(tex, opacity, null, null);
        const c = 16;
        const fh = Math.min(c, Math.floor(hh / 2)), fw = Math.min(c, Math.floor(w / 2));
        S(64, 0, fw, fh, x, yy, fw, fh);
        S(128 - fw, 0, fw, fh, x + w - fw, yy, fw, fh);
        S(64, 64 - fh, fw, fh, x, yy + hh - fh, fw, fh);
        S(128 - fw, 64 - fh, fw, fh, x + w - fw, yy + hh - fh, fw, fh);
        S(64 + c, 0, 32, fh, x + fw, yy, w - fw * 2, fh);
        S(64 + c, 64 - fh, 32, fh, x + fw, yy + hh - fh, w - fw * 2, fh);
        S(64, c, fw, 32, x, yy + fh, fw, hh - fh * 2);
        S(128 - fw, c, fw, 32, x + w - fw, yy + fh, fw, hh - fh * 2);
        r.flush();
      }
    }
    if (openness < 255) return;
    // inner (contents) area
    const inner = [x + pad, y + pad, w - pad * 2, h - pad - padB];
    const innerClip = intersect(inner, clip);
    // cursor
    if (skin && cw > 0 && ch > 0 && innerClip[2] > 0 && innerClip[3] > 0) {
      const tex = r.texFor(skin);
      const TW = skin.w, TH = skin.h;
      let alpha = 1;
      if (active) {
        const t = anim % 40;
        alpha = (255 - (t < 20 ? t : 40 - t) * 6) / 255;
      } else {
        alpha = 0.6;
      }
      const dx = x + pad + cx - (cursorRel ? ox : 0);
      const dy = y + pad + cy - (cursorRel ? oy : 0);
      r.scissor(innerClip);
      r.useSprite(tex, alpha * contOp, null, null);
      const b = 4;
      const P = (sx, sy, sw, sh, ddx, ddy, dw, dh) => {
        if (dw <= 0 || dh <= 0) return;
        r.rect(ddx, ddy, dw, dh, sx / TW, sy / TH, (sx + sw) / TW, (sy + sh) / TH);
      };
      const bw = Math.min(b, Math.floor(cw / 2)), bh = Math.min(b, Math.floor(ch / 2));
      P(64, 64, bw, bh, dx, dy, bw, bh);
      P(96 - bw, 64, bw, bh, dx + cw - bw, dy, bw, bh);
      P(64, 96 - bh, bw, bh, dx, dy + ch - bh, bw, bh);
      P(96 - bw, 96 - bh, bw, bh, dx + cw - bw, dy + ch - bh, bw, bh);
      P(64 + b, 64, 32 - b * 2, bh, dx + bw, dy, cw - bw * 2, bh);
      P(64 + b, 96 - bh, 32 - b * 2, bh, dx + bw, dy + ch - bh, cw - bw * 2, bh);
      P(64, 64 + b, bw, 32 - b * 2, dx, dy + bh, bw, ch - bh * 2);
      P(96 - bw, 64 + b, bw, 32 - b * 2, dx + cw - bw, dy + bh, bw, ch - bh * 2);
      P(64 + b, 64 + b, 32 - b * 2, 32 - b * 2, dx + bw, dy + bh, cw - bw * 2, ch - bh * 2);
      r.flush();
      r.scissor(clip);
    }
    // contents
    if (contents && contOp > 0 && innerClip[2] > 0 && innerClip[3] > 0) {
      const tex = r.texFor(contents);
      r.scissor(innerClip);
      r.useSprite(tex, contOp, null, null);
      r.rect(x + pad - ox, y + pad - oy, contents.w, contents.h, 0, 0, 1, 1);
      r.flush();
      r.scissor(clip);
    }
    if (!skin) return;
    const tex = r.texFor(skin);
    const TW = skin.w, TH = skin.h;
    const S = (sx, sy, sw, sh, dx, dy) => r.rect(dx, dy, sw, sh, sx / TW, sy / TH, (sx + sw) / TW, (sy + sh) / TH);
    // scroll arrows
    if (arrows && contents) {
      r.useSprite(tex, 1, null, null);
      const iw = w - pad * 2, ih = h - pad - padB;
      if (oy > 0) S(88, 16, 16, 8, x + w / 2 - 8, y + 4);
      if (contents.h - oy > ih) S(88, 40, 16, 8, x + w / 2 - 8, y + h - 12);
      if (ox > 0) S(80, 24, 8, 16, x + 4, y + h / 2 - 8);
      if (contents.w - ox > iw) S(104, 24, 8, 16, x + w - 12, y + h / 2 - 8);
      r.flush();
    }
    // pause sign
    if (pause) {
      const f = Math.floor(anim / 8) % 4;
      r.useSprite(tex, 1, null, null);
      S(96 + (f % 2) * 16, 64 + Math.floor(f / 2) * 16, 16, 16, x + w / 2 - 8, y + h - 16);
      r.flush();
    }
  }

  // ---- tilemap --------------------------------------------------------------
  drawTilemap(k, layer, offX, offY, area, clip) {
    const a = this.a, r = this.r;
    let built = this.tileCache.get(k);
    if (!built) {
      const ox = a[k + 3], oy = a[k + 4], anim = a[k + 5];
      const map = this.tables.get(a[k + 15]);
      const flagsT = this.tables.get(a[k + 16]);
      // account for viewport ox/oy (e.g. screen shake)
      built = this.tiles.build(map, flagsT ? flagsT.data : null, ox + area[0] - offX, oy + area[1] - offY, area[2], area[3], anim);
      this.tileCache.set(k, built);
    }
    const bmps = [];
    for (let i = 0; i < 9; i++) bmps.push(this.bmp(a[k + 6 + i]));
    const bx = area[0], by = area[1];
    const drawBucket = (bucket) => {
      for (const [set, q] of bucket) {
        const b = bmps[set];
        if (!b) continue;
        const tex = r.texFor(b);
        const TW = b.w, TH = b.h;
        r.useSprite(tex, 1, null, null);
        for (let i = 0; i < q.length; i += 8) {
          const sx = q[i + 4], sy = q[i + 5], sw = q[i + 6], sh = q[i + 7];
          r.rect(bx + q[i], by + q[i + 1], q[i + 2], q[i + 3], sx / TW, sy / TH, (sx + sw) / TW, (sy + sh) / TH);
        }
        r.flush();
      }
    };
    if (layer === 0) {
      drawBucket(built.lower[0]);
      drawBucket(built.lower[1]);
      const sh = built.lower[2];
      if (sh.length) {
        for (let i = 0; i < sh.length; i += 3) {
          const bits = sh[i + 2];
          for (let q = 0; q < 4; q++) {
            if (bits & (1 << q)) {
              r.fillRect(bx + sh[i] + (q % 2) * 16, by + sh[i + 1] + Math.floor(q / 2) * 16, 16, 16, 0, 0, 0, 0.5);
            }
          }
        }
      }
      drawBucket(built.lower[3]);
    } else {
      drawBucket(built.upper);
    }
  }
}

function intersect(a, b) {
  const x = Math.max(a[0], b[0]), y = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]), y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  return [x, y, Math.max(0, x2 - x), Math.max(0, y2 - y)];
}
