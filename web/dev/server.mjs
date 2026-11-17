// Development server: emulates the iOS host so the runtime can be tested in a desktop browser.
//   node dev/server.mjs <game-folder> [port]
// Serves the built runtime at / and the game at /game/ (case-insensitive, extension search,
// .rgss2a/.rgss3a archives), writes saves back into the game folder.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GameFS } from "./gamefs.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const runtimeDir = process.env.TKR_OUT || path.join(here, "..", "..", "ios", "TukuruPlayer", "WebRuntime");
const gameDir = path.resolve(process.argv[2] || path.join(here, "testgame"));
const port = Number(process.argv[3] || 8765);
const rtpDirs = (process.env.TKR_RTP || "").split(path.delimiter).filter(Boolean);
const gfs = new GameFS(gameDir, rtpDirs);

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".wasm": "application/wasm",
  ".png": "image/png", ".jpg": "image/jpeg", ".bmp": "image/bmp", ".json": "application/json",
  ".ogg": "audio/ogg", ".ttf": "font/ttf", ".otf": "font/otf",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    let p = decodeURIComponent(url.pathname);
    if (req.method === "POST" && p === "/api/msg") {
      let body = "";
      for await (const c of req) body += c;
      const msg = JSON.parse(body);
      handleMsg(msg);
      res.writeHead(204).end();
      return;
    }
    if (p.startsWith("/game/")) {
      const rel = p.slice(6);
      if (rel === "__boot.json") {
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(gfs.bootInfo()));
        return;
      }
      const data = gfs.read(rel);
      if (!data) { res.writeHead(404).end(); return; }
      res.writeHead(200, { "Content-Type": MIME[path.extname(data.name).toLowerCase()] || "application/octet-stream" });
      res.end(data.bytes);
      return;
    }
    if (p === "/") p = "/index.html";
    const f = path.join(runtimeDir, path.normalize(p));
    if (!f.startsWith(runtimeDir) || !fs.existsSync(f)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  } catch (e) {
    console.error(e);
    res.writeHead(500).end(String(e));
  }
});

function handleMsg(msg) {
  switch (msg.type) {
    case "log": console.log(`[game:${msg.level}] ${msg.text}`); break;
    case "save": gfs.writeSave(msg.path, Buffer.from(msg.data, "base64")); console.log("[save]", msg.path); break;
    case "delete": gfs.deleteSave(msg.path); console.log("[delete]", msg.path); break;
    case "audio": console.log("[audio]", msg.op, JSON.stringify(msg.args)); break;
    default: console.log("[msg]", JSON.stringify(msg).slice(0, 500));
  }
}

server.listen(port, () => console.log(`TukuruPlayer dev server: http://localhost:${port}/  game=${gameDir}`));
