import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { ROOT } from "../src/common.js";
import { parseStory } from "../src/schema.js";
import { slideHtml, inspectPage, wrapCaption } from "../src/slides.js";
const raw = JSON.parse(
  await readFile("examples/go-integers.story.json", "utf8"),
);
test("browser rejects clipping, long identifier, oversized Japanese text and >2-line captions", async () => {
  const b = await chromium.launch(),
    p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const s = parseStory(raw),
    html = slideHtml(s, s.slides[0]!, 0).replaceAll(
      "url('fonts/",
      `url('${pathToFileURL(join(ROOT, "assets/fonts/")).href}`,
    );
  try {
    await p.setContent(html);
    await p.evaluate(() => document.fonts.ready);
    assert.deepEqual((await inspectPage(p)).errors, []);
    const wrapped = await wrapCaption(
      p,
      "uint8とint8の違いは、同じビット数でも負の数を扱えるかどうかという点なのだ。",
    );
    assert.equal(
      wrapped.replaceAll("\n", ""),
      "uint8とint8の違いは、同じビット数でも負の数を扱えるかどうかという点なのだ。",
    );
    assert.ok(wrapped.split("\n").length <= 2);
    await assert.rejects(
      () => wrapCaption(p, "長い日本語の説明。".repeat(40)),
      /exceeds two lines/,
    );
    await p.locator(".headline").evaluate((el) => {
      el.textContent = "非常に長い説明".repeat(30);
      el.setAttribute("style", "height:30px;overflow:hidden");
    });
    assert.ok(
      (await inspectPage(p)).errors.some((e) => /overflow|clipped/.test(e)),
    );
    await p.setContent(html);
    await p.evaluate(() => document.fonts.ready);
    await p
      .locator(".headline")
      .evaluate(
        (el) => (el.textContent = "VeryLongUnbrokenIdentifier".repeat(20)),
      );
    assert.ok(
      (await inspectPage(p)).errors.some((e) =>
        /overflow|outside|clipped/.test(e),
      ),
    );
    await p.setContent(html);
    await p.evaluate(() => document.fonts.ready);
    await p
      .locator(".headline")
      .evaluate((el) =>
        el.setAttribute(
          "style",
          "position:absolute;transform:translateX(1px);font-size:12px",
        ),
      );
    const errors = (await inspectPage(p)).errors;
    assert.ok(errors.some((e) => e.includes("forbidden")));
    assert.ok(errors.some((e) => e.includes("font below")));
  } finally {
    await b.close();
  }
});
