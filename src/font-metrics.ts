import { readFileSync } from "node:fs";

// CSS sizes an em; libass sizes the font's ascender-to-descender span.
// Read the bundled font so the two renderers use the same visible text size.
const font = readFileSync(
  new URL("../assets/fonts/NotoSansJP-Regular.otf", import.meta.url),
);
const tables = new Map<string, number>();
for (let i = 0; i < font.readUInt16BE(4); i++) {
  const record = 12 + i * 16;
  tables.set(
    font.toString("ascii", record, record + 4),
    font.readUInt32BE(record + 8),
  );
}
const head = tables.get("head"),
  hhea = tables.get("hhea");
if (head === undefined || hhea === undefined)
  throw new Error("Caption font is missing TrueType metrics");
export const assFontScale =
  (font.readInt16BE(hhea + 4) - font.readInt16BE(hhea + 6)) /
  font.readUInt16BE(head + 18);
