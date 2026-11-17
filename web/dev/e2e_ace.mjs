// Drives a VX Ace game built with make_acegame.py through a typical play session:
// title -> new game -> opening messages (faces, colors, choices) -> walk/talk -> menu ->
// save -> reset (F12) -> continue/load. Fails on runtime errors.
//   node dev/e2e_ace.mjs <game-dir> <screenshot-prefix>
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pw = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const game = process.argv[2];
const shot = process.argv[3] || path.join(here, "ace");
const port = 8767;
const browserName = process.env.TKR_BROWSER || "chromium";

const server = spawn(process.execPath, [path.join(here, "server.mjs"), game, String(port)], { stdio: ["ignore", "pipe", "inherit"] });
const serverLog = [];
server.stdout.on("data", (d) => serverLog.push(String(d)));
await new Promise((r) => setTimeout(r, 800));

const browser = browserName === "chromium"
  ? await pw.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
  : await pw[browserName].launch();
const page = await browser.newPage({ viewport: { width: 1088, height: 832 } });
const logs = [];
page.on("console", (m) => logs.push(m.text()));
page.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
page.on("crash", () => logs.push("PAGEERROR page crashed"));
await page.goto(`http://localhost:${port}/`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = async (k, n = 1, gap = 250) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(gap); } };
const hold = async (k, ms) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); };
let n = 0;
const snap = async (name) => page.screenshot({ path: `${shot}-${++n}-${name}.png` });
const overlay = async () => (await page.locator("#overlay").isVisible()) ? await page.locator("#overlay").innerText() : null;
const step = async (name, fn) => {
  console.log("STEP", name);
  await fn();
  const o = await overlay();
  if (o) { console.log("OVERLAY at", name, ":\n" + o); throw new Error("error overlay"); }
};

let failed = false;
try {
  await step("boot", async () => { for (let i = 0; i < 60 && !logs.some((l) => l.includes("frame 1:")); i++) await sleep(500); await sleep(2500); await snap("title"); });
  await step("new game", async () => { await key("Enter"); await sleep(3000); await snap("map"); });
  await step("opening messages", async () => {
    for (let i = 0; i < 8; i++) { await key("Enter", 1, 700); if (i === 1) await snap("message"); }
    await snap("after-messages");
  });
  await step("battle", async () => {
    await sleep(2500); await snap("battle-start");
    for (let i = 0; i < 30; i++) { await key("Enter", 1, 600); if (i === 4) await snap("battle"); }
    await sleep(1500); await snap("after-battle");
  });
  await step("walk + talk", async () => { await hold("ArrowRight", 600); await hold("ArrowDown", 300); await key("Enter", 4, 600); await snap("walk"); });
  await step("menu", async () => { await key("Escape", 1, 1200); await snap("menu"); });
  await step("status screens", async () => {
    await key("Enter", 1, 800); await snap("items"); await key("Escape", 1, 800);
    await key("ArrowDown", 1); await key("Enter", 1, 800); await key("Enter", 1, 800); await snap("skill"); await key("Escape", 2, 800);
    await key("ArrowDown", 1); await key("Enter", 1, 800); await key("Enter", 1, 800); await snap("equip"); await key("Escape", 2, 800);
    await key("ArrowDown", 1); await key("Enter", 1, 800); await key("Enter", 1, 800); await snap("status"); await key("Escape", 2, 800);
  });
  await step("save", async () => {
    // the menu may have extra commands (e.g. plugins): select "セーブ" by moving to the bottom and up
    await snap("before-save"); await key("Escape", 1, 3000); // open the menu again (scene change + transition)
    // セーブ is the second command from the end (plugins may add commands): hold Down to reach
    // the bottom (key repeat does not wrap around), then go up once
    await hold("ArrowDown", 2500); await key("ArrowUp", 1, 500); await key("Enter", 1, 1200); await snap("save-screen"); await key("Enter", 1, 1500); await snap("saved");
    await key("Escape", 3, 800);
  });
  await step("reset to title", async () => { await key("F12", 1, 3500); await snap("title-again"); });
  await step("continue/load", async () => {
    // with a save file the title already selects "コンティニュー"
    await key("Enter", 1, 1500); await snap("load-screen"); await key("Enter", 1, 3000); await snap("loaded");
  });
  const saved = serverLog.join("").includes("[save] Save01.rvdata2");
  if (!saved) { console.log("save file was not written"); failed = true; }
} catch (e) {
  console.log("FAILED:", e.message);
  failed = true;
}
const bad = logs.filter((l) => /error|PAGEERROR|NG/i.test(l) && !/\[stage\]/.test(l) && !/GL Driver Message/.test(l));
console.log(logs.filter((l) => l.startsWith("[stage]") && !l.includes("script:")).slice(-8).join("\n"));
if (bad.length) { console.log("ERRORS:\n" + bad.slice(0, 20).join("\n")); failed = true; }
console.log(serverLog.join("").split("\n").filter((l) => /\[save\]|\[audio\]/.test(l)).slice(0, 30).join("\n"));
await browser.close();
server.kill();
console.log(failed ? "ACE FLOW FAILED" : "ACE FLOW OK");
process.exit(failed ? 1 : 0);
