# 使い方

[README](../README.md) / 使い方

[セットアップ](setup.md) を終えた環境で実行します。

## Skillに依頼する

Codex等で `$dopagaki-wiki` を使い、説明してほしい質問を渡します。[Skillの説明](../skills/dopagaki-wiki/SKILL.md) に沿って調査と story.json を作成します。モデルによる文章の差は残りますが、レイアウト・書体・サイズ・字幕・時間管理・エラー条件をコードで固定しています。

Skillはグローバルに登録されるため、別プロジェクトのタスクでも、例えば次のように依頼できます。

```text
$dopagaki-wiki このリポジトリの認証処理をソースコードから調べて、ずんだもんの解説動画にして
$dopagaki-wiki /path/to/another-repo のキャッシュの仕組みを動画で説明して
```

エージェントが指定先（「このリポジトリ」ならそのタスクの作業ディレクトリ）のコードを調べて原稿を作成し、グローバルSkillのCLIを起動します。対象リポジトリへのインストールは不要です。

生成する台本・画像・動画などはGit管理するコードとは別の成果物なので、既定では `/tmp/dopagaki-wiki.*` にまとめ、対話で動画とリンクを共有します。

CLIは起動に使ったNode.jsをそのまま使います。別リポジトリで異なるNode.jsを選択している場合は、対象の設定ファイルを書き換えず、対応するNode.jsでSkillを起動してください（nodenvなら `NODENV_VERSION=24.5.0 nodenv exec node <skill-dir>/scripts/run.mjs ...`）。

## CLIで直接生成する

このリポジトリのルートで実行します。`preview` と `render` は同じ出力先を使います。

```sh
npm run cli -- validate examples/go-integers.story.json
workdir=$(mktemp -d /tmp/dopagaki-wiki.XXXXXX)
npm run cli -- preview examples/go-integers.story.json --out "$workdir/result"
npm run cli -- render examples/go-integers.story.json --out "$workdir/result"
```

任意の作業ディレクトリからは、Skillの `scripts/run.mjs` を絶対パスで実行できます。

```sh
node <skill-dir>/scripts/run.mjs render /absolute/story.json
```

CLIの `--out` も省略できます。その場合は実行ごとに新しい `/tmp/dopagaki-wiki-*` を作り、出力パスを返します。プレビューから再開するときは返されたパスを `--out` に指定してください。

## 音声と接続先

`VOICEVOX_URL` の初期値は `http://127.0.0.1:50021`。生成前に doctor で接続を確認します。話者・スタイルは `/speakers` から名前で解決し、通常はずんだもんのノーマルを使用します。VOICEVOXを処理後に終了しません。

## 修正して再生成する

`--cache <directory>` を省略すると `~/Library/Caches/dopagaki-wiki`。同じ出力先で再実行できます。見た目のみ変更した場合は音声を再利用し、1文の変更では該当する音声を再生成します。原稿全体の辞書・声・速度を変更すると音声キャッシュが失効します。

動画キャッシュにはFFmpegのビルド設定とリンクライブラリのバージョンも含めます。同じFFmpegバージョンでも異なる構成のビルドへ切り替えると再エンコードし、画像・音声は再利用します。

## 出力と保存先

- `video.mp4`: 焼き込み字幕付き動画
- `preview.html`, `slides/`: 原稿を伴うHTMLプレビュー、PNG、固定レイアウトHTML
- `story.json`, `script.md`, `evidence.json`: 原稿・構成・根拠
- `timeline.json`, `subtitles.srt`, `subtitles.ass`: 実音声に基づくタイムラインと字幕
- `manifest.json`, `layout-report.json`, `validation.json`: 生成条件・時間・ハッシュ・機械検査結果
- `narration.wav`: 再利用用48kHz mono PCM。Git保存時は必要がなければ除外

成果物は `/tmp` に置き、対象・ツール双方のリポジトリへ書き込まず、commit・pushもしません。再利用キャッシュのみリポジトリ外のキャッシュ領域に保持します。Git保存を明示的に求められた場合だけ指定先に保存します。過去のバージョン比較用資料 `docs/generation/0.0.1/` は、その明示依頼で保存したものです。

比較記録の保存先・必須情報・評価基準・容量上限・追加手順は [docs/generationの保存ルール](generation/README.md) に定めています。

原稿の入力形式は [schemaのガイド](../skills/dopagaki-wiki/references/schema.md)、配色・書体・図のルールは [DESIGN.md](../DESIGN.md) を参照してください。
