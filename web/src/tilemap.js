// RPG Maker VX / VX Ace tilemap (autotiles A1-A4, A5, B-E).

const A1 = 2048, A2 = 2816, A3 = 4352, A4 = 5888, A5 = 1536, MAX = 8192;

const FLOOR = [
  [[2,4],[1,4],[2,3],[1,3]],[[2,0],[1,4],[2,3],[1,3]],[[2,4],[3,0],[2,3],[1,3]],[[2,0],[3,0],[2,3],[1,3]],
  [[2,4],[1,4],[2,3],[3,1]],[[2,0],[1,4],[2,3],[3,1]],[[2,4],[3,0],[2,3],[3,1]],[[2,0],[3,0],[2,3],[3,1]],
  [[2,4],[1,4],[2,1],[1,3]],[[2,0],[1,4],[2,1],[1,3]],[[2,4],[3,0],[2,1],[1,3]],[[2,0],[3,0],[2,1],[1,3]],
  [[2,4],[1,4],[2,1],[3,1]],[[2,0],[1,4],[2,1],[3,1]],[[2,4],[3,0],[2,1],[3,1]],[[2,0],[3,0],[2,1],[3,1]],
  [[0,4],[1,4],[0,3],[1,3]],[[0,4],[3,0],[0,3],[1,3]],[[0,4],[1,4],[0,3],[3,1]],[[0,4],[3,0],[0,3],[3,1]],
  [[2,2],[1,2],[2,3],[1,3]],[[2,2],[1,2],[2,3],[3,1]],[[2,2],[1,2],[2,1],[1,3]],[[2,2],[1,2],[2,1],[3,1]],
  [[2,4],[3,4],[2,3],[3,3]],[[2,4],[3,4],[2,1],[3,3]],[[2,0],[3,4],[2,3],[3,3]],[[2,0],[3,4],[2,1],[3,3]],
  [[2,4],[1,4],[2,5],[1,5]],[[2,0],[1,4],[2,5],[1,5]],[[2,4],[3,0],[2,5],[1,5]],[[2,0],[3,0],[2,5],[1,5]],
  [[0,4],[3,4],[0,3],[3,3]],[[2,2],[1,2],[2,5],[1,5]],[[0,2],[1,2],[0,3],[1,3]],[[0,2],[1,2],[0,3],[3,1]],
  [[2,2],[3,2],[2,3],[3,3]],[[2,2],[3,2],[2,1],[3,3]],[[2,4],[3,4],[2,5],[3,5]],[[2,0],[3,4],[2,5],[3,5]],
  [[0,4],[1,4],[0,5],[1,5]],[[0,4],[3,0],[0,5],[1,5]],[[0,2],[3,2],[0,3],[3,3]],[[0,2],[1,2],[0,5],[1,5]],
  [[0,4],[3,4],[0,5],[3,5]],[[2,2],[3,2],[2,5],[3,5]],[[0,2],[3,2],[0,5],[3,5]],[[0,0],[1,0],[0,1],[1,1]],
];

const WALL = [
  [[2,2],[1,2],[2,1],[1,1]],[[0,2],[1,2],[0,1],[1,1]],[[2,0],[1,0],[2,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],
  [[2,2],[3,2],[2,1],[3,1]],[[0,2],[3,2],[0,1],[3,1]],[[2,0],[3,0],[2,1],[3,1]],[[0,0],[3,0],[0,1],[3,1]],
  [[2,2],[1,2],[2,3],[1,3]],[[0,2],[1,2],[0,3],[1,3]],[[2,0],[1,0],[2,3],[1,3]],[[0,0],[1,0],[0,3],[1,3]],
  [[2,2],[3,2],[2,3],[3,3]],[[0,2],[3,2],[0,3],[3,3]],[[2,0],[3,0],[2,3],[3,3]],[[0,0],[3,0],[0,3],[3,3]],
];

const WATERFALL = [
  [[2,0],[1,0],[2,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[2,0],[3,0],[2,1],[3,1]],[[0,0],[3,0],[0,1],[3,1]],
];

const TS = 32, H = 16;

export class TileBuilder {
  // out: Map(setNumber -> array of numbers [dx,dy,w,h,sx,sy,sw,sh,...])
  constructor() { this.passes = []; }

  static isAuto(id) { return id >= A1; }

  // Emit quads for one tile into the pass bucket.
  emit(bucket, set, sx, sy, sw, sh, dx, dy, dw, dh) {
    let arr = bucket.get(set);
    if (!arr) { arr = []; bucket.set(set, arr); }
    arr.push(dx, dy, dw, dh, sx, sy, sw, sh);
  }

  drawTile(bucket, id, dx, dy, frame, flags) {
    if (id <= 0 || id >= MAX) return;
    if (id >= A1) this.drawAutotile(bucket, id, dx, dy, frame, flags);
    else this.drawNormal(bucket, id, dx, dy);
  }

  drawNormal(bucket, id, dx, dy) {
    let set;
    if (id >= A5 && id < A5 + 128) set = 4;
    else if (id < 1024) set = 5 + Math.floor(id / 256);
    else return;
    const sx = ((Math.floor(id / 128) % 2) * 8 + (id % 8)) * TS;
    const sy = (Math.floor((id % 256) / 8) % 16) * TS;
    this.emit(bucket, set, sx, sy, TS, TS, dx, dy, TS, TS);
  }

  drawAutotile(bucket, id, dx, dy, frame, flags) {
    let table = FLOOR;
    const kind = Math.floor((id - A1) / 48);
    const shape = (id - A1) % 48;
    const tx = kind % 8;
    const ty = Math.floor(kind / 8);
    let bx = 0, by = 0, set = 0, isTable = false;
    if (id < A2) {
      const wi = [0, 1, 2, 1][frame % 4];
      set = 0;
      if (kind === 0) { bx = wi * 2; by = 0; }
      else if (kind === 1) { bx = wi * 2; by = 3; }
      else if (kind === 2) { bx = 6; by = 0; }
      else if (kind === 3) { bx = 6; by = 3; }
      else {
        bx = Math.floor(tx / 4) * 8;
        by = ty * 6 + (Math.floor(tx / 2) % 2) * 3;
        if (kind % 2 === 0) bx += wi * 2;
        else { bx += 6; table = WATERFALL; by += frame % 3; }
      }
    } else if (id < A3) {
      set = 1; bx = tx * 2; by = (ty - 2) * 3;
      isTable = flags ? (flags[id] & 0x80) !== 0 : false;
    } else if (id < A4) {
      set = 2; bx = tx * 2; by = (ty - 6) * 2; table = WALL;
    } else {
      set = 3; bx = tx * 2;
      by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0));
      if (ty % 2 === 1) table = WALL;
    }
    const t = table[shape];
    if (!t) return;
    for (let i = 0; i < 4; i++) {
      const qsx = t[i][0], qsy = t[i][1];
      const sx1 = (bx * 2 + qsx) * H, sy1 = (by * 2 + qsy) * H;
      const dx1 = dx + (i % 2) * H;
      let dy1 = dy + Math.floor(i / 2) * H;
      if (isTable && (qsy === 1 || qsy === 5)) {
        let qsx2 = qsx;
        const qsy2 = 3;
        if (qsy === 1) qsx2 = [0, 3, 2, 1][qsx];
        this.emit(bucket, set, (bx * 2 + qsx2) * H, (by * 2 + qsy2) * H, H, H, dx1, dy1, H, H);
        dy1 += H / 2;
        this.emit(bucket, set, sx1, sy1, H, H / 2, dx1, dy1, H, H / 2);
      } else {
        this.emit(bucket, set, sx1, sy1, H, H, dx1, dy1, H, H);
      }
    }
  }

  drawTableEdge(bucket, id, dx, dy) {
    if (!(id >= A2 && id < A3)) return;
    const kind = Math.floor((id - A1) / 48);
    const shape = (id - A1) % 48;
    const tx = kind % 8, ty = Math.floor(kind / 8);
    const bx = tx * 2, by = (ty - 2) * 3;
    const t = FLOOR[shape];
    for (let i = 0; i < 2; i++) {
      const qsx = t[2 + i][0], qsy = t[2 + i][1];
      this.emit(bucket, 1, (bx * 2 + qsx) * H, (by * 2 + qsy) * H + H / 2, H, H / 2, dx + i * H, dy, H, H / 2);
    }
  }

  // Build passes for a viewport region.
  // map: {data: Int16Array, xs, ys, zs}; flags: Int16Array|null
  build(map, flags, ox, oy, vw, vh, anim) {
    const lower = [new Map(), new Map(), [], new Map()]; // L0, L1, shadows, L2
    const upper = new Map();
    if (!map) return { lower, upper };
    const { data, xs, ys, zs } = map;
    if (xs <= 0 || ys <= 0) return { lower, upper };
    const frame = Math.floor(anim / 30);
    const tx0 = Math.floor(ox / TS), ty0 = Math.floor(oy / TS);
    const tx1 = Math.floor((ox + vw - 1) / TS), ty1 = Math.floor((oy + vh - 1) / TS);
    const plane = xs * ys;
    const isTable = (id) => id >= A2 && id < A3 && flags && (flags[id] & 0x80) !== 0;
    const higher = (id) => flags && id > 0 && id < flags.length && (flags[id] & 0x10) !== 0;
    for (let ty = ty0; ty <= ty1; ty++) {
      const my = ((ty % ys) + ys) % ys;
      const myUp = (((ty - 1) % ys) + ys) % ys;
      const dy = ty * TS - oy;
      for (let tx = tx0; tx <= tx1; tx++) {
        const mx = ((tx % xs) + xs) % xs;
        const dx = tx * TS - ox;
        const base = my * xs + mx;
        const t0 = data[base];
        const t1 = zs > 1 ? data[base + plane] : 0;
        const t2 = zs > 2 ? data[base + plane * 2] : 0;
        const t3 = zs > 3 ? data[base + plane * 3] : 0;
        if (t0 > 0) this.drawTile(higher(t0) ? upper : lower[0], t0, dx, dy, frame, flags);
        if (t1 > 0) this.drawTile(higher(t1) ? upper : lower[1], t1, dx, dy, frame, flags);
        const shadow = t3 & 0x0f;
        if (shadow) lower[2].push(dx, dy, shadow);
        if (zs > 1) {
          const up1 = data[myUp * xs + mx + plane];
          if (isTable(up1) && !isTable(t1) && !(t0 >= A3 && t0 < MAX)) {
            this.drawTableEdge(lower[1], up1, dx, dy);
          }
        }
        if (t2 > 0) this.drawTile(higher(t2) ? upper : lower[3], t2, dx, dy, frame, flags);
      }
    }
    return { lower, upper };
  }
}
