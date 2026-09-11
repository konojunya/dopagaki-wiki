import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { chromium } from "playwright";
import { ROOT, RATE } from "../src/common.js";
import { parseStory } from "../src/schema.js";
import { slideHtml, inspectPage, wrapCaption } from "../src/slides.js";
import { makeTimeline, validateTimeline } from "../src/timeline.js";
const raw = JSON.parse(await readFile("examples/minimal.story.json", "utf8"));

test("title call accepts 1–3 topics only at the start and retains narration in the video timeline", () => {
  for (const topics of [[], ["A", "B", "C", "D"]]) {
    const candidate = structuredClone(raw);
    candidate.slides[0].content.topics = topics;
    assert.throws(() => parseStory(candidate));
  }
  const misplaced = structuredClone(raw);
  misplaced.slides.reverse();
  assert.throws(() => parseStory(misplaced), /first slide/);
  const story = parseStory(raw);
  const timeline = makeTimeline(
    story,
    Object.fromEntries(
      story.slides.flatMap((s) => s.narration.map((n) => [n.id, RATE])),
    ),
  );
  validateTimeline(timeline);
  assert.equal(timeline.slides[0]!.id, "title-call");
  assert.equal(timeline.slides[0]!.startFrame, 0);
  assert.equal(timeline.slides[1]!.startFrame, timeline.slides[0]!.endFrame);
  assert.equal(timeline.segments[0]!.text, story.slides[0]!.narration[0]!.text);
});

test("title card fits a two-line title, three topics and captions with a Primary border", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  try {
    const story = parseStory(raw),
      slide = story.slides[0]!;
    slide.title = "Goの整数型を理解するための、ビット幅と符号の入門";
    await page.setContent(
      slideHtml(story, slide, 0).replaceAll(
        "url('fonts/",
        `url('${pathToFileURL(join(ROOT, "assets/fonts/")).href}`,
      ),
    );
    await page.evaluate(() => document.fonts.ready);
    for (const segment of slide.narration) {
      const caption = await wrapCaption(page, segment.text);
      await page.locator(".caption p").evaluate((el, text) => {
        el.textContent = text;
      }, caption);
      assert.deepEqual((await inspectPage(page)).errors, []);
    }
    assert.deepEqual(
      await page.locator(".title-card").evaluate((el) => {
        const style = getComputedStyle(el);
        return [
          style.borderTopWidth,
          style.borderTopColor,
          style.backgroundColor,
        ];
      }),
      ["8px", "rgb(0, 23, 193)", "rgb(255, 255, 255)"],
    );
    assert.equal(await page.locator(".title-agenda li").count(), 3);
    if (slide.content.layout !== "title")
      throw new Error("Missing title fixture");
    slide.content.topics = ["<script>alert(1)</script>"];
    await page.setContent(slideHtml(story, slide, 0));
    assert.equal(await page.locator("script").count(), 0);
    assert.equal(
      await page.locator("li").textContent(),
      slide.content.topics[0],
    );
  } finally {
    await browser.close();
  }
});
