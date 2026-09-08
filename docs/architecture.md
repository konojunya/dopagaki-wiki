# 生成の仕組み

[README](../README.md) / 生成の仕組み

エージェントが調査と原稿作成、CLIが構造化データの検証と映像化を担当します。CLIからLLM APIを呼ぶことはありません。

## 動画になるまで

1. 質問・対象リポジトリを調査し、根拠と原稿を作る。
2. 入力を検証し、HTMLスライドをChromiumで描画する。
3. VOICEVOXで音声を合成し、実音声から字幕時刻を算出する。
4. FFmpegで合成し、尺・音量・字幕・デコードを検査する。
5. エージェントが内容・見た目・音声を確認し、対話で共有する。

モデルによる調査や文章の差は残ります。配色・書体・サイズ・レイアウト・字幕・時間管理・エラー条件はコードとデザイントークンで揃えます。

## 実装の入口

| ファイル | 担当 |
| --- | --- |
| [DESIGN.md](../DESIGN.md) | 配色・文字スタイル・余白・コンポーネントの値と使い方 |
| [src/design.ts](../src/design.ts) | DESIGN.mdのYAML読み込み・検証・参照解決 |
| [src/theme.ts](../src/theme.ts) | トークンからCSSと字幕用テーマを組み立てる |
| [src/schema.ts](../src/schema.ts) | 原稿の構造と根拠参照の検証 |
| [src/slides.ts](../src/slides.ts) | 固定HTML、撮影、レイアウト検査 |
| [src/speech.ts](../src/speech.ts) | VOICEVOX通信・読み辞書・音声キャッシュ |
| [src/timeline.ts](../src/timeline.ts) | 実音声のサンプル数に基づく時刻・字幕 |
| [src/video.ts](../src/video.ts) | 音量調整・合成・完成動画の検査 |
| [src/cli.ts](../src/cli.ts) | 一連の実行と条件・結果の記録 |

## 映像と字幕

出力は16:9、1920×1080、30fps、H.264/AACのMP4。静止スライドを切り替えます。字幕は原稿と同じ文章を使い、文字数から時間を推測しません。

FFmpegではフレームを30fpsで用意してからASS字幕を描画します。静止画を先に字幕付きにして最後に複製すると、表示中に字幕が更新されなくなるためです。

キャッシュの使い分けと出力ファイルは [使い方](usage.md)、回帰テストは [開発と検証](development.md) を参照してください。

## デザインと素材

配色・書体・図・画像・ロゴの扱いは [DESIGN.md](../DESIGN.md) にまとめています。そこにあるYAMLの値を実行時に読むため、説明資料と実装で色を二重管理しません。生成モデルが任意のHTML/CSSを入力する構成ではありません。

音声のクレジット `VOICEVOX:ずんだもん` は全ページに表示します。キャラクター立ち絵は使用していません。[VOICEVOX規約](https://voicevox.hiroshiba.jp/term/)、[音声ライブラリの案内](https://voicevox.hiroshiba.jp/product/zundamon/) と [同梱フォントの配布元・OFL](../assets/fonts/SOURCES.md) を参照してください。

当初の設計意図は [実装プラン](implementation-plan.md)、初期実装で採用した判断は [0.0.1の記録](generation/0.0.1/decisions.md) に残しています。
