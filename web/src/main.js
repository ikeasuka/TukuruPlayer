// TukuruPlayer web runtime entry point.
import { RubyVM } from "@ruby/wasm-wasi";
import { WASI, File, Directory, PreopenDirectory, OpenFile, ConsoleStdout } from "@bjorn3/browser_wasi_shim";
import RB_SOURCES from "./rgss_sources.gen.js";
import { Host } from "./host.js";
import { Renderer } from "./gl.js";
import { BitmapStore } from "./bitmap.js";
import { SceneDrawer } from "./scene.js";
import { Input } from "./input.js";

const $ = (id) => document.getElementById(id);

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes) {
  let s = "";
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(s);
}

// ---------------------------------------------------------------------------
// Overlay (errors / msgbox)
const Overlay = {
  resolve: null,
  show(title, body, hint) {
    $("ov-title").textContent = title;
    $("ov-body").textContent = body;
    $("ov-hint").textContent = hint || "";
    $("overlay").style.display = "flex";
  },
  hide() { $("overlay").style.display = "none"; },
  // Wait for confirm (tap / any key / pad button) then hide.
  wait(input) {
    return new Promise((resolve) => {
      let armed = false;
      setTimeout(() => { armed = true; }, 250);
      const done = () => {
        if (!armed) return;
        $("overlay").removeEventListener("pointerup", done);
        input.onAnyKey = null;
        this.hide();
        resolve();
      };
      $("overlay").addEventListener("pointerup", done);
      input.onAnyKey = done;
    });
  },
};

// ---------------------------------------------------------------------------
// Virtual filesystem for Ruby (WASI). /game mirrors the game folder; files that
// are not preloaded exist as empty placeholders so FileTest.exist? works.
function buildGameDir(files, preload) {
  const root = new Map();
  const dirFor = (parts) => {
    let m = root;
    for (const p of parts) {
      let e = m.get(p);
      if (!(e instanceof Directory)) { e = new Directory(new Map()); m.set(p, e); }
      m = e.contents;
    }
    return m;
  };
  for (const f of files) {
    const parts = f.split("/").filter((x) => x);
    const name = parts.pop();
    if (!name) continue;
    const d = dirFor(parts);
    if (!d.has(name)) d.set(name, new File(new Uint8Array(0)));
  }
  for (const [f, b64] of Object.entries(preload || {})) {
    const parts = f.split("/").filter((x) => x);
    const name = parts.pop();
    dirFor(parts).set(name, new File(b64ToBytes(b64)));
  }
  return root;
}

function lookup(rootMap, path) {
  const parts = Host.normalize(path).split("/").filter((x) => x && x !== ".");
  let m = rootMap;
  for (let i = 0; i < parts.length; i++) {
    const e = m.get(parts[i]);
    if (!e) return null;
    if (i === parts.length - 1) return e;
    if (!(e instanceof Directory)) return null;
    m = e.contents;
  }
  return null;
}

// ---------------------------------------------------------------------------
window.addEventListener("error", (e) => Host.log("error", "JS error: " + (e.message || e) + " @" + (e.filename || "") + ":" + (e.lineno || "")));
window.addEventListener("unhandledrejection", (e) => Host.log("error", "Unhandled rejection: " + ((e.reason && e.reason.stack) || e.reason)));

async function main() {
  const loading = $("loading");
  Host.stage("page loaded");
  const boot = await (await fetch(Host.gameURL("__boot.json"))).json();
  Host.stage(`boot info: engine=${boot.engine} files=${(boot.files || []).length} preload=${Object.keys(boot.preload || {}).length}`);
  const engine = boot.engine === 2 ? 2 : 3;
  const settings = boot.settings || {};
  document.title = boot.title || "TukuruPlayer";

  const canvas = $("screen");
  const renderer = new Renderer(canvas, 544, 416);
  const bitmaps = new BitmapStore(Host, renderer);
  const scene = new SceneDrawer(renderer, bitmaps);
  const input = new Input();
  canvas.addEventListener("webglcontextlost", () => Host.log("error", "WebGL context lost (GPU process restarted?)"));
  canvas.addEventListener("webglcontextrestored", () => Host.log("error", "WebGL context restored"));

  // ---- layout ---------------------------------------------------------------
  const layout = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const gw = renderer.width, gh = renderer.height;
    let s = Math.min(vw / gw, vh / gh);
    if (settings.scale === "integer" && s >= 1) s = Math.floor(s);
    canvas.style.width = Math.floor(gw * s) + "px";
    canvas.style.height = Math.floor(gh * s) + "px";
    const portrait = vh > vw;
    $("stage").style.alignItems = portrait && settings.portraitTop !== false ? "flex-start" : "center";
    $("stage").style.paddingTop = portrait ? "env(safe-area-inset-top)" : "0";
  };
  if (!settings.smooth) canvas.classList.add("pixelated");
  window.addEventListener("resize", layout);
  layout();
  if (settings.showFPS) $("fps").style.display = "block";

  // ---- fonts shipped with the game -------------------------------------------
  const fontFiles = (boot.files || []).filter((f) => /^fonts\/.+\.(ttf|otf|ttc)$/i.test(f));
  Host.stage(`fonts: ${fontFiles.length}`);
  await Promise.all(fontFiles.map((f) => bitmaps.loadFont(f)));

  // ---- frame pacing -------------------------------------------------------------
  let paused = false;
  let resetRequested = false;
  let frameWaiter = null;
  let lastFrame = performance.now();
  let frameRate = 60;
  let fpsCount = 0, fpsTime = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    if (!frameWaiter || paused) return;
    const interval = 1000 / frameRate;
    const elapsed = now - lastFrame;
    if (elapsed < interval - 1.5) return;
    lastFrame = elapsed > interval * 3 ? now : lastFrame + interval;
    const w = frameWaiter;
    frameWaiter = null;
    w();
    fpsCount++;
    if (now - fpsTime >= 1000) {
      $("fps").textContent = fpsCount + " fps";
      fpsCount = 0; fpsTime = now;
    }
  };
  requestAnimationFrame(tick);
  input.onReset = () => { resetRequested = true; };

  // ---- WASI / Ruby VM -----------------------------------------------------------
  const gameRoot = buildGameDir(boot.files || [], boot.preload || {});
  // case-insensitive lookup table and set of not-yet-loaded placeholder files
  const ciIndex = new Map();
  const placeholders = new Set();
  for (const f of boot.files || []) { ciIndex.set(f.toLowerCase(), f); placeholders.add(f); }
  for (const f of Object.keys(boot.preload || {})) { ciIndex.set(f.toLowerCase(), f); placeholders.delete(f); }

  // Replace a placeholder with the real file contents.
  const loadPlaceholder = async (path) => {
    if (!placeholders.has(path)) return true;
    const res = await fetch(Host.gameURL(path));
    if (!res.ok) return false;
    const buf = new Uint8Array(await res.arrayBuffer());
    const parts = path.split("/");
    const name = parts.pop();
    const parent = parts.length ? lookup(gameRoot, parts.join("/")) : null;
    const dir = parent ? parent.contents : gameRoot;
    dir.set(name, new File(buf));
    placeholders.delete(path);
    return true;
  };

  // Load every non-media file up front (Data/, custom data, text…). Games with their own
  // data decryption read files with arbitrary Ruby APIs, which would otherwise see the
  // empty placeholder ("marshal data too short").
  const MEDIA = /\.(png|jpe?g|bmp|gif|ogg|wav|mp3|m4a|mid|midi|wma|aac|ogv|mp4|avi|wmv|mpg|ttf|otf|ttc|rgss3a|rgss2a|rgssad|exe|dll|lnk|ico)$/i;
  const eager = [...placeholders].filter((f) => !MEDIA.test(f) && !/^(graphics|audio|movies|fonts|system)\//i.test(f));
  if (eager.length) {
    loading.textContent = `データを読み込み中… (${eager.length})`;
    Host.stage(`preloading ${eager.length} data files`);
    let next = 0;
    const worker = async () => {
      while (next < eager.length) {
        const f = eager[next++];
        try { await loadPlaceholder(f); } catch (e) { Host.log("error", `preload failed: ${f}: ${e}`); }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
  }
  const tmpRoot = new Map();
  const stdout = ConsoleStdout.lineBuffered((l) => Host.log("info", l));
  const stderr = ConsoleStdout.lineBuffered((l) => Host.log("error", l));
  const wasi = new WASI([], ["RUBYOPT=", "HOME=/game"], [
    new OpenFile(new File([])), stdout, stderr,
    new PreopenDirectory("/game", gameRoot),
    new PreopenDirectory("/tkrtmp", tmpRoot),
  ], { debug: false });

  loading.textContent = "Ruby を起動中…";
  Host.stage("compiling ruby.wasm");
  let module;
  try {
    module = await WebAssembly.compileStreaming(fetch("ruby.wasm"));
  } catch (e) {
    const buf = await (await fetch("ruby.wasm")).arrayBuffer();
    module = await WebAssembly.compile(buf);
  }
  const { vm, instance } = await RubyVM.instantiateModule({
    module, wasip1: wasi,
    args: ["ruby.wasm", "--disable-gems", "-W0", "-EUTF-8", "-e_=0"],
  });
  Host.stage("ruby vm ready");
  const wasmMemory = instance ? instance.exports.memory : null;
  const memMB = () => {
    try { return wasmMemory ? Math.round(wasmMemory.buffer.byteLength / 1048576) : -1; } catch (e) { return -1; }
  };
  let frameNo = 0;

  // ---- API exposed to Ruby ----------------------------------------------------------
  const audio = (op, ...args) => Host.post({ type: "audio", op, args });
  let bgmPos = 0;
  let pendingMsg = null;

  window.TKR = {
    engine,
    title: boot.title || "",
    // bitmaps
    bmpCreate: (w, h) => bitmaps.create(w, h),
    bmpLoad: (path) => bitmaps.load(path),
    bmpW: (id) => bitmaps.width(id),
    bmpH: (id) => bitmaps.height(id),
    bmpDispose: (id) => bitmaps.dispose(id),
    bmpDup: (id) => bitmaps.dup(id),
    bmpBlt: (d, x, y, s, sx, sy, sw, sh, op) => bitmaps.blt(d, x, y, s, sx, sy, sw, sh, op),
    bmpStretch: (d, dx, dy, dw, dh, s, sx, sy, sw, sh, op) => bitmaps.stretchBlt(d, dx, dy, dw, dh, s, sx, sy, sw, sh, op),
    bmpFill: (id, x, y, w, h, r, g, b, a) => bitmaps.fill(id, x, y, w, h, r, g, b, a),
    bmpGrad: (id, x, y, w, h, r1, g1, b1, a1, r2, g2, b2, a2, v) => bitmaps.gradient(id, x, y, w, h, r1, g1, b1, a1, r2, g2, b2, a2, v),
    bmpClear: (id) => bitmaps.clear(id),
    bmpClearRect: (id, x, y, w, h) => bitmaps.clearRect(id, x, y, w, h),
    bmpGetPixel: (id, x, y) => bitmaps.getPixel(id, x, y),
    bmpSetPixel: (id, x, y, r, g, b, a) => bitmaps.setPixel(id, x, y, r, g, b, a),
    bmpHue: (id, h) => bitmaps.hueChange(id, h),
    bmpBlur: (id) => bitmaps.blur(id),
    bmpRadialBlur: (id, a, d) => bitmaps.radialBlur(id, a, d),
    bmpDrawText: (id, x, y, w, h, s, align, font) => bitmaps.drawText(id, x, y, w, h, s, align, font),
    textSize: (font, s) => bitmaps.textSize(font, s),
    bitmapMB: () => bitmaps.memoryMB(),
    bitmapCount: () => bitmaps.map.size,
    fontExists: (name) => (bitmaps.fontExists(name) ? 1 : 0),
    // tables (tilemap data)
    tableUpload: (id, b64, xs, ys, zs) => scene.uploadTable(id, b64, xs, ys, zs),
    tableFree: (id) => scene.freeTable(id),
    // graphics
    render: (list) => {
      scene.render(list);
      renderer.present();
      frameNo++;
      if (frameNo === 1 || frameNo % 120 === 0) {
        Host.stage(`frame ${frameNo}: wasm ${memMB()}MB, bitmaps ${bitmaps.map.size} (${bitmaps.memoryMB()}MB), ${renderer.width}x${renderer.height}`);
      }
    },
    frame: () => new Promise((resolve) => {
      if (resetRequested) { resetRequested = false; resolve("reset"); return; }
      frameWaiter = () => {
        if (resetRequested) { resetRequested = false; resolve("reset"); return; }
        resolve("");
      };
    }),
    setFrameRate: (r) => { frameRate = Math.max(10, Math.min(120, r)); },
    freeze: (list) => { scene.render(list); renderer.freeze(); },
    unfreeze: () => { renderer.frozen = false; renderer.transition = null; },
    transitionStep: (list, prog, maskId, vague) => {
      let maskTex = null;
      if (maskId) {
        const b = bitmaps.map.get(maskId);
        if (b) maskTex = renderer.texFor(b);
      }
      renderer.transition = { prog, maskTex, vague: vague / 255 };
      scene.render(list);
      renderer.present();
    },
    snap: (list) => {
      scene.render(list);
      const px = renderer.snapshotPixels();
      return bitmaps.fromPixels(renderer.width, renderer.height, px);
    },
    resize: (w, h) => {
      if (w === renderer.width && h === renderer.height) return;
      renderer.resize(w, h);
      layout();
      Host.stage(`resize_screen ${w}x${h}`);
      Host.post({ type: "resolution", w, h });
    },
    // input
    inputUpdate: () => input.update(),
    // audio (played natively)
    audio,
    bgmPos: () => bgmPos,
    // filesystem
    loadData: async (path) => {
      const res = await fetch(Host.gameURL(path));
      if (!res.ok) throw new Error("Unable to find file: " + path);
      const buf = new Uint8Array(await res.arrayBuffer());
      tmpRoot.set("load.bin", new File(buf));
      return "/tkrtmp/load.bin";
    },
    syncFile: (path) => {
      const e = lookup(gameRoot, path);
      if (!e || !(e instanceof File)) return false;
      Host.post({ type: "save", path: Host.normalize(path), data: bytesToB64(e.data) });
      return true;
    },
    deleteFile: (path) => { Host.post({ type: "delete", path: Host.normalize(path) }); },
    fsResolve: (path) => {
      const n = Host.normalize(path);
      if (lookup(gameRoot, n)) return n;
      return ciIndex.get(n.toLowerCase()) || "";
    },
    isPlaceholder: (path) => (placeholders.has(path) ? 1 : 0),
    materialize: (path) => loadPlaceholder(path),
    // misc
    log: (s) => Host.log("info", s),
    msgbox: async (text) => {
      Overlay.show(boot.title || "", text, "タップ / ボタンで閉じる");
      await Overlay.wait(input);
    },
    exit: () => Host.post({ type: "exit" }),
    error: (title, text) => {
      Host.log("error", title + "\n" + text);
      Overlay.show(title, text, "");
      Host.post({ type: "error", title, text });
    },
    ready: () => { loading.style.display = "none"; Host.post({ type: "ready" }); },
    stage: (name) => Host.stage(name),
  };

  // ---- callbacks from native ---------------------------------------------------------
  window.TKRNative = {
    input: (mask) => input.setNative(mask),
    bgmPos: (pos) => { bgmPos = pos; },
    pause: (p) => { paused = !!p; if (!p) lastFrame = performance.now(); },
    reset: () => { resetRequested = true; },
    settings: (s) => {
      Object.assign(settings, s);
      canvas.classList.toggle("pixelated", !settings.smooth);
      $("fps").style.display = settings.showFPS ? "block" : "none";
      layout();
    },
  };
  void pendingMsg;

  // ---- load the RGSS implementation and run the game -----------------------------
  loading.textContent = "ゲームを読み込み中…";
  Host.stage("loading RGSS runtime");
  vm.eval(`$TKR_ENGINE = ${engine}`);
  for (const name of Object.keys(RB_SOURCES).sort()) {
    if (engine === 3 && name.startsWith("rpg2")) continue;
    if (engine === 2 && name.startsWith("rpg3")) continue;
    try {
      vm.eval(RB_SOURCES[name]);
    } catch (e) {
      window.TKR.error("Runtime load error: " + name, String(e.message || e));
      return;
    }
  }
  Host.stage(`runtime loaded (wasm ${memMB()}MB)`);
  try {
    await vm.evalAsync("TKRBoot.run");
  } catch (e) {
    window.TKR.error("Fatal error", String(e.message || e));
  }
}

main().catch((e) => {
  console.error(e);
  const ov = document.getElementById("overlay");
  document.getElementById("ov-title").textContent = "起動エラー";
  document.getElementById("ov-body").textContent = String((e && e.stack) || e);
  ov.style.display = "flex";
  Host.post({ type: "error", title: "起動エラー", text: String(e) });
});
