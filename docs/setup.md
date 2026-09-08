# セットアップ

[README](../README.md) / セットアップ

macOSで動画生成環境を準備し、グローバルSkillを登録します。[VOICEVOXアプリ](https://voicevox.hiroshiba.jp/) を先にインストールし、以下のコマンドはこのリポジトリのルートで実行してください。

## 導入する

```sh
# nodenvの場合（他のNode.js管理ツールでも可）
nodenv install -s 24.5.0
nodenv local 24.5.0
brew install ffmpeg-full
npm ci
npm run setup
open -a VOICEVOX
npm run cli -- doctor --start-voicevox
npm run skill:install
```

## 必要な環境

Node.jsの検証バージョンを [.node-version](../.node-version) に記録し、インストール・切り替えは利用者のnodenv等に任せます。対応範囲は [package.json](../package.json) の `engines.node`（24.5.0以上の24系）です。

FFmpeg・ffprobeはHomebrewでグローバルに導入します。字幕描画用libassを含む [ffmpeg-full](https://formulae.brew.sh/formula/ffmpeg-full) が必要です。

VOICEVOXアプリは別途インストールが必要です。

Chromiumはnpmで固定したPlaywrightが対応ビルドを管理します。日本語・コード用フォントは [assets/fonts/](../assets/fonts/) に同梱しています。

動画生成とこのリポジトリの回帰テストにaqua・Go・Python・uvは不要です。

## Skillの登録先

Skillインストールは `~/.codex/skills/dopagaki-wiki` からこのリポジトリへのシンボリックリンクです。`CODEX_HOME` があればそちらを使います。既存の別Skillは上書きしません。リポジトリを動かしたらリンクを張り直してください。Skillだけのコピーでは動きません。

## FFmpegの実行パス

FFmpeg・ffprobeは `FFMPEG_PATH` / `FFPROBE_PATH` の明示指定、Homebrewの `opt/ffmpeg-full/bin`、通常のHomebrew配置、PATHの順で探します。Homebrewの配置は `HOMEBREW_PREFIX` またはmacOSの標準パスから解決します。doctorは解決した実行パスとバージョン、字幕対応を確認します。

準備ができたら [使い方](usage.md) へ進んでください。
