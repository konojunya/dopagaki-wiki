import { parseArgs } from "node:util";
import { mkdir, readdir, rm, copyFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { homedir } from "node:os";
import { chromium } from "playwright";
import { parseStory } from "./schema.js";
import {
  readJson,
  json,
  atomic,
  fileHash,
  hash,
  ROOT,
  run,
  log,
  resolveMediaBinary,
  createOutputDirectory,
} from "./common.js";
import { renderSlides } from "./slides.js";
import { Voicevox, synthesize } from "./speech.js";
import { makeTimeline, validateTimeline, subtitles } from "./timeline.js";
import { compose, verifyVideo } from "./video.js";
import { designSha256 } from "./design.js";
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string" },
    cache: { type: "string" },
    "start-voicevox": { type: "boolean" },
    help: { type: "boolean" },
  },
});
const [command, storyPath] = positionals;
let outputStarted = false;
let outputDirectory: string | undefined;
async function doctor() {
  const results: Record<string, unknown> = { node: process.version };
  for (const binary of ["ffmpeg", "ffprobe"] as const) {
    results[binary] = (await run(binary, ["-version"])).stdout.split("\n")[0];
    results[`${binary}Path`] = await resolveMediaBinary(binary);
  }
  const filters = (await run("ffmpeg", ["-hide_banner", "-filters"])).stdout;
  if (!/\bass\s+V->V/.test(filters))
    throw new Error(
      "FFmpeg needs libass (ASS subtitles). Run brew install ffmpeg-full, then retry doctor.",
    );
  results.libass = true;
  const browser = await chromium.launch();
  results.chromium = browser.version();
  await browser.close();
  results.fontSha256 = await fileHash(
    join(ROOT, "assets/fonts/NotoSansJP.ttf"),
  );
  const voice = new Voicevox();
  results.voicevox = await voice.connect(values["start-voicevox"]);
  results.speaker = await voice.resolve({
    speaker: "ずんだもん",
    style: "ノーマル",
    speed: 1.08,
    dictionary: {},
  });
  return results;
}
async function main() {
  if (values.help || !command) {
    console.log(
      "dopagaki-wiki: doctor [--start-voicevox] | validate <story.json> | preview <story.json> [--out <dir>] | render <story.json> [--out <dir>] [--cache <dir>]\nDefault output: a new /tmp/dopagaki-wiki-* directory (printed in the result).",
    );
    return;
  }
  if (command === "doctor") {
    console.log(JSON.stringify(await doctor(), null, 2));
    return;
  }
  if (!["validate", "preview", "render"].includes(command) || !storyPath)
    throw new Error("Use --help for supported commands.");
  const started = performance.now(),
    story = parseStory(await readJson(resolve(storyPath)));
  log(
    `Validated ${story.slides.length} slides, ${story.objectives.length} learning objectives`,
  );
  if (command === "validate") {
    console.log(
      JSON.stringify({
        passed: true,
        slides: story.slides.length,
        segments: story.slides.flatMap((s) => s.narration).length,
      }),
    );
    return;
  }
  const out = await createOutputDirectory(values.out),
    cache = resolve(
      values.cache ?? join(homedir(), "Library/Caches/dopagaki-wiki"),
    );
  outputDirectory = out;
  log(`Output: ${out}`);
  const previous = await readJson(join(out, "story.json")).catch(() => null);
  if (previous && previous.question !== story.question)
    throw new Error(
      "Output directory belongs to a different question. Choose a new --out directory.",
    );
  outputStarted = true;
  await json(join(out, "manifest.json"), {
    status: "in-progress",
    startedAt: new Date().toISOString(),
    storySha256: hash(story),
  });
  await json(join(out, "story.json"), story);
  await json(join(out, "evidence.json"), story.sources);
  const stages: Record<string, number> = {};
  let checkpoint = performance.now();
  const measure = (name: string) => {
    stages[name] = Math.round(performance.now() - checkpoint);
    checkpoint = performance.now();
  };
  const visuals = await renderSlides(
    story,
    out,
    cache,
    dirname(resolve(storyPath)),
  );
  measure("slides");
  if (command === "preview") {
    await json(join(out, "manifest.json"), {
      status: "preview",
      storySha256: hash(story),
      layoutPassed: true,
    });
    await rm(join(out, "last-error.json"), { force: true });
    console.log(
      JSON.stringify({
        out,
        layoutPassed: true,
        imageCacheHits: visuals.hits,
        stages,
      }),
    );
    return;
  }
  const speech = await synthesize(story, cache);
  measure("speech");
  const timeline = makeTimeline(
    story,
    Object.fromEntries(speech.assets.map((a) => [a.id, a.samples])),
  );
  validateTimeline(timeline);
  await json(join(out, "timeline.json"), timeline);
  const subs = subtitles(timeline, visuals.captions);
  await atomic(join(out, "subtitles.ass"), subs.ass);
  await atomic(join(out, "subtitles.srt"), subs.srt);
  await atomic(
    join(out, "script.md"),
    `# ${story.title}\n\n${story.question}\n\n${story.slides.map((s) => `## ${s.title}\n\n${s.narration.map((n) => n.text).join("\n\n")}\n\n根拠: ${s.evidence.join(", ")}`).join("\n\n")}\n\nVOICEVOX:${story.voice.speaker}\n`,
  );
  measure("timeline");
  const movie = await compose(timeline, speech.assets, out, cache);
  measure("encode");
  const validation = await verifyVideo(movie.target, timeline);
  measure("videoValidation");
  if (!movie.hit) {
    await copyFile(movie.target, movie.cached);
    await json(movie.cached + ".json", {
      validated: true,
      sha256: await fileHash(movie.cached),
    });
  }
  await json(join(out, "validation.json"), validation);
  const implementationFiles = (await readdir(join(ROOT, "src")))
    .filter((n) => n.endsWith(".ts"))
    .sort();
  const manifest = {
    status: "complete",
    version: "0.0.1",
    generatedAt: new Date().toISOString(),
    storySha256: hash(story),
    implementationSha256: hash(
      await Promise.all(
        implementationFiles.map(async (n) => [
          n,
          await fileHash(join(ROOT, "src", n)),
        ]),
      ),
    ),
    lockfileSha256: await fileHash(join(ROOT, "package-lock.json")),
    designSha256,
    videoSha256: await fileHash(movie.target),
    engine: speech.identity,
    tools: {
      node: process.version,
      ffmpeg: movie.ffmpeg,
      ffmpegBuildSha256: movie.ffmpegBuildSha256,
      playwright: (
        await readJson(join(ROOT, "node_modules/playwright/package.json"))
      ).version,
    },
    stagesMs: stages,
    totalMs: Math.round(performance.now() - started),
    cache: { images: visuals.hits, speech: speech.hits, video: movie.hit },
    audio: speech.assets.map(({ pcm, ...a }) => ({ ...a, path: undefined })),
    validation: {
      schema: true,
      layout: true,
      timeline: true,
      video: validation,
      semanticReview:
        "required: see quality-review.md; automation does not prove factual correctness",
      listeningReview: "required",
    },
  };
  await json(join(out, "manifest.json"), manifest);
  await rm(join(out, "last-error.json"), { force: true });
  console.log(
    JSON.stringify(
      {
        video: movie.target,
        seconds: validation.expectedSeconds,
        bytes: validation.bytes,
        totalMs: manifest.totalMs,
        cache: manifest.cache,
      },
      null,
      2,
    ),
  );
}
main().catch(async (e) => {
  const message = e instanceof Error ? e.message : String(e);
  if (outputDirectory && outputStarted) {
    await json(join(outputDirectory, "last-error.json"), {
      at: new Date().toISOString(),
      message,
    }).catch(() => {});
    await json(join(outputDirectory, "manifest.json"), {
      status: "failed",
      message,
    }).catch(() => {});
  }
  console.error(message);
  process.exitCode = 1;
});
