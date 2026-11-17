// Headless smoke test: runs the test game in Chromium and checks the self-test output.
//   node dev/e2e.mjs [game-dir] [screenshot-prefix]
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const game = process.argv[2] || path.join(here, "testgame");
const shot = process.argv[3] || path.join(here, "shot");
const port = 8766;

const server = spawn(process.execPath, [path.join(here, "server.mjs"), game, String(port)], { stdio: ["ignore", "pipe", "inherit"] });
const serverLog = [];
server.stdout.on("data", (d) => serverLog.push(String(d)));
await new Promise((r) => setTimeout(r, 800));

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1088, height: 832 } });
const logs = [];
page.on("console", (m) => logs.push(m.text()));
page.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
await page.goto(`http://localhost:${port}/`);
const t0 = Date.now();
let ok = false;
while (Date.now() - t0 < 60000) {
  if (logs.some((l) => l.includes("TEST READY"))) { ok = true; break; }
  if (await page.locator("#overlay").isVisible()) break;
  await new Promise((r) => setTimeout(r, 250));
}
console.log(`boot ${ok ? "ok" : "FAILED"} in ${Date.now() - t0} ms`);
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: shot + "-1.png" });
// walk right and down, open the command window
await page.keyboard.down("ArrowRight");
await new Promise((r) => setTimeout(r, 1200));
await page.keyboard.up("ArrowRight");
await page.keyboard.down("ArrowDown");
await new Promise((r) => setTimeout(r, 800));
await page.keyboard.up("ArrowDown");
await page.keyboard.press("Enter");
await new Promise((r) => setTimeout(r, 500));
for (let i = 0; i < 5; i++) { await page.keyboard.press("ArrowDown"); await new Promise((r) => setTimeout(r, 80)); }
await page.keyboard.down("KeyA");
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: shot + "-2.png" });
await page.keyboard.up("KeyA");
const fps = await page.evaluate(() => document.getElementById("fps").textContent);
console.log(logs.filter((l) => l.startsWith("TEST") || l.includes("ERROR") || l.includes("rror")).join("\n"));
if (await page.locator("#overlay").isVisible()) console.log("OVERLAY:", await page.locator("#overlay").innerText());
console.log("fps:", fps);
console.log(serverLog.join("").split("\n").filter((l) => l.includes("[save]")).slice(0, 5).join("\n"));
await browser.close();
server.kill();
const failed = !ok || logs.some((l) => l.startsWith("TEST NG") || l.startsWith("PAGEERROR"));
process.exit(failed ? 1 : 0);
