import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { parseStory } from "../src/schema.js";
import { renderSlides } from "../src/slides.js";

test("PDF preserves slide order, searchable Japanese and dimensions, omits subtitles and repairs cache", async () => {
  const dir = await mkdtemp(join(tmpdir(), "dopagaki-pdf-test-"));
  try {
    const story = parseStory(
      JSON.parse(await readFile("examples/layouts.story.json", "utf8")),
    );
    story.slides[0]!.narration[0]!.text = "字幕だけにある秘密の合言葉なのだ。";
    const out = join(dir, "out"),
      cache = join(dir, "cache");
    const cold = await renderSlides(story, out, cache);
    assert.equal(cold.pdf.hit, false);
    const loading = getDocument({
      data: new Uint8Array(await readFile(cold.pdf.target)),
      useSystemFonts: true,
    });
    const pdf = await loading.promise;
    try {
      assert.equal(pdf.numPages, story.slides.length);
      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        assert.deepEqual(page.view, [0, 0, 1440, 810]);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join("")
          .normalize("NFKC")
          .replaceAll(/\s/g, "");
        assert.ok(
          text.includes(story.slides[i]!.title.replaceAll(/\s/g, "")),
          `Page ${i + 1}: missing Japanese title`,
        );
        assert.ok(!text.includes("秘密の合言葉"));
      }
    } finally {
      await loading.destroy();
    }
    story.slides[0]!.narration[0]!.text = "読み上げの文章だけ変更したのだ。";
    const warm = await renderSlides(story, out, cache);
    assert.equal(warm.pdf.hit, true);
    assert.equal(warm.pdf.sha256, cold.pdf.sha256);
    const { readdir } = await import("node:fs/promises");
    const cached = (await readdir(join(cache, "pdf"))).find((f) =>
      f.endsWith(".pdf"),
    )!;
    await writeFile(join(cache, "pdf", cached), "broken cache");
    const repaired = await renderSlides(story, out, cache);
    assert.equal(repaired.pdf.hit, false);
    assert.ok(repaired.pdf.bytes > 1000);
    story.slides[0]!.title = "画面の変更はPDFにも反映する";
    const changed = await renderSlides(story, out, cache);
    assert.equal(changed.pdf.hit, false);
    assert.notEqual(changed.pdf.sha256, repaired.pdf.sha256);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
