import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { design, parseDesign, componentColor } from "../src/design.js";
import { buildTheme } from "../src/theme.js";

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((v) => {
      const n = parseInt(v, 16) / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
test("DESIGN.md component text and meaningful boundaries meet contrast requirements", () => {
  for (const [name, values] of Object.entries(design.components)) {
    if (!values.textColor || !values.backgroundColor) continue;
    const ratio = contrast(
      componentColor(design, name, "textColor"),
      componentColor(design, name, "backgroundColor"),
    );
    assert.ok(ratio >= 4.5, `${name}: ${ratio}`);
  }
  for (const background of [design.colors.surface, design.colors.tint])
    assert.ok(contrast(design.colors.border, background) >= 3);
});
test("design token and component reference changes affect rendering and its fingerprint", () => {
  const changed = structuredClone(design),
    before = buildTheme(design);
  changed.colors.primary = "#0031d8";
  changed.typography.body.fontSize = "52px";
  changed.components.headline.textColor = "{colors.tertiary}";
  const after = buildTheme(changed);
  assert.equal(after.theme.accent, design.colors.tertiary);
  assert.equal(after.theme.body, 52);
  assert.ok(after.css.includes("font-size:52px"));
  assert.ok(after.previewCss.includes("#0031d8"));
  assert.notEqual(after.theme.designSha256, before.theme.designSha256);
  assert.notEqual(after.css, before.css);
});
test("malformed tokens, dangling references and incompatible canvas sizes fail", async () => {
  const markdown = await readFile(
    new URL("../DESIGN.md", import.meta.url),
    "utf8",
  );
  assert.throws(() =>
    parseDesign(markdown.replace('"#0017c1"', '"not-a-color"')),
  );
  assert.throws(
    () => parseDesign(markdown.replace("{colors.primary}", "{colors.missing}")),
    /Unknown design token/,
  );
  assert.throws(
    () => parseDesign(markdown.replace("width: 1920px", "width: 1280px")),
    /1920x1080/,
  );
});
