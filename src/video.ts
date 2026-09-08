import { mkdir, readFile, copyFile, rename } from "node:fs/promises";
import { join } from "node:path";
import {
  atomic,
  json,
  hash,
  fileHash,
  RATE,
  FPS,
  ROOT,
  run,
  probe,
  log,
} from "./common.js";
import { wav, type SpeechAsset } from "./speech.js";
import type { Timeline } from "./timeline.js";
export async function compose(
  t: Timeline,
  assets: SpeechAsset[],
  out: string,
  cache: string,
) {
  // One PCM track avoids per-sentence AAC encoder delay. Padding comes from the same integer timeline.
  const pcm = Buffer.alloc(t.totalSamples * 2);
  for (const seg of t.segments) {
    const asset = assets.find((a) => a.id === seg.id)!;
    asset.pcm.copy(pcm, seg.startSample * 2);
  }
  await atomic(join(out, "narration.wav"), wav(pcm));
  const list =
    t.slides
      .map(
        (s) =>
          `file 'slides/${s.id}.png'\noption framerate 30\nduration ${(s.endFrame - s.startFrame) / FPS}`,
      )
      .join("\n") +
    `\nfile 'slides/${t.slides.at(-1)!.id}.png'\noption framerate 30\n`;
  await atomic(join(out, "frames.ffconcat"), list);
  const build = (await run("ffmpeg", ["-version"])).stdout;
  const ffmpeg = build.split("\n")[0],
    ffmpegBuildSha256 = hash(build);
  const key = hash({
    pipeline: 4,
    loudness: { I: -16, TP: -1.5, LRA: 11 },
    t,
    images: await Promise.all(
      t.slides.map((s) => fileHash(join(out, "slides", `${s.id}.png`))),
    ),
    audio: assets.map((a) => a.key),
    ass: await fileHash(join(out, "subtitles.ass")),
    ffmpeg,
    ffmpegBuildSha256,
  });
  await mkdir(join(cache, "videos"), { recursive: true });
  const cached = join(cache, "videos", `${key}.mp4`),
    target = join(out, "video.mp4");
  let hit = false;
  try {
    const receipt = JSON.parse(await readFile(cached + ".json", "utf8"));
    if (
      receipt.validated !== true ||
      receipt.sha256 !== (await fileHash(cached))
    )
      throw new Error("Cache checksum mismatch");
    await copyFile(cached, target);
    hit = true;
  } catch {
    log("Measuring narration loudness");
    const measured = (
      await run("ffmpeg", [
        "-hide_banner",
        "-nostats",
        "-i",
        join(out, "narration.wav"),
        "-af",
        "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
        "-f",
        "null",
        "-",
      ])
    ).stderr;
    const loudness = JSON.parse(measured.match(/\{[\s\S]*?\}/)?.[0] ?? "{}");
    for (const name of [
      "input_i",
      "input_tp",
      "input_lra",
      "input_thresh",
      "target_offset",
    ])
      if (!Number.isFinite(Number(loudness[name])))
        throw new Error("Narration is silent or loudness analysis failed");
    const audioFilter = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${loudness.input_i}:measured_TP=${loudness.input_tp}:measured_LRA=${loudness.input_lra}:measured_thresh=${loudness.input_thresh}:offset=${loudness.target_offset}:linear=false`;
    await json(join(out, "loudness.json"), {
      target: { integratedLufs: -16, truePeakDbtp: -1.5, rangeLu: 11 },
      input: loudness,
    });
    log("Encoding 1080p MP4");
    await run(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "warning",
        "-y",
        "-threads",
        "2",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "frames.ffconcat",
        "-i",
        "narration.wav",
        "-vf",
        "fps=30,ass=subtitles.ass:fontsdir=slides/fonts",
        "-r",
        String(FPS),
        "-frames:v",
        String(t.totalFrames),
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-tune",
        "stillimage",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-threads",
        "4",
        "-af",
        audioFilter,
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-ar",
        String(RATE),
        "-t",
        String(t.totalSamples / RATE),
        "-movflags",
        "+faststart",
        "-map_metadata",
        "-1",
        "video.tmp.mp4",
      ],
      { cwd: out, timeout: 600000 },
    );
    await rename(join(out, "video.tmp.mp4"), target);
  }
  return { target, hit, ffmpeg, ffmpegBuildSha256, key, cached };
}
export async function verifyVideo(path: string, t: Timeline) {
  const p = await probe(path),
    v = p.streams.find((s: any) => s.codec_type === "video"),
    a = p.streams.find((s: any) => s.codec_type === "audio");
  const errors: string[] = [];
  if (
    v?.width !== 1920 ||
    v?.height !== 1080 ||
    v?.codec_name !== "h264" ||
    v?.pix_fmt !== "yuv420p" ||
    v?.r_frame_rate !== "30/1"
  )
    errors.push("Video format mismatch");
  if (a?.codec_name !== "aac" || Number(a?.sample_rate) !== RATE)
    errors.push("Audio format mismatch");
  if (Number(v?.nb_frames) !== t.totalFrames)
    errors.push("Frame count mismatch");
  const expected = t.totalSamples / RATE,
    tolerance = 1 / FPS + 1024 / RATE;
  for (const [name, actual] of [
    ["container", p.format.duration],
    ["video", v?.duration],
    ["audio", a?.duration],
  ] as const)
    if (
      !Number.isFinite(Number(actual)) ||
      Math.abs(Number(actual) - expected) > tolerance
    )
      errors.push(`${name} duration mismatch`);
  await run(
    "ffmpeg",
    ["-v", "error", "-xerror", "-i", path, "-f", "null", "-"],
    { timeout: 600000 },
  );
  const loudnessLog = (
    await run(
      "ffmpeg",
      [
        "-hide_banner",
        "-nostats",
        "-i",
        path,
        "-vn",
        "-af",
        "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
        "-f",
        "null",
        "-",
      ],
      { timeout: 120000 },
    )
  ).stderr;
  const loudness = JSON.parse(loudnessLog.match(/\{[\s\S]*?\}/)?.[0] ?? "{}");
  const integratedLufs = Number(loudness.input_i),
    truePeakDbtp = Number(loudness.input_tp);
  if (
    !Number.isFinite(integratedLufs) ||
    integratedLufs < -18 ||
    integratedLufs > -14 ||
    !Number.isFinite(truePeakDbtp) ||
    truePeakDbtp > -0.5
  )
    errors.push("Audio loudness outside acceptance range");
  if (errors.length) throw new Error(`Video validation: ${errors.join("; ")}`);
  return {
    passed: true,
    decoded: true,
    audioLoudness: { integratedLufs, truePeakDbtp },
    expectedSeconds: expected,
    actualSeconds: Number(p.format.duration),
    frames: Number(v.nb_frames),
    width: v.width,
    height: v.height,
    fps: v.r_frame_rate,
    videoCodec: v.codec_name,
    audioCodec: a.codec_name,
    bytes: Number(p.format.size),
    toleranceSeconds: tolerance,
  };
}
