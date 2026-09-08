import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseStory } from "../src/schema.js";
import { makeTimeline, validateTimeline, subtitles } from "../src/timeline.js";
import { pronunciation, wav, wavData } from "../src/speech.js";
import { RATE, SPF } from "../src/common.js";
const raw = JSON.parse(
  await readFile("examples/go-integers.story.json", "utf8"),
);
function two() {
  const s = structuredClone(raw);
  s.slides = s.slides.slice(0, 2);
  s.slides.forEach((s: any) => (s.narration = s.narration.slice(0, 1)));
  s.objectives = [
    { id: "all", question: "Question", slides: s.slides.map((s: any) => s.id) },
  ];
  return parseStory(s);
}
test("10s + 20s PCM with 1s gaps makes exactly 34s; subtitles exclude gaps", () => {
  const s = two(),
    t = makeTimeline(s, { "answer-1": 10 * RATE, "bits-1": 20 * RATE });
  validateTimeline(t);
  assert.equal(t.totalSamples, 34 * RATE);
  assert.equal(t.totalFrames, 1020);
  assert.deepEqual(
    t.segments.map((s) => [s.startSample / RATE, s.endSample / RATE]),
    [
      [1, 11],
      [13, 33],
    ],
  );
});
test("100 fractional slides stay aligned without sample drift; changed audio shifts later subtitles", () => {
  const s = two();
  s.slides = Array.from({ length: 100 }, (_, i) => ({
    ...s.slides[0]!,
    id: `slide-${i}`,
    narration: [{ id: `seg-${i}`, text: "本文" }],
  }));
  const d = Object.fromEntries(
    s.slides.map((s) => [s.narration[0]!.id, 48001]),
  );
  const a = makeTimeline(s, d);
  validateTimeline(a);
  assert.equal(a.totalSamples, 100 * (3 * RATE + SPF));
  const b = makeTimeline(s, { ...d, "seg-0": 96001 });
  assert.equal(b.segments[99]!.startSample - a.segments[99]!.startSample, RATE);
});
test("missing or broken evidence, duplicate IDs and uncovered slides fail", () => {
  for (const mutate of [
    (s: any) => (s.slides[0].evidence = ["missing"]),
    (s: any) => (s.slides[1].id = s.slides[0].id),
    (s: any) => (s.objectives = s.objectives.slice(1)),
    (s: any) => (s.slides[0].content.extra = "<div>bad</div>"),
  ]) {
    const s = structuredClone(raw);
    mutate(s);
    assert.throws(() => parseStory(s));
  }
});
test("repository claims need commit-pinned provenance; inspected tests cannot be confused with executed tests", () => {
  const s = structuredClone(raw);
  s.sources[0].kind = "test";
  assert.throws(() => parseStory(s));
  s.sources[0] = {
    ...s.sources[0],
    revision: "a".repeat(40),
    url: `https://github.com/org/repo/blob/${"a".repeat(40)}/x.go#L1`,
    file: "x.go",
    lines: [1, 3],
    executed: false,
  };
  assert.doesNotThrow(() => parseStory(s));
});
test("subtitle originals are preserved in SRT and drift is rejected", () => {
  const s = two(),
    t = makeTimeline(s, { "answer-1": 48001, "bits-1": 97001 }),
    w = Object.fromEntries(t.segments.map((s) => [s.id, s.text]));
  const sub = subtitles(t, w);
  assert.match(sub.srt, /00:00:01,000 --> 00:00:02,000/);
  assert.ok(sub.srt.includes(t.segments[0]!.text));
  assert.throws(() => subtitles(t, { ...w, "answer-1": "changed" }));
  t.segments[1]!.startSample = 0;
  assert.throws(() => validateTimeline(t));
});
test("pronunciation uses longest match once and keeps display text unchanged", () => {
  const text = "uint8 と int8、uint";
  assert.equal(
    pronunciation(text, {
      int: "イント",
      uint: "ユーイント",
      uint8: "ユーイントはち",
      int8: "イントはち",
    }),
    "ユーイントはち と イントはち、ユーイント",
  );
  assert.equal(text, "uint8 と int8、uint");
});
test("PCM WAV exact roundtrip and truncated cache detection", () => {
  const pcm = Buffer.alloc(48001 * 2, 2),
    encoded = wav(pcm);
  assert.deepEqual(wavData(encoded), pcm);
  assert.throws(() => wavData(encoded.subarray(0, encoded.length - 2)));
});

test("VOICEVOX offline produces an actionable error without launching or changing the app", async () => {
  const { Voicevox } = await import("../src/speech.js");
  await assert.rejects(
    () => new Voicevox("http://127.0.0.1:1").connect(false),
    /VOICEVOX not running.*open -a VOICEVOX/,
  );
});
