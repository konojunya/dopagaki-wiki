import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
const out = resolve(process.argv[2]),
  story = JSON.parse(await readFile(join(out, "story.json"), "utf8"));
await writeFile(
  join(out, "contact.html"),
  `<style>body{margin:0;display:grid;grid-template-columns:repeat(4,480px)}img{width:480px;height:270px}</style>${story.slides.map((s) => `<img src="slides/${s.id}.png">`).join("")}`,
);
const b = await chromium.launch(),
  p = await b.newPage({
    viewport: { width: 1920, height: Math.ceil(story.slides.length / 4) * 270 },
    deviceScaleFactor: 1,
  });
await p.goto(pathToFileURL(join(out, "contact.html")).href);
await p.evaluate(() =>
  Promise.all([...document.images].map((i) => i.decode())),
);
await p.screenshot({ path: join(out, "contact-sheet.png"), fullPage: true });
await b.close();
