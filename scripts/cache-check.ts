import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { run, ROOT, json, readJson } from "../src/common.js";
const tmp = await mkdtemp(join(tmpdir(), "dopagaki-cache-"));
const base = JSON.parse(
  await readFile(join(ROOT, "examples/minimal.story.json"), "utf8"),
);
base.slides.forEach((s: any) => (s.narration = s.narration.slice(0, 1)));
const file = join(tmp, "story.json"),
  out = join(tmp, "result"),
  cache = join(tmp, "cache"),
  results: any[] = [];
async function render(name: string, s: unknown) {
  await json(file, s);
  await run(
    process.execPath,
    [
      join(ROOT, "node_modules/tsx/dist/cli.mjs"),
      join(ROOT, "src/cli.ts"),
      "render",
      file,
      "--out",
      out,
      "--cache",
      cache,
    ],
    { timeout: 240000 },
  );
  const m = await readJson(join(out, "manifest.json"));
  results.push({
    name,
    totalMs: m.totalMs,
    stagesMs: m.stagesMs,
    cache: m.cache,
    videoSha256: m.videoSha256,
    pdf: m.pdf,
    audio: m.audio.map((a: any) => ({
      id: a.id,
      key: a.key,
      samples: a.samples,
    })),
  });
  return m;
}
const cold = await render("cold", base);
assert.equal(cold.cache.speech, 0);
assert.equal(cold.cache.pdf, false);
assert.equal(cold.pdf.pages, base.slides.length);
const warm = await render("warm", base);
assert.equal(warm.cache.speech, 2);
assert.equal(warm.cache.images, 2);
assert.equal(warm.cache.video, true);
assert.equal(warm.cache.pdf, true);
assert.equal(warm.pdf.sha256, cold.pdf.sha256);
assert.equal(cold.videoSha256, warm.videoSha256);
const visual = structuredClone(base);
visual.slides[0].title = "幅と符号を、分けて考える";
const v = await render("visual-only", visual);
assert.equal(v.cache.speech, 2);
assert.equal(v.cache.images, 1);
assert.equal(v.cache.video, false);
assert.equal(v.cache.pdf, false);
assert.notEqual(v.pdf.sha256, warm.pdf.sha256);
const spoken = structuredClone(visual);
spoken.slides[0].narration[0].text =
  "Goの整数型は、まず幅と符号を分けて考えるとわかりやすいのだ。";
const a = await render("one-sentence", spoken);
assert.equal(a.cache.speech, 1);
assert.equal(a.cache.images, 2);
assert.equal(a.cache.pdf, true);
assert.equal(a.pdf.sha256, v.pdf.sha256);
assert.notEqual(a.audio[0].key, v.audio[0].key);
assert.equal(a.audio[1].key, v.audio[1].key);
await writeFile(
  join(cache, "speech", `${a.audio[0].key}.wav`),
  Buffer.from("broken cache"),
);
const repaired = await render("resume-corrupt-speech", spoken);
assert.equal(repaired.cache.speech, 1);
assert.equal(repaired.cache.images, 2);
assert.equal(repaired.audio[0].key, a.audio[0].key);
// Inspect the resulting video and audio, in addition to CLI/cache assertions.
for (const script of ["subtitle-check.ts", "audio-check.ts"]) {
  await run(
    process.execPath,
    [
      join(ROOT, "node_modules/tsx/dist/cli.mjs"),
      join(ROOT, "scripts", script),
      out,
    ],
    { timeout: 120000 },
  );
}
const report = join(tmp, "cache-check.json");
await json(report, {
  passed: true,
  results,
  output: out,
  checks: { burnedSubtitles: true, audio: true },
});
console.log(`Video generation E2E passed: ${report}`);
