import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { z } from "zod";
import { hash } from "./common.js";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const px = z.string().regex(/^\d+(?:\.\d+)?px$/);
const typography = z.object({
  fontFamily: z.enum(["Noto Sans JP", "Noto Sans Mono"]),
  fontSize: px,
  fontWeight: z.union([z.literal(400), z.literal(700)]),
  lineHeight: z.number().min(1.4).max(2),
});
const schema = z.object({
  name: z.string(),
  colors: z.object(
    Object.fromEntries(
      [
        "primary",
        "secondary",
        "tertiary",
        "tint",
        "surface",
        "ink",
        "muted",
        "border",
        "code-background",
        "caption-background",
        "visited",
        "focus",
        "focus-outline",
      ].map((key) => [key, hex]),
    ),
  ),
  typography: z.object({
    title: typography,
    body: typography,
    code: typography,
    table: typography,
    caption: typography,
    metadata: typography,
  }),
  rounded: z.object({ cell: px, step: px }),
  spacing: z.object({
    xs: px,
    sm: px,
    md: px,
    lg: px,
    top: px,
    horizontal: px,
  }),
  components: z.record(z.string(), z.record(z.string(), z.string())),
});

export function parseDesign(markdown: string) {
  const frontmatter = markdown.match(
    /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
  )?.[1];
  if (!frontmatter) throw new Error("DESIGN.md needs YAML frontmatter");
  const tokens = schema.parse(parse(frontmatter));
  for (const component of Object.values(tokens.components))
    for (const value of Object.values(component))
      resolveReference(tokens, value);
  if (
    tokens.components.slide?.width !== "1920px" ||
    tokens.components.slide?.height !== "1080px" ||
    tokens.components.caption?.height !== "160px"
  )
    throw new Error(
      "DESIGN.md must preserve 1920x1080 and the 160px caption region",
    );
  return tokens;
}
export const design = parseDesign(
  readFileSync(new URL("../DESIGN.md", import.meta.url), "utf8"),
);
export const designSha256 = hash(design);
export const pixels = (value: string) => Number(value.slice(0, -2));

export type Design = z.infer<typeof schema>;
export function resolveReference(tokens: Design, value: string): unknown {
  if (!value.startsWith("{")) return value;
  const path = value.match(/^\{([\w.-]+)\}$/)?.[1];
  if (!path) throw new Error("Invalid design token reference: " + value);
  let result: unknown = tokens;
  for (const part of path.split(".")) {
    if (!result || typeof result !== "object" || !Object.hasOwn(result, part))
      throw new Error("Unknown design token reference: " + value);
    result = (result as Record<string, unknown>)[part];
  }
  return result;
}
export function componentValue(
  tokens: Design,
  name: string,
  property: string,
): unknown {
  const value = tokens.components[name]?.[property];
  if (value === undefined)
    throw new Error("Missing design component value: " + name + "." + property);
  return resolveReference(tokens, value);
}
export const componentColor = (
  tokens: Design,
  name: string,
  property: string,
) => hex.parse(componentValue(tokens, name, property));
export const componentTypography = (tokens: Design, name: string) =>
  typography.parse(componentValue(tokens, name, "typography"));
