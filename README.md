# dopagaki-wiki

質問を、根拠付きのスライド・ずんだもん音声・字幕の解説動画にする Agent Skill とローカル CLI。エージェントが調査と原稿を担当し、CLI が検証と映像化を担当します。生成時に LLM API は使いません。

初期成果物: [Go の整数型の解説動画と評価記録](docs/generation/0.0.1/README.md)。横長16:9、1920×1080、30fps、H.264/AACのMP4に固定しています。

## macOS への導入

```sh
aqua install
npm ci
npm run setup
open -a VOICEVOX
npm run cli -- doctor --start-voicevox
npm run skill:install
```

Node.js / FFmpeg・ffprobe / 検算用Goは `aqua.yaml` で固定します。VOICEVOXアプリは別途インストールが必要です。Chromiumはnpmで固定したPlaywrightが対応ビルドを管理します。日本語・コード用フォントは `assets/fonts/` に同梱しています。

Skillインストールは `~/.codex/skills/dopagaki-wiki` からこのリポジトリへのシンボリックリンクです。`CODEX_HOME` があればそちらを使います。既存の別Skillは上書きしません。リポジトリを動かしたらリンクを張り直してください。Skillだけのコピーでは動きません。

## 動画を作る

Codex等で `$dopagaki-wiki` を使い、説明してほしい質問を渡します。[Skillの説明](skills/dopagaki-wiki/SKILL.md) に沿って調査と story.json を作成します。モデルによる文章の差は残りますが、レイアウト・書体・サイズ・字幕・時間管理・エラー条件をコードで固定しています。

```sh
npm run cli -- validate examples/go-integers.story.json
npm run cli -- preview examples/go-integers.story.json --out output/my-video
npm run cli -- render examples/go-integers.story.json --out output/my-video
```

任意の作業ディレクトリからは、Skillの `scripts/run.mjs` を絶対パスで実行できます。FFmpegの場所はリポジトリのaqua設定から解決します。

`VOICEVOX_URL` の初期値は `http://127.0.0.1:50021`。生成前に doctor で接続を確認します。話者・スタイルは `/speakers` から名前で解決し、通常はずんだもんのノーマルを使用します。VOICEVOXを処理後に終了しません。

`--cache <directory>` を省略すると `~/Library/Caches/dopagaki-wiki`。同じ出力先で再実行できます。見た目のみ変更した場合は音声を再利用し、1文の変更では該当する音声を再生成します。原稿全体の辞書・声・速度を変更すると音声キャッシュが失効します。

## 出力

- `video.mp4`: 焼き込み字幕付き動画
- `preview.html`, `slides/`: 原稿を伴うHTMLプレビュー、PNG、固定レイアウトHTML
- `story.json`, `script.md`, `evidence.json`: 原稿・構成・根拠
- `timeline.json`, `subtitles.srt`, `subtitles.ass`: 実音声に基づくタイムラインと字幕
- `manifest.json`, `layout-report.json`, `validation.json`: 生成条件・時間・ハッシュ・機械検査結果
- `narration.wav`: 再利用用48kHz mono PCM。Git保存時は必要がなければ除外

成果物は、説明対象のコードリポジトリ外に置くのが通常です。このツール自体の `output/` はGit対象外です。今回のバージョン比較用資料だけは `docs/generation/0.0.1/` に明示的に保存しています。

## 品質と再検証

```sh
npm run check
npm test
node scripts/go-check.mjs
./node_modules/.bin/tsx scripts/cache-check.ts
node scripts/contact-sheet.mjs output/my-video
node scripts/playback-check.mjs output/my-video
./node_modules/.bin/tsx scripts/audio-check.ts output/my-video
```

`npm test` は構造、100ページの端数タイムライン、長文・クリップの拒否、実FFmpegの34秒動画と字幕表示を検証します。`playback-check` はMacにあるGoogle Chromeで冒頭・中間・末尾の再生を確認します。音声認識による補助確認は任意です。

```sh
aqua exec -- uv run --with mlx-whisper==0.4.3 python scripts/asr-check.py output/my-video/narration.wav output/my-video/review/asr.json
```

ASRは初回に公開モデルとPython依存をダウンロードします。音声は外部サービスに送信しません。動画生成には不要です。

機械検査は内容の真偽や説明の自然さを証明しません。Skillは根拠・全スライド・代表フレーム・用語の読みを確認し、実施した方法と未検証事項を `quality-review.md` に記録します。

## デザインと画像

[デジタル庁デザインシステム](https://design.digital.go.jp/dads/) のカラー・書体・コントラスト・文字スタイルに準拠した固定テーマです。[採用仕様](skills/dopagaki-wiki/references/design-system.md) に動画向け拡大と字幕領域を記録しています。

5種類の基本レイアウトに、SVG・画像用の `visual` を追加しています。図はDOMまたはSVG、創造的な素材は必要に応じて画像生成、言語・ツールのロゴは公式配布元からのダウンロードを使います。画像は原稿ファイルに入手元URL・生成プロンプトとともに指定します。

音声のクレジット `VOICEVOX:ずんだもん` は全ページに自動表示します。キャラクター立ち絵は使用していません。[VOICEVOX規約](https://voicevox.hiroshiba.jp/term/)、[音声ライブラリの案内](https://voicevox.hiroshiba.jp/product/zundamon/) と同梱フォントのOFLを参照してください。
