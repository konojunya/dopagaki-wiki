import { chromium, type Page } from "playwright";
import { mkdir, copyFile, readFile } from "node:fs/promises";
import { join, resolve, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, hash, fileHash, atomic, json, readJson } from "./common.js";
import { theme, css } from "./theme.js";
import type { Story, Slide } from "./schema.js";
export const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function slideHtml(story: Story, s: Slide, i: number) {
  const c = s.content;
  let body = "";
  if (c.layout === "key")
    body = `<p class="headline">${esc(c.headline)}</p><div class="points">${c.points.map((p) => `<div class="point"><strong>${esc(p.label)}</strong><p>${esc(p.detail)}</p></div>`).join("")}</div>`;
  if (c.layout === "compare")
    body = `<table><thead><tr>${c.columns.map((t) => `<th>${esc(t)}</th>`).join("")}</tr></thead><tbody>${c.rows.map((r) => `<tr>${r.map((t) => `<td>${esc(t)}</td>`).join("")}</tr>`).join("")}</tbody></table><p class="takeaway">${esc(c.takeaway)}</p>`;
  if (c.layout === "flow")
    body = `<div class="steps">${c.steps.map((p, j) => `${j ? '<div class="arrow">→</div>' : ""}<div class="step"><b>${esc(p.label)}</b><p>${esc(p.detail)}</p></div>`).join("")}</div><p class="takeaway">${esc(c.takeaway)}</p>`;
  if (c.layout === "code")
    body = `<div class="code-grid"><pre>${esc(c.code)}</pre><div class="explanations">${c.explanation.map((t) => `<p>${esc(t)}</p>`).join("")}</div></div><p class="takeaway">${esc(c.takeaway)}</p>`;
  if (c.layout === "visual")
    body = `<div class="visual"><img src="media/${s.id}${extname(c.asset.path).toLowerCase()}" alt="${esc(c.asset.alt)}"></div><p class="takeaway">${esc(c.explanation)}</p>`;
  if (c.layout === "example")
    body = `<p class="example-label">${esc(c.label)}</p><div class="cells">${c.cells.map((t) => `<div class="cell">${esc(t)}</div>`).join("")}</div><p class="equation">${esc(c.equation)}</p><p class="takeaway">${esc(c.explanation)}</p>`;
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><title>${esc(s.title)}</title><style>${css}</style><section class="slide"><div class="topline"><span>ずんだもんと学ぶ · ${esc(story.title)}</span><span>${String(i + 1).padStart(2, "0")} / ${String(story.slides.length).padStart(2, "0")}</span></div><h1>${esc(s.title)}</h1><main>${body}</main><div class="caption"><p></p></div><footer><span>出典: ${esc(s.evidence.join(" / "))}</span><span>VOICEVOX:${esc(story.voice.speaker)}</span></footer></section></html>`;
}
export async function inspectPage(page: Page) {
  return page.evaluate(() => {
    const errors: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(
      ".slide, .slide *",
    )) {
      const cs = getComputedStyle(el),
        r = el.getBoundingClientRect(),
        tag = el.tagName.toLowerCase();
      if (
        ["absolute", "fixed"].includes(cs.position) ||
        cs.transform !== "none" ||
        [cs.marginTop, cs.marginLeft, cs.marginRight, cs.marginBottom].some(
          (v) => parseFloat(v) < 0,
        )
      )
        errors.push(`${tag}: forbidden positioning`);
      if (
        el.scrollWidth > el.clientWidth + 2 ||
        el.scrollHeight > el.clientHeight + 2
      )
        errors.push(
          `${tag}.${el.className}: overflow ${el.scrollWidth}×${el.scrollHeight} > ${el.clientWidth}×${el.clientHeight}`,
        );
      if (r.left < -1 || r.top < -1 || r.right > 1921 || r.bottom > 1081)
        errors.push(`${tag}: outside canvas`);
      if (el.parentElement && el.parentElement.closest(".slide")) {
        const p = el.parentElement.getBoundingClientRect();
        if (
          r.left < p.left - 2 ||
          r.right > p.right + 2 ||
          r.top < p.top - 2 ||
          r.bottom > p.bottom + 2
        )
          errors.push(`${tag}.${el.className}: outside parent`);
      }
      const nodes = [...el.childNodes].filter(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
      );
      if (!nodes.length) continue;
      const minimum = el.closest("footer,.topline")
        ? 24
        : el.closest("pre")
          ? 32
          : el.closest(".caption")
            ? 44
            : el.closest("h1")
              ? 64
              : 40;
      if (parseFloat(cs.fontSize) < minimum)
        errors.push(`${tag}: font below ${minimum}px`);
      for (const node of nodes) {
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects())
          if (
            rect.left < r.left - 2 ||
            rect.right > r.right + 2 ||
            rect.top < r.top - 2 ||
            rect.bottom > r.bottom + 2
          )
            errors.push(`${tag}: clipped text`);
      }
    }
    const main = document.querySelector("main")!.getBoundingClientRect(),
      cap = document.querySelector(".caption")!.getBoundingClientRect();
    if (main.bottom > cap.top) errors.push("Body overlaps subtitle region");
    return {
      errors: [...new Set(errors)],
      caption: { top: cap.top, bottom: cap.bottom },
      bodyBottom: main.bottom,
    };
  });
}
export async function wrapCaption(page: Page, text: string) {
  return page.evaluate(
    ({ text, font, size, width }) => {
      const canvas = document.createElement("canvas"),
        ctx = canvas.getContext("2d")!;
      ctx.font = `${size}px "${font}"`;
      if (ctx.measureText(text).width <= width) return text;
      const chars = Array.from(text),
        candidates: { at: number; score: number }[] = [];
      for (let i = 1; i < chars.length; i++) {
        const a = chars.slice(0, i).join(""),
          b = chars.slice(i).join("");
        if (
          /[、。！？）」』】,.;:!?]/.test(chars[i]!) ||
          /[（「『【]/.test(chars[i - 1]!)
        )
          continue;
        if (
          /[A-Za-z0-9_]/.test(chars[i - 1]!) &&
          /[A-Za-z0-9_]/.test(chars[i]!)
        )
          continue;
        const aw = ctx.measureText(a).width,
          bw = ctx.measureText(b).width;
        if (aw <= width && bw <= width)
          candidates.push({
            at: i,
            score: Math.abs(aw - bw) - (/[、。]/.test(chars[i - 1]!) ? 200 : 0),
          });
      }
      candidates.sort((a, b) => a.score - b.score);
      if (!candidates.length)
        throw new Error(
          "Caption exceeds two lines; split narration at a meaningful sentence boundary",
        );
      const i = candidates[0]!.at;
      return chars.slice(0, i).join("") + "\n" + chars.slice(i).join("");
    },
    { text, font: theme.font, size: theme.caption, width: 1664 },
  );
}
export async function renderSlides(
  story: Story,
  out: string,
  cache: string,
  storyDirectory = ROOT,
) {
  await mkdir(join(out, "slides", "fonts"), { recursive: true });
  await mkdir(join(cache, "images"), { recursive: true });
  for (const f of [
    "NotoSansJP.ttf",
    "NotoSansMono.ttf",
    "OFL.txt",
    "OFL-NotoSansMono.txt",
    "SOURCES.md",
  ])
    await copyFile(join(ROOT, "assets/fonts", f), join(out, "slides/fonts", f));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const reports: unknown[] = [],
    captions: Record<string, string> = {},
    images: string[] = [];
  let hits = 0;
  const fontHash = hash(
    await Promise.all(
      ["NotoSansJP.ttf", "NotoSansMono.ttf"].map((f) =>
        fileHash(join(ROOT, "assets/fonts", f)),
      ),
    ),
  );
  try {
    for (const [i, s] of story.slides.entries()) {
      let mediaHash: string | undefined;
      if (s.content.layout === "visual") {
        const asset = s.content.asset,
          path = resolve(storyDirectory, asset.path),
          ext = extname(path).toLowerCase();
        if (![".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext))
          throw new Error(`Slide ${s.id}: unsupported image extension`);
        const data = await readFile(path);
        if (data.length > 20 * 1024 * 1024)
          throw new Error(`Slide ${s.id}: image exceeds 20 MiB`);
        if (
          ext === ".svg" &&
          /<\s*(script|foreignObject|iframe)|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?!#)|url\(\s*["']?(?!#)/i.test(
            data.toString(),
          )
        )
          throw new Error(
            `Slide ${s.id}: SVG must be self-contained without scripts or external references`,
          );
        mediaHash = hash(data);
        await mkdir(join(out, "slides/media"), { recursive: true });
        await atomic(join(out, "slides/media", s.id + ext), data);
      }
      const html = slideHtml(story, s, i),
        htmlPath = join(out, "slides", `${s.id}.html`);
      await atomic(htmlPath, html);
      await page.goto(pathToFileURL(htmlPath).href);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((i) => i.decode()));
      });
      const report = await inspectPage(page);
      if (report.errors.length)
        throw new Error(`Slide ${s.id}: ${report.errors.join("; ")}`);
      for (const seg of s.narration) {
        try {
          captions[seg.id] = await wrapCaption(page, seg.text);
        } catch (e) {
          throw new Error(`Slide ${s.id}, segment ${seg.id}: ${e}`);
        }
        await page.locator(".caption p").textContent();
        await page
          .locator(".caption p")
          .evaluate((el, t) => (el.textContent = t), captions[seg.id]);
        const check = await inspectPage(page);
        if (check.errors.length)
          throw new Error(
            `Slide ${s.id}, segment ${seg.id}: ${check.errors.join("; ")}`,
          );
        const lines = await page
          .locator(".caption p")
          .evaluate(
            (el) =>
              el.getBoundingClientRect().height /
              parseFloat(getComputedStyle(el).lineHeight),
          );
        if (lines > 2.1)
          throw new Error(`Segment ${seg.id}: >2 rendered subtitle lines`);
      }
      await page.locator(".caption p").evaluate((el) => (el.textContent = ""));
      const key = hash({
          html,
          fontHash,
          mediaHash,
          browser: browser.version(),
        }),
        cached = join(cache, "images", `${key}.png`),
        imagePath = join(out, "slides", `${s.id}.png`);
      try {
        const b = await readFile(cached);
        if ((await readJson(cached + ".json")).sha256 !== hash(b))
          throw new Error("Image cache checksum mismatch");
        if (b.readUInt32BE(0) !== 0x89504e47) throw new Error("bad PNG");
        await atomic(imagePath, b);
        hits++;
      } catch {
        await atomic(cached, await page.screenshot({ animations: "disabled" }));
        await json(cached + ".json", { sha256: await fileHash(cached) });
        await copyFile(cached, imagePath);
      }
      images.push(imagePath);
      reports.push({ slide: s.id, ...report, segments: s.narration.length });
    }
  } finally {
    await browser.close();
  }
  await json(join(out, "layout-report.json"), {
    passed: true,
    chromiumVersion: browser.version(),
    slides: reports,
    theme,
    fontHash,
  });
  await atomic(
    join(out, "preview.html"),
    `<!doctype html><html lang="ja"><meta charset="utf-8"><title>${esc(story.title)}</title><style>body{font:20px sans-serif;margin:24px;background:#eee}img{width:100%;display:block}article{max-width:1200px;margin:24px auto;background:white;padding:16px}p{line-height:1.8}</style><h1>${esc(story.title)}</h1>${story.slides.map((s) => `<article><a href="slides/${s.id}.html"><img src="slides/${s.id}.png" alt="${esc(s.title)}"></a><p>${s.narration.map((n) => esc(n.text)).join("<br>")}</p></article>`).join("")}</html>`,
  );
  return { captions, images, hits };
}
