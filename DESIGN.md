---
version: alpha
name: DADS Blue Explanation Video
description: デジタル庁の青のキーカラーを使う、静止スライドと同期字幕の教材。
colors:
  primary: "#0017c1"
  secondary: "#264af4"
  tertiary: "#00118f"
  tint: "#e8f1fe"
  surface: "#ffffff"
  ink: "#1a1a1a"
  muted: "#4d4d4d"
  border: "#7f7f7f"
  code-background: "#f2f2f2"
  caption-background: "#e6e6e6"
  visited: "#8b008b"
  focus: "#ffd43d"
  focus-outline: "#000000"
typography:
  title:
    fontFamily: Noto Sans JP
    fontSize: 64px
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: Noto Sans JP
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.5
  code:
    fontFamily: Noto Sans Mono
    fontSize: 40px
    fontWeight: 400
    lineHeight: 1.5
  table:
    fontFamily: Noto Sans JP
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.45
  caption:
    fontFamily: Noto Sans JP
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.4
  metadata:
    fontFamily: Noto Sans JP
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.5
rounded:
  cell: 8px
  step: 16px
  callout: 16px
spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  top: 48px
  horizontal: 96px
components:
  title-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.primary}"
    borderWidth: 8px
  slide:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    width: 1920px
    height: 1080px
  headline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.title}"
  explanation:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  takeaway:
    textColor: "{colors.ink}"
    rounded: "{rounded.callout}"
  step:
    textColor: "{colors.ink}"
    rounded: "{rounded.step}"
  step-border:
    backgroundColor: "{colors.primary}"
    width: 4px
  flow-arrow:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
  cell:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.tertiary}"
    rounded: "{rounded.cell}"
  code:
    backgroundColor: "{colors.code-background}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
  code-keyword:
    backgroundColor: "{colors.code-background}"
    textColor: "{colors.primary}"
  code-literal:
    backgroundColor: "{colors.code-background}"
    textColor: "{colors.tertiary}"
  code-comment:
    backgroundColor: "{colors.code-background}"
    textColor: "{colors.muted}"
  table:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    typography: "{typography.table}"
  caption:
    backgroundColor: "{colors.caption-background}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    height: 160px
  metadata:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.metadata}"
  divider:
    backgroundColor: "{colors.border}"
    height: 2px
  preview-link:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.tertiary}"
  preview-link-visited:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.visited}"
  preview-link-focus:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.focus-outline}"
---

# dopagaki-wiki Design System

## Overview

質問の答えを、文字・図・音声のどちらからも理解できる教材にする。白を広く使い、本文は濃いグレー、主要な結論は青。装飾よりも情報の階層と読みやすさを優先する。

[GoogleのDESIGN.md形式](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md) に沿い、YAMLに具体値、本文に適用理由を記す。[src/design.ts](src/design.ts) がこのYAMLを読み、[src/theme.ts](src/theme.ts) がスライドへ反映する。色・文字スタイルを別の資料に複製しない。形式全体を解釈する汎用レンダラーではなく、この教材が使用するトークンを検証して適用する。

参照日: 2026-09-09。デジタル庁デザインシステムβ版 v2.17.1の [カラー](https://design.digital.go.jp/dads/foundations/color/)、[青のキーカラー例](https://design.digital.go.jp/dads/images/foundations/color/overview/key_color_blue.png)、[配布CSS](https://design.digital.go.jp/dads/assets/BovAeSFI.css) を照合した。

## Colors

| トークン                  | デジタル庁での値・役割                           | この動画での使用                           |
| ------------------------- | ------------------------------------------------ | ------------------------------------------ |
| `primary`                 | Blue-900。青のキーカラー例のプライマリー         | 上部の識別表示、結論、説明枠のアクセント   |
| `secondary`               | Blue-700。同例のセカンダリー                     | 処理の向きを示す矢印                       |
| `tertiary`                | Blue-1000。同例のターシャリー、配布CSSのリンク色 | ビット図・式、HTMLプレビューのリンク       |
| `tint`                    | Blue-50。同例の背景色                            | 説明枠・表の見出し背景。文字色には使わない |
| `surface` / `ink`         | White / Solid Gray-900                           | スライド背景、通常の見出し・本文・字幕     |
| `muted` / `border`        | Solid Gray-700 / Solid Gray-500                  | 出典・補助情報、意味のある区切り線         |
| `code-background`         | Solid Gray-50                                    | コードとプレビュー外周の背景               |
| `caption-background` | Solid Gray-100 | 字幕領域へ70%の不透明度で適用 |
| `visited`                 | Magenta-900                                      | HTMLの訪問済みリンク                       |
| `focus` / `focus-outline` | Yellow-300 / Black                               | HTMLのキーボードフォーカス                 |

公式では青を主要な操作・情報の識別に使い、共通の本文・背景・境界にはニュートラル色を使う。動画内の結論や図へ青を割り当てるのは、この教材向けの適用判断。すべての文字を青にはしない。表のラベルと本文は同じ濃いグレーとし、太さ・配置・背景で階層を付ける。

旧テーマのGreen-900/50も公式パレットの色だが、選択はこのプロジェクト独自のものだった。今後は上記の青を採用する。成功・エラー等の状態を導入する場合は [公式の意味づけ](https://design.digital.go.jp/dads/foundations/color/) を確認し、緑や赤を装飾目的で増やさない。

テキストは実際の背景とのコントラスト4.5:1以上、区切り線・意味のある図形は3:1以上とする。淡い青と白の境界だけに意味を持たせない。色だけで符号・順序・良否を区別しない。

## Typography

[DADSの書体](https://design.digital.go.jp/dads/foundations/typography/) と [テキストスタイル](https://design.digital.go.jp/dads/foundations/typography/text-style/) を基に、1080p動画向けにサイズを設定する。

タイトルは64px/1.4/700、本文は48px/1.5/400、コードは40px/1.5/400、字幕は48px/1.4/400。表は既存の4行レイアウトを保つ48px/1.45/400とする。本文とコードの大きさはWeb向けの24px・20pxから拡大した教材側の判断である。日本語はNoto Sans JP、コードはNoto Sans Mono。フォントとOFLは [assets/fonts](assets/fonts/) に同梱する。

長い説明はページを分ける。収めるために文字を小さくしない。字幕は原稿を要約せず、実測して2行以内に収める。

## Layout

16:9、1920×1080、30fpsに固定。内側余白は左右96px、上48px、下32px。上部識別表示・タイトル・本文・字幕・出典をGridで分け、字幕用の160pxを常に確保する。本文は通常フロー、Grid、Flexで配置する。座標配置やtransformで重なりを回避しない。

8px単位を基礎とし、16・24・32pxなどで区切る。既存のテンプレートには内容別に12・20・28px等の補助間隔もある。すべての寸法がDADSのWeb部品と同じという意味ではない。横向きスマートフォン相当の844×475でも確認する。

## Elevation & Depth

静止教材では影・ぼかし・グラデーションを使わない。白地、淡い背景、境界線と余白でグループを表す。

## Shapes

表は角を丸めない。補足文のcalloutは16pxの角丸を使う。ビットのセルは8px、手順の箱は16pxの角丸を使う。手順の箱は塗りなし・primary（Blue-900）の4pxの枠線とし、色だけで順序を示さない。

## Components

| layout    | 内容                      |
| --------- | ------------------------- |
| `title`   | 冒頭のタイトルと今回話すこと（1〜3点） |
| `key`     | 一つの結論と3点以内の要点 |
| `compare` | 2〜3列、4行以内の比較     |
| `flow`    | 2〜3段階の処理と矢印      |
| `code`    | 短いコードと3点以内の説明 |
| `example` | 最大8セルの図と式         |
| `visual`  | SVG・画像と説明           |

DOMで表せる構造はDOM、SVGの方が簡潔な図はSVGを使う。創造的な素材が理解を助ける場合は画像生成を利用する。言語・ツールのロゴは公式配布元からダウンロードし、生成で代用しない。画像の元URL・生成プロンプトは `asset.origin` に記録する。詳細な入力形式は [原稿のガイド](skills/dopagaki-wiki/references/schema.md) を参照。

compare / flow / code / example / visual の補足文は、先頭に必ず 💡 を置き、背景色を付けず、四辺をprimary（Blue-900）の2pxの枠線で囲む。複数行でもアイコンは先頭に一つとする。

code の右側は通常の番号付きリスト（1. / 2. / 3.）にする。構文ハイライトは明示した言語を使い、キーワードをBlue-900、文字列・数値・関数名をBlue-1000、コメントをSolid Gray-700で表示する。色数を増やさず、コード本文と改行を保つ。

字幕の背景は文章の実測幅と行数に合わせて伸縮し、上下12px・左右16pxの余白を付ける。Solid Gray-100（#e6e6e6）を70%の不透明度で敷き、文字自体は透過させない。下部160pxは安全領域として確保し、その中央に背景と字幕を置く。無音時は両方とも表示しない。HTMLで測った矩形を動画ではASSの図形として同期描画する。PDFには表示しない。字幕には同梱の静的Noto Sans JP Regularを使い、HTMLのemとlibassのフォント高さの差をメトリクスから補正する。

画面のフッターは出典のみを表示し、音声クレジットを常時表示しない。生成した台本には音声クレジットを残す。

動画の青い文字はインタラクティブなリンクではない。HTMLプレビューの実リンクは青と下線を組み合わせ、訪問済みはマゼンタ、フォーカスは黄色と黒で示す。[公式のリンク指針](https://design.digital.go.jp/dads/foundations/link-text/) を参照。動画にボタンやフォームの状態を持ち込まない。

## Do's and Don'ts

タイトルコールは1枚目に置く。白地にprimaryの8pxの四辺枠を使い、角丸・影・画像による装飾は加えない。枠内に既存のタイトル書体と「今回話すこと」の短い箇条書きを1〜3点置く。枠内余白は48px、見出しと話題の間は32px。字幕は枠外の既存160px領域に表示し、PDFでは非表示にする。

- 一枚一主張を基本にし、見出し・図・字幕を同じ答えに結びつける。
- `DESIGN.md` の値を更新し、プレビューと実動画を検査する。生成モデルに任意の配色を選ばせない。
- 要素数の上限だけで合格とせず、長い識別子・日本語・図を実際に表示して確認する。
- デザイン上の色と、ダウンロードした公式ロゴの色を混同しない。ロゴは勝手に青へ変換しない。
- デジタル庁の基礎仕様と、この動画向けの寸法・役割の適用を区別する。公式サイトの完全な複製やデジタル庁の認証を意味しない。
- 比較資料の保存時は [保存ルール](docs/generation/README.md) に従い、旧動画は上書きしない。

### スライドPDF

動画と同じ16:9・1スライド1ページとし、本文・図・出典・ページ番号・配置を維持する。字幕の文章と灰色の帯はPDFには入れない。字幕領域は白い余白として残し、本文を拡大・再配置しない。HTMLから文字・線をPDFへ出力し、スライド全体を画像化しない。

### 関係を示す図解と段階表示

- `before-after` は同じ対象の変更前と変更後を左右に並べ、間に矢印を置く。変更後は青の淡色背景で示す。
- `sequence` は主体を等幅の列にし、通信を上から順に配置する。矢印の端は主体の列の中心に揃える。2〜3主体・最大3通信とし、長い説明は別ページに分ける。
- `branch` は上に条件、下の左右に「はい」「いいえ」の結果を示す。成功・失敗の色には依存しない。
- `focus` は左に構成部分の一覧、右に選択した部分の詳細を置く。選択は青の淡色背景・太字・三角の記号を併用する。
- 新しい図のパネルは2pxのprimary色borderと16pxの角丸。本文48px、補助見出しと通信ラベル40px。既存のflowの枠は4pxを維持する。
- `flow.activeStep` / `sequence.activeMessage` は選択項目に青の淡色背景を付け、記号または線の太さでも強調する。非選択項目の文字を薄くしない。段階表示は固定した図の強調箇所だけを変えた複数スライドで構成し、配置を動かさない。
