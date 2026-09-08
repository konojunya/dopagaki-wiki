import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const base = JSON.parse(readFileSync("examples/go-integers.story.json"));
const binary = {
  ...base,
  title: "2進数と10進数",
  question: "2進数と10進数の違いは？",
  sources: [
    {
      id: "go-literals",
      title: "Go specification: integer literals",
      url: "https://go.dev/ref/spec#Integer_literals",
      accessed: "2026-09-09",
      kind: "official",
      note: "2進数・10進数の整数リテラル。位の重みは独立に検算した。",
    },
  ],
  objectives: [
    {
      id: "bases",
      question: "同じ値を異なる基数で表せるか？",
      slides: ["bases", "visual"],
    },
  ],
  slides: [
    {
      id: "bases",
      title: "同じ値を、違う書き方で表す",
      claim: "2進数101と10進数5は同じ値。",
      evidence: ["go-literals"],
      content: {
        layout: "example",
        label: "2進数では、右から 1・2・4 の位",
        cells: ["1", "0", "1"],
        equation: "1×4 + 0×2 + 1×1 = 5",
        explanation: "2進数の 101 と、10進数の 5 は同じ値。",
      },
      narration: [
        { id: "bases-1", text: "2進数はゼロとイチで数を表すのだ。" },
        {
          id: "bases-2",
          text: "右からイチ、ニ、ヨンの位なので、イチゼロイチは十進数の5なのだ。",
        },
      ],
      gapBefore: 1,
      gapAfter: 1,
    },
    {
      id: "visual",
      title: "位ごとに重みを掛けて足す",
      claim: "各桁の重みの和で十進数の値を得る。",
      evidence: ["go-literals"],
      content: {
        layout: "visual",
        asset: {
          path: "assets/binary.svg",
          alt: "2進数101の4と0と1を足すと5",
          origin: {
            kind: "diagram",
            description: "2進数の位の重みを説明する自己完結SVG",
          },
        },
        explanation: "数字の見た目ではなく、位の重みを計算する。",
      },
      narration: [
        {
          id: "visual-1",
          text: "図のように、各けたの重みを足すと、同じ値の5になるのだ。",
        },
      ],
      gapBefore: 1,
      gapAfter: 1,
    },
  ],
};
writeFileSync(
  "examples/binary.story.json",
  JSON.stringify(binary, null, 2) + "\n",
);
const revision = execFileSync("git", ["rev-parse", "06cdeba"], {
    encoding: "utf8",
  }).trim(),
  repository = "https://github.com/konojunya/dopagaki-wiki";
const repo = {
  ...base,
  title: "音声と字幕の時間管理",
  question: "このCLIは音声と字幕の時刻をどう揃える？",
  research: { kind: "repository", repository, revision },
  sources: [
    {
      id: "timeline-code",
      title: "makeTimeline implementation",
      url: `${repository}/blob/${revision}/src/timeline.ts#L5-L10`,
      accessed: "2026-09-09",
      kind: "implementation",
      note: "ローカルcommitの実装を確認。remoteへのpushは実施していないため、URLの閲覧にはそのcommitが必要。",
      revision,
      file: "src/timeline.ts",
      lines: [5, 10],
    },
  ],
  objectives: [
    {
      id: "timing",
      question: "時間は何を基準にしているか？",
      slides: ["pipeline", "timing-example"],
    },
  ],
  slides: [
    {
      id: "pipeline",
      title: "音声の実サンプル数を、時刻の基準にする",
      claim: "実測音声のサンプル数を加算しスライドのフレーム境界へ切り上げる。",
      evidence: ["timeline-code"],
      content: {
        layout: "flow",
        steps: [
          { label: "音声を測定", detail: "48kHz の PCM\nサンプル数を得る" },
          { label: "順に加算", detail: "前後の余白と\n音声の長さを足す" },
          { label: "フレームへ", detail: "30fps の境界に\n切り上げる" },
        ],
        takeaway: "文字数の比率で音声の長さを推測しない。",
      },
      narration: [
        {
          id: "pipeline-1",
          text: "この実装では、音声の実際のサンプル数を足して、字幕の時刻を決めるのだ。",
        },
        {
          id: "pipeline-2",
          text: "スライドの終わりは映像のフレーム境界に切り上げるのだ。",
        },
      ],
      gapBefore: 1,
      gapAfter: 1,
    },
    {
      id: "timing-example",
      title: "音声 10 秒と 20 秒なら、合計 34 秒",
      claim: "各スライドの前後1秒を加えると34秒になる。",
      evidence: ["timeline-code"],
      content: {
        layout: "compare",
        columns: ["スライド", "音声", "前後込み"],
        rows: [
          ["1 枚目", "10 秒", "12 秒"],
          ["2 枚目", "20 秒", "22 秒"],
        ],
        takeaway: "12 + 22 = 34 秒。字幕は音声区間だけに表示。",
      },
      narration: [
        {
          id: "timing-example-1",
          text: "音声が10秒と20秒なら、各ページの前後1秒を加えて、合計34秒なのだ。",
        },
      ],
      gapBefore: 1,
      gapAfter: 1,
    },
  ],
};
writeFileSync(
  "examples/repository-timeline.story.json",
  JSON.stringify(repo, null, 2) + "\n",
);
const min = {
  ...base,
  slides: base.slides.slice(0, 2),
  objectives: [
    {
      id: "basics",
      question: "ビット幅と符号を理解する",
      slides: base.slides.slice(0, 2).map((s) => s.id),
    },
  ],
};
writeFileSync(
  "examples/minimal.story.json",
  JSON.stringify(min, null, 2) + "\n",
);
