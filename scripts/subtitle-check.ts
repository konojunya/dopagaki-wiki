import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readJson, json, run } from "../src/common.js";
const out = resolve(process.argv[2]!),
  t = await readJson(join(out, "timeline.json"));
const ass = await readFile(join(out, "subtitles.ass"), "utf8");
const expected = ass
  .split("\n")
  .filter((l) => l.startsWith("Dialogue:"))
  .map((l) => l.split("\\N").length);
await mkdir(join(out, "review/captions"), { recursive: true });
const browser = await chromium.launch(),
  page = await browser.newPage(),
  reports = [];
const samples = [
  ...t.segments.map((s: any, i: number) => ({
    id: s.id,
    time: (s.startSample + s.endSample) / 2 / 48000,
    expected: expected[i],
  })),
  { id: "opening-gap", time: 0.5, expected: 0 },
  { id: "ending-gap", time: t.totalSamples / 48000 - 0.5, expected: 0 },
];
try {
  for (const s of samples) {
    const path = join(out, "review/captions", `${s.id}.png`);
    await run("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-ss",
      String(s.time),
      "-i",
      join(out, "video.mp4"),
      "-frames:v",
      "1",
      "-vf",
      "crop=1728:150:96:842",
      path,
    ]);
    const data =
      "data:image/png;base64," + (await readFile(path)).toString("base64");
    const measured = await page.evaluate(async (data) => {
      const img = new Image();
      img.src = data;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
      let dark = 0,
        left = c.width,
        right = 0;
      const rows: number[] = [];
      for (let y = 0; y < c.height; y++) {
        let n = 0;
        for (let x = 0; x < c.width; x++) {
          const i = (y * c.width + x) * 4;
          if (
            pixels[i]! < 160 &&
            pixels[i + 1]! < 160 &&
            pixels[i + 2]! < 160
          ) {
            n++;
            dark++;
            left = Math.min(left, x);
            right = Math.max(right, x);
          }
        }
        if (n > 4) rows.push(y);
      }
      const groups: number[][] = [];
      for (const y of rows) {
        if (!groups.length || y - groups.at(-1)!.at(-1)! > 12) groups.push([y]);
        else groups.at(-1)!.push(y);
      }
      return {
        lines: groups.length,
        darkPixels: dark,
        bounds: rows.length
          ? { left, right, top: rows[0], bottom: rows.at(-1) }
          : null,
      };
    }, data);
    if (
      measured.lines !== s.expected ||
      (measured.bounds &&
        (measured.bounds.top! < 1 ||
          measured.bounds.bottom! > 148 ||
          measured.bounds.left < 1 ||
          measured.bounds.right > 1726))
    )
      throw new Error(
        `Subtitle ${s.id}: ${JSON.stringify({ expected: s.expected, measured })}`,
      );
    reports.push({ ...s, ...measured });
  }
} finally {
  await browser.close();
}
await json(join(out, "review/subtitle-check.json"), {
  passed: true,
  crop: { x: 96, y: 842, width: 1728, height: 150 },
  samples: reports,
});
console.log(`Checked ${reports.length} burned subtitle/gap frames`);
