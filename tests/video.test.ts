import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseStory } from "../src/schema.js";
import { renderSlides } from "../src/slides.js";
import { makeTimeline, subtitles } from "../src/timeline.js";
import { compose, verifyVideo } from "../src/video.js";
import { atomic, RATE, run } from "../src/common.js";
test("real FFmpeg renders exactly 34s and burns subtitles only during measured speech", async () => {
  const s = JSON.parse(await readFile("examples/minimal.story.json", "utf8"));
  s.slides.forEach((s: any) => (s.narration = s.narration.slice(0, 1)));
  const story = parseStory(s),
    out = await mkdtemp(join(tmpdir(), "dopagaki-video-")),
    cache = join(out, "cache");
  const visuals = await renderSlides(story, out, cache),
    assets = story.slides.map((s, i) => {
      const samples = (i + 1) * 10 * RATE,
        pcm = Buffer.alloc(samples * 2);
      for (let n = 0; n < samples; n++)
        pcm.writeInt16LE(
          Math.round(1000 * Math.sin((n * 2 * Math.PI * 220) / RATE)),
          n * 2,
        );
      return {
        id: s.narration[0]!.id,
        key: `fixture-${i}`,
        path: "",
        samples,
        pcm,
        hit: false,
      };
    });
  const timeline = makeTimeline(
      story,
      Object.fromEntries(assets.map((a) => [a.id, a.samples])),
    ),
    subs = subtitles(timeline, visuals.captions);
  await atomic(join(out, "subtitles.ass"), subs.ass);
  const movie = await compose(timeline, assets, out, cache),
    report = await verifyVideo(movie.target, timeline);
  assert.equal(report.frames, 1020);
  async function mean(at: number) {
    const r = await run("ffmpeg", [
      "-v",
      "info",
      "-ss",
      String(at),
      "-i",
      movie.target,
      "-frames:v",
      "1",
      "-vf",
      "crop=1600:150:160:840,signalstats,metadata=print",
      "-f",
      "null",
      "-",
    ]);
    return Number(r.stderr.match(/lavfi.signalstats.YAVG=(\S+)/)?.[1]);
  }
  const gap = await mean(0.5),
    speaking = await mean(4),
    after = await mean(11.5);
  assert.ok(gap - speaking > 1, `${gap} ${speaking}`);
  assert.ok(Math.abs(gap - after) < 0.2, `${gap} ${after}`);
});
