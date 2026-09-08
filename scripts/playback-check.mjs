import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
const out = resolve(process.argv[2]);
await mkdir(join(out, "review"), { recursive: true });
await writeFile(
  join(out, "player.html"),
  '<html><meta charset="utf-8"><style>html,body{margin:0;background:#fff}video{width:100vw;height:100vh;object-fit:contain}</style><video src="video.mp4" controls playsinline></video></html>',
);
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(pathToFileURL(join(out, "player.html")).href);
await page.waitForFunction(
  () => document.querySelector("video").readyState >= 2,
);
const samples = [];
for (const at of [4, 137, 219, 360]) {
  const result = await page.evaluate(async (at) => {
    const v = document.querySelector("video");
    v.currentTime = at;
    await new Promise((r) => v.addEventListener("seeked", r, { once: true }));
    v.muted = true;
    await v.play();
    await new Promise((r) => setTimeout(r, 350));
    v.pause();
    return {
      requested: at,
      actual: v.currentTime,
      width: v.videoWidth,
      height: v.videoHeight,
      error: v.error?.message ?? null,
      decodedFrames: v.getVideoPlaybackQuality().totalVideoFrames,
    };
  }, at);
  if (result.error || result.actual <= at || result.width !== 1920)
    throw new Error(JSON.stringify(result));
  samples.push(result);
  if (at === 137) {
    await page.setViewportSize({ width: 844, height: 475 });
    await page.screenshot({ path: join(out, "review/mobile-landscape.png") });
    await page.setViewportSize({ width: 1280, height: 720 });
  }
}
await writeFile(
  join(out, "review/playback.json"),
  JSON.stringify(
    {
      passed: true,
      browser: browser.version(),
      samples,
      note: "Muted real browser playback; no subjective listening claim.",
    },
    null,
    2,
  ),
);
await browser.close();
console.log("Playback passed");
