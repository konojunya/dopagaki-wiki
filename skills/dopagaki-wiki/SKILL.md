---
name: dopagaki-wiki
description: 質問やリポジトリの機能を、根拠付きの日本語原稿・図解・ずんだもん音声・同期字幕の解説動画にする。ローカルの VOICEVOX と、この skill に付属する CLI を使う。
---

# ずんだもん解説動画

質問を見た人が、視覚と音声のどちらからも答えを理解できる教材を作る。品質を最優先し、次に生成速度を優先する。動画は横長 16:9、1920×1080、30fps に固定する。サブエージェントは使用しない。

## 実行入口

このファイルの隣の `scripts/run.mjs` を絶対パスで実行する。作業ディレクトリには依存しない。CLI の実装はこの skill を含むリポジトリの `src/` にある。Skill のみをコピーせず、README のインストーラーでリンクする。

```sh
node <skill-dir>/scripts/run.mjs doctor --start-voicevox
node <skill-dir>/scripts/run.mjs validate /absolute/story.json
node <skill-dir>/scripts/run.mjs preview /absolute/story.json --out /absolute/output
node <skill-dir>/scripts/run.mjs render /absolute/story.json --out /absolute/output
```

CLI は LLM API を呼ばない。エージェントが調査と story.json を作り、CLI が構造・レイアウト・音声・字幕・動画を決定的に処理する。通常は同じ出力先とキャッシュで再実行し、途中の素材を再利用する。

## 教材を組み立てる

1. [research.md](references/research.md) を読み、質問への答え、必要な前提、仕組み、検算できる具体例、制約を根拠に結びつける。リポジトリなら revision を固定する。
2. [storytelling.md](references/storytelling.md) と [schema.md](references/schema.md) を読み、説明項目 `objectives` → `slides` → `evidence` の対応を作る。小さな入力例はリポジトリの `examples/minimal.story.json`、詳細な教材例は `examples/go-integers.story.json`。
3. [design-system.md](references/design-system.md) に従い、固定レイアウトを選ぶ。任意 HTML/CSS は入力しない。1枚1主張を基本にし、比較・ビット・手順などを図として示す。説明のない装飾で枚数を増やさない。
4. 原稿を自然な短文で分割する。字幕は `narration.text` と同じ文章を使う。発音だけ `voice.dictionary` で補う。字幕のために別の要約を生成しない。
5. `validate` と `preview` を実行する。違反は表示された slide / segment ID の内容を分割・修正する。文字を小さくする、隠す、位置を無理にずらす回避は禁止。自動修正を3回行っても残る問題は、原因を特定してから再構成する。
6. 全スライドのプレビューを実際に見て、質問への答え、図の正確さ、コード、読みやすさを確認する。`render` 後も [quality.md](references/quality.md) の確認を行う。機械的な合格だけで内容や音声の正しさを断言しない。

## 図・画像・ロゴを選ぶ

- 単純な比較・手順・数の構造は HTML/CSS の DOM を使う。
- SVG のほうが簡潔で正確になる図は SVG を使う。正確な数やラベルは構造化入力または確認済み SVG に置く。
- 写実的・創造的な説明素材が理解を助ける場合は、利用可能な画像生成ツールで生成してスライドに含める。生成図の文字や数値を無検証で根拠にしない。
- 特定の言語・ツールのロゴは、公式サイト・公式リポジトリ・公式配布ページなどから画像をダウンロードし、適切な位置に配置する。ロゴを似せて描き直したり、画像生成で代用したりしない。
- 画像の入手元 URL または生成プロンプトと、役割を記録する。個人利用の教材という範囲で進め、ロゴ利用だけを理由に作業を止めたり、追加の確認手順を設けたりしない。
- 画像は `visual` レイアウトの `asset` で指定する。描画が終わるまで待機し、画像を含むページにも通常の品質検査を適用する。

## 完了時

MP4 をこの会話で表示し、原稿・根拠・プレビュー・manifest・品質評価を参照できるようにする。実測の生成時間、キャッシュ利用、未検証事項を区別する。公開や他者への送信は別の依頼として扱う。成果物の Git 保存が求められた場合は、容量を確認し、再評価に必要な動画と記録を保存する。
