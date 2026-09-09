import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { chromium } from "playwright";
import { ROOT } from "../src/common.js";
import { parseStory } from "../src/schema.js";
import { slideHtml, inspectPage, wrapCaption } from "../src/slides.js";
const raw = JSON.parse(await readFile("examples/layouts.story.json", "utf8"));

test("diagram references and active positions must identify existing items", () => {
  for (const mutate of [
    (s: any) => {
      s.slides[1].content.messages[0].from = "missing";
    },
    (s: any) => {
      s.slides[1].content.messages[0].to = "browser";
    },
    (s: any) => {
      s.slides[1].content.actors[1].id = "browser";
    },
    (s: any) => {
      s.slides[1].content.messages.length = 1;
      s.slides[1].content.activeMessage = 2;
    },
    (s: any) => {
      s.slides[3].content.selected = "missing";
    },
    (s: any) => {
      s.slides[3].content.parts[1].id = "input";
    },
    (s: any) => {
      s.slides[4].content.steps.length = 2;
      s.slides[4].content.activeStep = 3;
    },
    (s: any) => {
      s.slides[4].content.activeStep = 0;
    },
  ]) {
    const candidate = structuredClone(raw);
    mutate(candidate);
    assert.throws(() => parseStory(candidate));
  }
});

test("new diagrams fit with captions; message endpoints align and staged emphasis keeps geometry", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  const story = parseStory(raw);
  const load = async (index: number) => {
    const slide = story.slides[index]!;
    await page.setContent(
      slideHtml(story, slide, index).replaceAll(
        "url('fonts/",
        `url('${pathToFileURL(join(ROOT, "assets/fonts/")).href}`,
      ),
    );
    await page.evaluate(() => document.fonts.ready);
    const caption = await wrapCaption(page, slide.narration[0]!.text);
    await page.locator(".caption p").evaluate((el, text) => {
      el.textContent = text;
    }, caption);
    assert.deepEqual((await inspectPage(page)).errors, [], slide.id);
  };
  try {
    for (let i = 0; i < story.slides.length; i++) await load(i);
    await load(1);
    const actors = await page.locator(".actor").evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return (r.left + r.right) / 2;
      }),
    );
    const sequence = story.slides[1]!.content;
    assert.equal(sequence.layout, "sequence");
    if (sequence.layout !== "sequence")
      throw new Error("Missing sequence fixture");
    for (let i = 0; i < sequence.messages.length; i++) {
      const m = sequence.messages[i]!;
      const from = sequence.actors.findIndex((a) => a.id === m.from);
      const to = sequence.actors.findIndex((a) => a.id === m.to);
      const box = await page.locator(".message").nth(i).boundingBox();
      assert.ok(box);
      assert.ok(Math.abs(box.x - Math.min(actors[from]!, actors[to]!)) < 1);
      assert.ok(
        Math.abs(box.x + box.width - Math.max(actors[from]!, actors[to]!)) < 1,
      );
      assert.equal(
        await page
          .locator(".message")
          .nth(i)
          .locator(to > from ? ".tip-right" : ".tip-left")
          .count(),
        1,
      );
    }
    sequence.activeMessage = 2;
    await load(1);
    assert.equal(
      await page.locator('.message[aria-current="step"]').count(),
      1,
    );
    assert.equal(
      await page
        .locator('.message[aria-current="step"]')
        .getAttribute("data-to"),
      "database",
    );
    let original: unknown;
    for (let i = 4; i < 7; i++) {
      await load(i);
      const geometry = await page.locator(".step").evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return [r.x, r.y, r.width, r.height];
        }),
      );
      if (original) assert.deepEqual(geometry, original);
      original = geometry;
      assert.equal(await page.locator('.step[aria-current="step"]').count(), 1);
      assert.match(
        await page.locator('.step[aria-current="step"] b').innerText(),
        new RegExp(String(i - 3)),
      );
    }
    sequence.messages[0]!.label = "<script>bad()</script>";
    await page.setContent(slideHtml(story, story.slides[1]!, 1));
    assert.equal(await page.locator("script").count(), 0);
    assert.ok(
      (await page.locator(".message p").first().textContent())?.includes(
        "<script>bad()</script>",
      ),
    );
  } finally {
    await browser.close();
  }
});
