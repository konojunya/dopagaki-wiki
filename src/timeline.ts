import { RATE, FPS, SPF } from "./common.js";
import { theme } from "./theme.js";
import type { Story } from "./schema.js";
export type Timeline = {
  sampleRate: number;
  fps: number;
  totalSamples: number;
  totalFrames: number;
  slides: {
    id: string;
    startFrame: number;
    endFrame: number;
    startSample: number;
    endSample: number;
  }[];
  segments: {
    id: string;
    slideId: string;
    text: string;
    startSample: number;
    endSample: number;
  }[];
};
export function makeTimeline(
  story: Story,
  durations: Record<string, number>,
): Timeline {
  let cursor = 0;
  const slides: Timeline["slides"] = [],
    segments: Timeline["segments"] = [];
  for (const s of story.slides) {
    const start = cursor;
    cursor += Math.round(s.gapBefore * RATE);
    for (const n of s.narration) {
      const count = durations[n.id];
      if (!Number.isSafeInteger(count) || count <= 0)
        throw new Error(`Invalid audio samples for ${n.id}`);
      segments.push({
        id: n.id,
        slideId: s.id,
        text: n.text,
        startSample: cursor,
        endSample: cursor + count,
      });
      cursor += count;
    }
    cursor += Math.round(s.gapAfter * RATE);
    cursor = Math.ceil(cursor / SPF) * SPF;
    slides.push({
      id: s.id,
      startFrame: start / SPF,
      endFrame: cursor / SPF,
      startSample: start,
      endSample: cursor,
    });
  }
  return {
    sampleRate: RATE,
    fps: FPS,
    totalSamples: cursor,
    totalFrames: cursor / SPF,
    slides,
    segments,
  };
}
export function validateTimeline(t: Timeline) {
  if (t.totalSamples !== t.totalFrames * SPF)
    throw new Error("Timeline sample/frame mismatch");
  let end = 0;
  for (const s of t.slides) {
    if (
      s.startSample !== end ||
      s.endSample <= end ||
      s.startFrame * SPF !== s.startSample ||
      s.endFrame * SPF !== s.endSample
    )
      throw new Error(`Invalid slide timing ${s.id}`);
    end = s.endSample;
  }
  if (end !== t.totalSamples) throw new Error("Total duration mismatch");
  end = 0;
  for (const n of t.segments) {
    const s = t.slides.find((s) => s.id === n.slideId);
    if (
      !s ||
      n.startSample < end ||
      n.endSample <= n.startSample ||
      n.startSample < s.startSample ||
      n.endSample > s.endSample
    )
      throw new Error(`Invalid subtitle timing ${n.id}`);
    end = n.endSample;
  }
}
const time = (samples: number, ass = false) => {
  const scale = ass ? 100 : 1000,
    n = Math.round((samples / RATE) * scale),
    sec = Math.floor(n / scale);
  return `${ass ? Math.floor(sec / 3600) : String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor(sec / 60) % 60).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}${ass ? "." : ","}${String(n % scale).padStart(ass ? 2 : 3, "0")}`;
};
export function subtitles(t: Timeline, wrapped: Record<string, string>) {
  const srt = t.segments
    .map(
      (s, i) =>
        `${i + 1}\n${time(s.startSample)} --> ${time(s.endSample)}\n${wrapped[s.id]}\n`,
    )
    .join("\n");
  const assText = (text: string) => text.replace(/\n/g, "\\N");
  const ass = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,${theme.font},${theme.caption},&H001C1A1A,&H001C1A1A,&H00FFFFFF,&H00FFFFFF,0,0,0,0,100,100,0,0,1,0,0,2,${theme.captionMargin},${theme.captionMargin},${theme.captionBottom},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${t.segments.map((s) => `Dialogue: 0,${time(s.startSample, true)},${time(s.endSample, true)},Default,,0,0,0,,${assText(wrapped[s.id]!)}`).join("\n")}\n`;
  for (const seg of t.segments)
    if (wrapped[seg.id]?.replace(/\n/g, "") !== seg.text.replace(/\n/g, ""))
      throw new Error(`Subtitle text mismatch ${seg.id}`);
  return { srt, ass };
}
