import { readJson, json, run } from "../src/common.js";
import { wavData, Voicevox, pronunciation } from "../src/speech.js";
import { parseStory } from "../src/schema.js";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
const out = resolve(process.argv[2]!);
const story = parseStory(await readJson(join(out, "story.json"))),
  timeline = await readJson(join(out, "timeline.json"));
const pcm = wavData(await readFile(join(out, "narration.wav")));
let peak = 0,
  clipped = 0,
  squares = 0;
for (let i = 0; i < pcm.length; i += 2) {
  const n = pcm.readInt16LE(i);
  peak = Math.max(peak, Math.abs(n));
  if (Math.abs(n) >= 32767) clipped++;
  squares += n * n;
}
const segments = timeline.segments.map((s: any) => {
  let energy = 0,
    max = 0;
  for (let i = s.startSample; i < s.endSample; i++) {
    const n = pcm.readInt16LE(i * 2);
    energy += n * n;
    max = Math.max(max, Math.abs(n));
  }
  return {
    id: s.id,
    rms: Math.sqrt(energy / (s.endSample - s.startSample)),
    peak: max,
  };
});
if (clipped || segments.some((s: any) => s.rms < 10))
  throw new Error("Clipping or silent narration detected");
const voice = new Voicevox(),
  speaker = await voice.resolve(story.voice),
  readings = [];
const originals = new Set(
  story.slides.flatMap((slide) =>
    slide.narration.map((segment) => segment.text),
  ),
);
for (const original of originals) {
  const spoken = pronunciation(original, story.voice.dictionary),
    q = (await (
      await voice.request(
        `/audio_query?text=${encodeURIComponent(spoken)}&speaker=${speaker.styleId}`,
        { method: "POST" },
      )
    ).json()) as any;
  readings.push({ original, spoken, kana: q.kana });
}
const measured = (
  await run("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-i",
    join(out, "narration.wav"),
    "-af",
    "volumedetect",
    "-f",
    "null",
    "-",
  ])
).stderr;
await json(join(out, "review/audio-check.json"), {
  passed: true,
  peak,
  clippedSamples: clipped,
  rms: Math.sqrt(squares / (pcm.length / 2)),
  segments,
  readings,
  ffmpeg: measured.split("\n").filter((l) => /mean_volume|max_volume/.test(l)),
  reviewMethod:
    "PCM analysis and engine pronunciation inspection; no subjective listening claim",
});
