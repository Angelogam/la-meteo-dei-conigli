/* Screenshot dei nuovi sprite (coda + punta stretta) su sfondo scuro e chiaro. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname);
const MIME = { ".html": "text/html", ".js": "text/javascript" };

(async () => {
  const srv = http.createServer((req, res) => {
    const f = path.join(ROOT, req.url === "/" ? "test.html" : req.url.split("?")[0]);
    try {
      const data = fs.readFileSync(f);
      res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("nf");
    }
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const port = srv.address().port;

  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage"] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 460 } });
  page.on("pageerror", (e) => console.error("pageerror:", String(e)));
  page.on("console", (m) => { if (m.type() === "error") console.error("console:", m.text()); });
  await page.goto(`http://127.0.0.1:${port}/test.html`);
  await page.waitForFunction(() => window.__ready === true, { timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/home/z/my-project/shots-local/sprites-coda.png" });
  await browser.close();
  srv.close();
  console.log("SHOT OK");
})().catch((e) => { console.error(e); process.exit(1); });
