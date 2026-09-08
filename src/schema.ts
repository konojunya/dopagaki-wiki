import { z } from "zod";
const text = z.string().trim().min(1).max(300);
const id = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const source = z
  .object({
    id,
    title: text,
    url: z.url(),
    accessed: z.iso.date(),
    kind: z.enum(["official", "implementation", "spec", "test", "inference"]),
    note: text,
    revision: z
      .string()
      .regex(/^[0-9a-f]{40}$/)
      .optional(),
    file: text.optional(),
    lines: z.tuple([z.int().positive(), z.int().positive()]).optional(),
    executed: z.boolean().optional(),
  })
  .strict();
const point = z.object({ label: text, detail: text }).strict();
const content = z.discriminatedUnion("layout", [
  z
    .object({
      layout: z.literal("key"),
      headline: text,
      points: z.array(point).min(1).max(3),
    })
    .strict(),
  z
    .object({
      layout: z.literal("compare"),
      columns: z.array(text).min(2).max(3),
      rows: z.array(z.array(text).min(2).max(3)).min(1).max(4),
      takeaway: text,
    })
    .strict(),
  z
    .object({
      layout: z.literal("flow"),
      steps: z.array(point).min(2).max(3),
      takeaway: text,
    })
    .strict(),
  z
    .object({
      layout: z.literal("code"),
      code: z.string().min(1).max(600),
      explanation: z.array(text).min(1).max(3),
      takeaway: text,
    })
    .strict(),
  z
    .object({
      layout: z.literal("visual"),
      asset: z
        .object({
          path: text,
          alt: text,
          origin: z.discriminatedUnion("kind", [
            z.object({ kind: z.literal("download"), url: z.url() }).strict(),
            z
              .object({
                kind: z.literal("generated"),
                prompt: z.string().min(1).max(2000),
              })
              .strict(),
            z
              .object({ kind: z.literal("diagram"), description: text })
              .strict(),
          ]),
        })
        .strict(),
      explanation: text,
    })
    .strict(),
  z
    .object({
      layout: z.literal("example"),
      label: text,
      cells: z.array(text).min(1).max(8),
      equation: text,
      explanation: text,
    })
    .strict(),
]);
export const storySchema = z
  .object({
    schemaVersion: z.literal("0.0.1"),
    title: text,
    question: text,
    audience: text,
    research: z
      .object({
        kind: z.enum(["concept", "repository"]),
        repository: z.url().optional(),
        revision: z
          .string()
          .regex(/^[0-9a-f]{40}$/)
          .optional(),
        dirtyDiffHash: z.string().optional(),
      })
      .strict(),
    sources: z.array(source).min(1),
    objectives: z
      .array(
        z.object({ id, question: text, slides: z.array(id).min(1) }).strict(),
      )
      .min(1),
    voice: z
      .object({
        speaker: text.default("ずんだもん"),
        style: text.default("ノーマル"),
        speed: z.number().min(0.8).max(1.4).default(1.08),
        dictionary: z.record(z.string(), text).default({}),
      })
      .strict(),
    theme: z.literal("accessible-light-v1").default("accessible-light-v1"),
    slides: z
      .array(
        z
          .object({
            id,
            title: text,
            claim: text,
            evidence: z.array(id).min(1),
            content,
            narration: z
              .array(
                z
                  .object({
                    id,
                    text: z
                      .string()
                      .trim()
                      .min(1)
                      .max(150)
                      .refine(
                        (t) => !/[\\{}\r\n\u0000-\u001f]/.test(t),
                        "Narration must be one spoken sentence without ASS control characters (backslash/braces). Put literal code in content.code.",
                      ),
                  })
                  .strict(),
              )
              .min(1)
              .max(12),
            gapBefore: z.number().min(0.3).max(3).default(1),
            gapAfter: z.number().min(0.3).max(3).default(1),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .superRefine((s, ctx) => {
    const fail = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    const unique = (ids: string[], where: string) => {
      if (new Set(ids).size !== ids.length)
        fail([where], `Duplicate ${where} IDs`);
    };
    unique(
      s.slides.map((x) => x.id),
      "slides",
    );
    unique(
      s.sources.map((x) => x.id),
      "sources",
    );
    unique(
      s.objectives.map((x) => x.id),
      "objectives",
    );
    unique(
      s.slides.flatMap((x) => x.narration.map((n) => n.id)),
      "segments",
    );
    const sources = new Set(s.sources.map((x) => x.id)),
      slides = new Set(s.slides.map((x) => x.id));
    for (const [i, slide] of s.slides.entries()) {
      for (const e of slide.evidence)
        if (!sources.has(e))
          fail(["slides", i, "evidence"], `Unknown source ${e}`);
      const c = slide.content;
      if (
        c.layout === "compare" &&
        c.rows.some((r) => r.length !== c.columns.length)
      )
        fail(["slides", i, "content"], "Comparison column count mismatch");
    }
    for (const [i, o] of s.objectives.entries())
      for (const sid of o.slides)
        if (!slides.has(sid))
          fail(["objectives", i, "slides"], `Unknown slide ${sid}`);
    for (const sid of slides)
      if (!s.objectives.some((o) => o.slides.includes(sid)))
        fail(["objectives"], `Slide ${sid} has no learning objective`);
    if (
      s.research.kind === "repository" &&
      (!s.research.repository || !s.research.revision)
    )
      fail(["research"], "Repository and pinned revision required");
    for (const [i, src] of s.sources.entries()) {
      if (
        ["implementation", "test"].includes(src.kind) &&
        (!src.revision ||
          !src.file ||
          !src.lines ||
          !src.url.includes(src.revision))
      )
        fail(
          ["sources", i],
          "Code evidence requires file, lines, revision and commit-pinned URL",
        );
      if (src.kind === "test" && src.executed === undefined)
        fail(
          ["sources", i],
          "Test evidence must distinguish inspected vs executed",
        );
      if (src.lines && src.lines[0] > src.lines[1])
        fail(["sources", i], "Invalid line range");
    }
  });
export type Story = z.infer<typeof storySchema>;
export type Slide = Story["slides"][number];
export function parseStory(value: unknown): Story {
  return storySchema.parse(value);
}
