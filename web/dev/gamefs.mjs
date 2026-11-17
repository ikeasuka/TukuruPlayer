// Game virtual filesystem for the dev server. Mirrors ios/TukuruPlayer/Player/GameFileSystem.swift.
import fs from "node:fs";
import path from "node:path";

const IMG_EXT = [".png", ".jpg", ".jpeg", ".bmp"];
const AUD_EXT = [".ogg", ".wav", ".mp3", ".m4a", ".mid", ".midi", ".aac", ".caf"];
const DATA_EXT = [".rvdata2", ".rvdata", ".rxdata"];
const FONT_EXT = [".ttf", ".otf", ".ttc"];
const ALL_EXT = [...IMG_EXT, ...AUD_EXT, ...DATA_EXT, ...FONT_EXT];

// ---- RGSSAD archive (v1: .rgssad/.rgss2a, v3: .rgss3a) -------------------------
export class RGSSArchive {
  constructor(file) {
    this.file = file;
    this.fd = fs.openSync(file, "r");
    this.entries = new Map(); // lower path -> {name, offset, size, key}
    const head = Buffer.alloc(8);
    fs.readSync(this.fd, head, 0, 8, 0);
    if (head.toString("latin1", 0, 6) !== "RGSSAD") throw new Error("not an RGSS archive");
    const ver = head[7];
    const size = fs.fstatSync(this.fd).size;
    if (ver === 1) this.readV1(size);
    else if (ver === 3) this.readV3();
    else throw new Error("unsupported archive version " + ver);
  }

  u32(pos) {
    const b = Buffer.alloc(4);
    if (fs.readSync(this.fd, b, 0, 4, pos) < 4) return null;
    return b.readUInt32LE(0);
  }

  readV1(size) {
    let key = 0xdeadcafe >>> 0;
    const adv = () => { const k = key; key = (Math.imul(key, 7) + 3) >>> 0; return k; };
    let pos = 8;
    while (pos + 4 <= size) {
      let nameLen = this.u32(pos); pos += 4;
      if (nameLen === null) break;
      nameLen = (nameLen ^ adv()) >>> 0;
      if (nameLen > 4096) break;
      const nb = Buffer.alloc(nameLen);
      fs.readSync(this.fd, nb, 0, nameLen, pos); pos += nameLen;
      for (let i = 0; i < nameLen; i++) nb[i] ^= adv() & 0xff;
      let sz = this.u32(pos); pos += 4;
      sz = (sz ^ adv()) >>> 0;
      const name = decodeName(nb);
      this.entries.set(name.toLowerCase(), { name, offset: pos, size: sz, key });
      pos += sz;
    }
  }

  readV3() {
    let base = this.u32(8);
    let key = (Math.imul(base, 9) + 3) >>> 0;
    let pos = 12;
    for (;;) {
      const off = (this.u32(pos) ^ key) >>> 0;
      if (off === 0) break;
      const sz = (this.u32(pos + 4) ^ key) >>> 0;
      const ek = (this.u32(pos + 8) ^ key) >>> 0;
      const nameLen = (this.u32(pos + 12) ^ key) >>> 0;
      pos += 16;
      const nb = Buffer.alloc(nameLen);
      fs.readSync(this.fd, nb, 0, nameLen, pos); pos += nameLen;
      for (let i = 0; i < nameLen; i++) nb[i] ^= (key >>> ((i % 4) * 8)) & 0xff;
      const name = decodeName(nb);
      this.entries.set(name.toLowerCase(), { name, offset: off, size: sz, key: ek });
    }
  }

  read(entry) {
    const b = Buffer.alloc(entry.size);
    fs.readSync(this.fd, b, 0, entry.size, entry.offset);
    let key = entry.key >>> 0;
    let i = 0;
    for (; i + 4 <= b.length; i += 4) {
      b.writeUInt32LE((b.readUInt32LE(i) ^ key) >>> 0, i);
      key = (Math.imul(key, 7) + 3) >>> 0;
    }
    for (let j = 0; i < b.length; i++, j++) b[i] ^= (key >>> (j * 8)) & 0xff;
    return b;
  }
}

function decodeName(buf) {
  let s;
  try { s = new TextDecoder("utf-8", { fatal: true }).decode(buf); }
  catch (e) { s = new TextDecoder("shift_jis").decode(buf); }
  return s.replace(/\\/g, "/");
}

// ---- Game filesystem -----------------------------------------------------------
export class GameFS {
  constructor(root, rtpDirs = []) {
    this.root = root;
    this.index = new Map(); // lower path -> {kind:'disk', file, name} | {kind:'arc', entry, name}
    this.rtp = new Map();
    this.archive = null;
    for (const a of ["Game.rgss3a", "Game.rgss2a", "Game.rgssad"]) {
      const f = findCI(root, a);
      if (f) { this.archive = new RGSSArchive(f); this.archiveName = a; break; }
    }
    if (this.archive) {
      for (const [k, e] of this.archive.entries) this.index.set(k, { kind: "arc", entry: e, name: e.name });
    }
    walk(root, "", (rel, file) => this.index.set(rel.toLowerCase(), { kind: "disk", file, name: rel }));
    for (const d of rtpDirs) walk(d, "", (rel, file) => {
      if (!this.rtp.has(rel.toLowerCase())) this.rtp.set(rel.toLowerCase(), { kind: "disk", file, name: rel });
    });
  }

  engine() {
    const has = (p) => this.index.has(p.toLowerCase());
    if (this.archiveName === "Game.rgss3a" || has("Data/Scripts.rvdata2")) return 3;
    if (this.archiveName === "Game.rgss2a" || has("Data/Scripts.rvdata")) return 2;
    if (this.archiveName === "Game.rgssad" || has("Data/Scripts.rxdata")) return 1;
    return 0;
  }

  resolve(rel) {
    const n = rel.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
    const tryKey = (k) => this.index.get(k) || this.rtp.get(k);
    let e = tryKey(n);
    if (e) return e;
    for (const ext of ALL_EXT) { e = tryKey(n + ext); if (e) return e; }
    return null;
  }

  read(rel) {
    const e = this.resolve(rel);
    if (!e) return null;
    const bytes = e.kind === "disk" ? fs.readFileSync(e.file) : this.archive.read(e.entry);
    return { name: e.name, bytes };
  }

  readText(rel) {
    const r = this.read(rel);
    if (!r) return "";
    try { return new TextDecoder("utf-8", { fatal: true }).decode(r.bytes); }
    catch (e) { return new TextDecoder("shift_jis").decode(r.bytes); }
  }

  bootInfo() {
    const files = [];
    const preload = {};
    for (const [, e] of this.index) files.push(e.name);
    for (const [k, e] of this.rtp) if (!this.index.has(k)) files.push(e.name);
    for (const [, e] of this.index) {
      if (e.kind !== "disk") continue;
      const lower = e.name.toLowerCase();
      const top = !e.name.includes("/");
      const isSave = /\.(rvdata2|rvdata|rxdata|sav|dat)$/.test(lower) && !lower.startsWith("data/");
      const small = /\.(ini|txt|json|csv)$/.test(lower);
      if ((top && (isSave || small)) || (isSave && fs.statSync(e.file).size < 8 * 1024 * 1024)) {
        preload[e.name] = fs.readFileSync(e.file).toString("base64");
      }
    }
    const ini = this.readText("Game.ini");
    const m = ini.match(/^\s*Title\s*=\s*(.*)$/im);
    return { engine: this.engine(), title: m ? m[1].trim() : path.basename(this.root), files, preload, settings: {} };
  }

  safePath(rel) {
    const p = path.join(this.root, path.normalize(rel));
    if (!p.startsWith(this.root)) throw new Error("bad path");
    return p;
  }

  writeSave(rel, bytes) {
    const p = this.safePath(rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, bytes);
    this.index.set(rel.toLowerCase(), { kind: "disk", file: p, name: rel });
  }

  deleteSave(rel) {
    const p = this.safePath(rel);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function walk(dir, prefix, cb) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const d of ents) {
    if (d.name.startsWith(".")) continue;
    const rel = prefix ? prefix + "/" + d.name : d.name;
    const full = path.join(dir, d.name);
    if (d.isDirectory()) walk(full, rel, cb);
    else cb(rel, full);
  }
}

function findCI(dir, name) {
  try {
    for (const f of fs.readdirSync(dir)) if (f.toLowerCase() === name.toLowerCase()) return path.join(dir, f);
  } catch (e) { /* ignore */ }
  return null;
}
