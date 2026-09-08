# 開発と検証

[README](../README.md) / 開発と検証

[セットアップ](setup.md) を終えてから、このリポジトリのルートで実行します。

## 回帰テストとE2E

```sh
npm run check
npm test
npm run test:e2e
```

`npm test` は構造、100ページの端数タイムライン、長文・クリップの拒否、実FFmpegの34秒動画と字幕表示を検証します。ChromiumとFFmpegが必要ですが、VOICEVOXへの接続は不要です。

`npm run test:e2e` は実際のVOICEVOXに接続してCLIから動画を生成し、初回・キャッシュ再利用・見た目のみ変更・1文変更・音声キャッシュ破損からの復旧を検証します。完成動画の字幕表示と無音区間、音声の欠落・クリッピングも検査します。生成物とレポートは一時ディレクトリに保存し、終了時にパスを表示します。事前に `npm run cli -- doctor --start-voicevox` で環境を確認してください。

任意の生成動画を個別に確認する場合は、`video_dir` に実際の出力先を指定します。

```sh
video_dir=/tmp/dopagaki-wiki-XXXXXX
node scripts/contact-sheet.mjs "$video_dir"
node scripts/playback-check.mjs "$video_dir"
./node_modules/.bin/tsx scripts/audio-check.ts "$video_dir"
./node_modules/.bin/tsx scripts/subtitle-check.ts "$video_dir"
```

`playback-check` はMacにあるGoogle Chromeで冒頭・中間・末尾の再生を確認します。`audio-check` は入力原稿全体のENGINEカナを確認用に記録します。カナ記録や波形の検査は、実際の発音の正しさを自動判定するものではありません。

初期教材のGoコード検算とPythonによる文字起こしは、一度の教材評価に使った補助処理のため削除しました。`docs/generation/0.0.1/` の結果は当時の比較記録として保持しています。教材中のコードを実行して確認する場合は、その教材に応じた環境を別途使い、動画生成ツールの共通依存には追加しません。

機械検査は内容の真偽や説明の自然さを証明しません。Skillは根拠・全スライド・代表フレーム・用語の読みを確認し、実施した方法と未検証事項を `quality-review.md` に記録します。

## デザインを変更したとき

色・書体・余白は [DESIGN.md](../DESIGN.md) のYAMLで管理します。`src/design.ts` が読み込み、`src/theme.ts` がCSSと字幕用テーマへ反映します。YAMLの解析にはNode.jsの `yaml` パッケージを使い、独自パーサーは実装しません。

`npm test` でトークン変更の反映、不正な参照の拒否、文字・境界のコントラストを検証します。レイアウトと実際の字幕付き動画も確認してください。形式そのものはGoogleのCLIでも確認できます（開発時の補助確認で、生成には不要です）。

```sh
npx --yes @google/design.md@0.4.0 lint DESIGN.md
```

## 変更の影響を記録する

品質・速度の比較は、同じ質問と原稿を基準に行います。実装commit、原稿・動画・デザイントークンのハッシュ、実行条件を記録し、機械検査と人の確認を区別します。Gitへ保存する場合は [比較記録の保存ルール](generation/README.md) に従ってください。
