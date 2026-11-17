// Bitmap storage backed by images (immutable until written) and 2D canvases.

const FALLBACK_FONTS = ['"Hiragino Sans"', '"Hiragino Kaku Gothic ProN"', '"Noto Sans JP"', '"Noto Sans CJK JP"', "sans-serif"];

export class Bmp {
  constructor(w, h, image = null) {
    this.w = Math.max(1, w | 0);
    this.h = Math.max(1, h | 0);
    this.image = image;
    this.canvas = null;
    this.c = null;
    this.version = 1;
    this.tex = null;
    this.texVersion = -1;
  }
  ctx() {
    if (!this.c) {
      const cv = document.createElement("canvas");
      cv.width = this.w;
      cv.height = this.h;
      this.canvas = cv;
      this.c = cv.getContext("2d");
      this.c.imageSmoothingEnabled = false;
      if (this.image) {
        this.c.drawImage(this.image, 0, 0);
        this.image = null;
      }
    }
    return this.c;
  }
  source() { return this.canvas || this.image; }
  touch() { this.version++; }
  free() {
    if (this.canvas) { this.canvas.width = 0; this.canvas.height = 0; }
    this.canvas = null; this.c = null; this.image = null;
  }
}

function clipSrc(sw0, sh0, sx, sy, sw, sh, dx, dy) {
  // clip a source rect to the source bitmap, moving dest accordingly (1:1)
  if (sx < 0) { dx -= sx; sw += sx; sx = 0; }
  if (sy < 0) { dy -= sy; sh += sy; sy = 0; }
  if (sx + sw > sw0) sw = sw0 - sx;
  if (sy + sh > sh0) sh = sh0 - sy;
  return [sx, sy, sw, sh, dx, dy];
}

export function rgba(r, g, b, a) {
  return `rgba(${r | 0},${g | 0},${b | 0},${(a / 255).toFixed(4)})`;
}

export class BitmapStore {
  constructor(host, renderer) {
    this.host = host;
    this.renderer = renderer;
    this.map = new Map();
    this.next = 1;
    this.imageCache = new Map(); // url -> Promise<ImageBitmap|HTMLImageElement>
    this.fontFamilies = new Set();
    this.measureCtx = document.createElement("canvas").getContext("2d");
  }

  get(id) {
    const b = this.map.get(id);
    if (!b) throw new Error("disposed bitmap");
    return b;
  }

  add(b) {
    const id = this.next++;
    this.map.set(id, b);
    return id;
  }

  create(w, h) { return this.add(new Bmp(w, h)); }

  async decode(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("not found");
    const blob = await res.blob();
    try {
      return await createImageBitmap(blob);
    } catch (e) {
      // Fallback via <img>
      const u = URL.createObjectURL(blob);
      try {
        const img = new Image();
        img.src = u;
        await img.decode();
        return img;
      } finally {
        URL.revokeObjectURL(u);
      }
    }
  }

  async load(path) {
    const url = this.host.gameURL(path);
    let entry = this.imageCache.get(url);
    if (entry) {
      // refresh LRU position
      this.imageCache.delete(url);
      this.imageCache.set(url, entry);
    } else {
      entry = { p: this.decode(url), bytes: 0 };
      this.imageCache.set(url, entry);
    }
    let img;
    try {
      img = await entry.p;
    } catch (e) {
      this.imageCache.delete(url);
      throw new Error("Unable to find file: " + path);
    }
    entry.bytes = img.width * img.height * 4;
    this.trimImageCache();
    return this.add(new Bmp(img.width, img.height, img));
  }

  // Keep decoded images for re-use, limited by memory (iOS kills the web process on high memory).
  trimImageCache(limit = 48 * 1048576) {
    let total = 0;
    for (const e of this.imageCache.values()) total += e.bytes;
    for (const [k, e] of this.imageCache) {
      if (total <= limit) break;
      if (!e.bytes) continue; // still decoding
      total -= e.bytes;
      this.imageCache.delete(k);
    }
  }

  // Approximate memory held by live bitmaps (pixels + GPU textures), in MB.
  memoryMB() {
    let bytes = 0;
    for (const b of this.map.values()) {
      const px = b.w * b.h * 4;
      bytes += (b.canvas ? px : 0) + (b.tex ? px : 0);
    }
    return Math.round(bytes / 1048576);
  }

  fromPixels(w, h, pixels) {
    const b = new Bmp(w, h);
    b.ctx().putImageData(new ImageData(pixels, w, h), 0, 0);
    return this.add(b);
  }

  dup(id) {
    const s = this.get(id);
    const b = new Bmp(s.w, s.h);
    if (s.canvas) b.ctx().drawImage(s.canvas, 0, 0);
    else b.image = s.image;
    return this.add(b);
  }

  dispose(id) {
    const b = this.map.get(id);
    if (!b) return;
    this.renderer.deleteTex(b);
    b.free();
    this.map.delete(id);
  }

  width(id) { return this.get(id).w; }
  height(id) { return this.get(id).h; }

  blt(dstId, x, y, srcId, sx, sy, sw, sh, opacity) {
    const d = this.get(dstId), s = this.get(srcId);
    [sx, sy, sw, sh, x, y] = clipSrc(s.w, s.h, sx, sy, sw, sh, x, y);
    if (sw <= 0 || sh <= 0 || opacity <= 0) return;
    const c = d.ctx();
    c.globalAlpha = Math.min(1, opacity / 255);
    c.drawImage(s.source(), sx, sy, sw, sh, x, y, sw, sh);
    c.globalAlpha = 1;
    d.touch();
  }

  stretchBlt(dstId, dx, dy, dw, dh, srcId, sx, sy, sw, sh, opacity) {
    const d = this.get(dstId), s = this.get(srcId);
    if (sw === 0 || sh === 0 || dw === 0 || dh === 0 || opacity <= 0) return;
    // clip source while scaling the destination proportionally
    const fx = dw / sw, fy = dh / sh;
    if (sx < 0) { dx -= sx * fx; dw += sx * fx; sw += sx; sx = 0; }
    if (sy < 0) { dy -= sy * fy; dh += sy * fy; sh += sy; sy = 0; }
    if (sx + sw > s.w) { const o = sx + sw - s.w; sw -= o; dw -= o * fx; }
    if (sy + sh > s.h) { const o = sy + sh - s.h; sh -= o; dh -= o * fy; }
    if (sw <= 0 || sh <= 0) return;
    const c = d.ctx();
    c.globalAlpha = Math.min(1, opacity / 255);
    c.drawImage(s.source(), sx, sy, sw, sh, dx, dy, dw, dh);
    c.globalAlpha = 1;
    d.touch();
  }

  fill(id, x, y, w, h, r, g, b, a) {
    const d = this.get(id);
    const c = d.ctx();
    c.clearRect(x, y, w, h);
    if (a > 0) {
      c.fillStyle = rgba(r, g, b, a);
      c.fillRect(x, y, w, h);
    }
    d.touch();
  }

  gradient(id, x, y, w, h, r1, g1, b1, a1, r2, g2, b2, a2, vertical) {
    const d = this.get(id);
    const c = d.ctx();
    c.clearRect(x, y, w, h);
    const gr = vertical ? c.createLinearGradient(0, y, 0, y + h) : c.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, rgba(r1, g1, b1, a1));
    gr.addColorStop(1, rgba(r2, g2, b2, a2));
    c.fillStyle = gr;
    c.fillRect(x, y, w, h);
    d.touch();
  }

  clear(id) {
    const d = this.get(id);
    if (!d.c && !d.image) return;
    d.ctx().clearRect(0, 0, d.w, d.h);
    d.touch();
  }

  clearRect(id, x, y, w, h) {
    const d = this.get(id);
    d.ctx().clearRect(x, y, w, h);
    d.touch();
  }

  getPixel(id, x, y) {
    const d = this.get(id);
    if (x < 0 || y < 0 || x >= d.w || y >= d.h) return "0,0,0,0";
    const p = d.ctx().getImageData(x, y, 1, 1).data;
    return `${p[0]},${p[1]},${p[2]},${p[3]}`;
  }

  setPixel(id, x, y, r, g, b, a) {
    const d = this.get(id);
    if (x < 0 || y < 0 || x >= d.w || y >= d.h) return;
    const im = new ImageData(1, 1);
    im.data[0] = r; im.data[1] = g; im.data[2] = b; im.data[3] = a;
    d.ctx().putImageData(im, x, y);
    d.touch();
  }

  hueChange(id, hue) {
    const d = this.get(id);
    const c = d.ctx();
    const im = c.getImageData(0, 0, d.w, d.h);
    const p = im.data;
    const rad = (hue * Math.PI) / 180;
    const cosA = Math.cos(rad), sinA = Math.sin(rad);
    // rotation matrix in YIQ-like space (luminance preserving hue rotation)
    const m = [
      0.299 + 0.701 * cosA + 0.168 * sinA, 0.587 - 0.587 * cosA + 0.330 * sinA, 0.114 - 0.114 * cosA - 0.497 * sinA,
      0.299 - 0.299 * cosA - 0.328 * sinA, 0.587 + 0.413 * cosA + 0.035 * sinA, 0.114 - 0.114 * cosA + 0.292 * sinA,
      0.299 - 0.300 * cosA + 1.250 * sinA, 0.587 - 0.588 * cosA - 1.050 * sinA, 0.114 + 0.886 * cosA - 0.203 * sinA,
    ];
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] === 0) continue;
      const r = p[i], g = p[i + 1], b = p[i + 2];
      p[i] = m[0] * r + m[1] * g + m[2] * b;
      p[i + 1] = m[3] * r + m[4] * g + m[5] * b;
      p[i + 2] = m[6] * r + m[7] * g + m[8] * b;
    }
    c.putImageData(im, 0, 0);
    d.touch();
  }

  blur(id) {
    const d = this.get(id);
    const c = d.ctx();
    const w = d.w, h = d.h;
    const im = c.getImageData(0, 0, w, h);
    const src = im.data;
    const out = new Uint8ClampedArray(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, a = 0, n = 0;
        for (let yy = -1; yy <= 1; yy++) {
          const sy = y + yy;
          if (sy < 0 || sy >= h) continue;
          for (let xx = -1; xx <= 1; xx++) {
            const sx = x + xx;
            if (sx < 0 || sx >= w) continue;
            const i = (sy * w + sx) * 4;
            r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3]; n++;
          }
        }
        const o = (y * w + x) * 4;
        out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = a / n;
      }
    }
    c.putImageData(new ImageData(out, w, h), 0, 0);
    d.touch();
  }

  radialBlur(id, angle, division) {
    const d = this.get(id);
    const c = d.ctx();
    division = Math.max(2, Math.min(100, division | 0));
    const copy = document.createElement("canvas");
    copy.width = d.w; copy.height = d.h;
    copy.getContext("2d").drawImage(d.canvas, 0, 0);
    c.clearRect(0, 0, d.w, d.h);
    const cx = d.w / 2, cy = d.h / 2;
    for (let i = 0; i < division; i++) {
      const a = ((i / (division - 1) - 0.5) * angle * Math.PI) / 180;
      c.save();
      c.globalAlpha = 1 / (i + 1);
      c.translate(cx, cy);
      c.rotate(a);
      c.drawImage(copy, -cx, -cy);
      c.restore();
    }
    copy.width = 0;
    d.touch();
  }

  // fontSpec: "name1|name2;size;bold;italic;outline;shadow;r,g,b,a;r,g,b,a"
  parseFont(spec) {
    const p = spec.split(";");
    const names = p[0] ? p[0].split("|").filter((x) => x) : [];
    const fam = names.map((n) => '"' + n.replace(/"/g, "") + '"').concat(FALLBACK_FONTS).join(",");
    const size = Math.max(1, parseInt(p[1], 10) || 24);
    const bold = p[2] === "1", italic = p[3] === "1";
    return {
      css: `${italic ? "italic " : ""}${bold ? "bold " : ""}${size}px ${fam}`,
      size,
      outline: p[4] === "1",
      shadow: p[5] === "1",
      color: p[6].split(",").map(Number),
      out: p[7].split(",").map(Number),
    };
  }

  textSize(spec, text) {
    const f = this.parseFont(spec);
    this.measureCtx.font = f.css;
    return Math.ceil(this.measureCtx.measureText(text).width);
  }

  drawText(id, x, y, w, h, text, align, spec) {
    const d = this.get(id);
    const c = d.ctx();
    const f = this.parseFont(spec);
    c.font = f.css;
    const m = c.measureText(text);
    const tw = m.width;
    if (tw <= 0) return;
    const asc = m.fontBoundingBoxAscent ?? f.size * 0.88;
    const desc = m.fontBoundingBoxDescent ?? f.size * 0.12;
    let sx = 1;
    if (w > 0 && tw > w) sx = Math.max(0.4, w / tw);
    const drawn = tw * sx;
    let tx = x;
    if (align === 1) tx = x + (w - drawn) / 2;
    else if (align === 2) tx = x + w - drawn;
    const by = Math.round(y + (h - (asc + desc)) / 2 + asc);
    c.save();
    c.translate(tx, by);
    if (sx !== 1) c.scale(sx, 1);
    c.textBaseline = "alphabetic";
    if (f.shadow) {
      c.fillStyle = rgba(0, 0, 0, f.color[3]);
      c.fillText(text, 1, 1);
    }
    if (f.outline) {
      c.strokeStyle = rgba(f.out[0], f.out[1], f.out[2], f.out[3]);
      c.lineWidth = 2;
      c.lineJoin = "round";
      c.strokeText(text, 0, 0);
    }
    c.fillStyle = rgba(f.color[0], f.color[1], f.color[2], f.color[3]);
    c.fillText(text, 0, 0);
    c.restore();
    d.touch();
  }

  // ---- fonts shipped with the game (Fonts/*.ttf, *.otf) -------------------
  async loadFont(path) {
    try {
      const res = await fetch(this.host.gameURL(path));
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      const names = fontFamilyNames(buf);
      if (names.length === 0) names.push(path.split("/").pop().replace(/\.[^.]+$/, ""));
      for (const name of names) {
        if (this.fontFamilies.has(name)) continue;
        const ff = new FontFace(name, buf);
        await ff.load();
        document.fonts.add(ff);
        this.fontFamilies.add(name);
      }
    } catch (e) {
      console.warn("font load failed", path, e);
    }
  }

  fontExists(name) {
    if (this.fontFamilies.has(name)) return true;
    try { return document.fonts.check(`12px "${name}"`); } catch (e) { return false; }
  }
}

// Parse the "name" table of a TrueType/OpenType font for family names.
export function fontFamilyNames(buf) {
  const out = new Set();
  try {
    const dv = new DataView(buf);
    let off = 0;
    const tag = dv.getUint32(0);
    if (tag === 0x74746366) off = dv.getUint32(12); // 'ttcf' -> first font
    const numTables = dv.getUint16(off + 4);
    let nameOff = -1;
    for (let i = 0; i < numTables; i++) {
      const rec = off + 12 + i * 16;
      if (dv.getUint32(rec) === 0x6e616d65) nameOff = dv.getUint32(rec + 8);
    }
    if (nameOff < 0) return [];
    const count = dv.getUint16(nameOff + 2);
    const strOff = nameOff + dv.getUint16(nameOff + 4);
    for (let i = 0; i < count; i++) {
      const r = nameOff + 6 + i * 12;
      const platform = dv.getUint16(r), enc = dv.getUint16(r + 2);
      const nameId = dv.getUint16(r + 6), len = dv.getUint16(r + 8), o = dv.getUint16(r + 10);
      if (nameId !== 1 && nameId !== 4) continue;
      let s = "";
      if (platform === 3 || platform === 0) {
        for (let k = 0; k < len; k += 2) s += String.fromCharCode(dv.getUint16(strOff + o + k));
      } else if (platform === 1 && enc === 0) {
        for (let k = 0; k < len; k++) s += String.fromCharCode(dv.getUint8(strOff + o + k));
      } else continue;
      if (s && nameId === 1) out.add(s);
    }
  } catch (e) { /* ignore */ }
  return [...out];
}
