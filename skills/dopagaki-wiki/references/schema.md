# story.json の入力

ランタイムの定義はリポジトリの `src/schema.ts`。配布 JSON Schema は `schemas/story.schema.json`。最初は `examples/minimal.story.json` をコピーし、IDを保って内容を置き換える。

必須トップレベル:

- schemaVersion: `0.0.1`
- title / question / audience
- research: concept または repository。repository は repository URL / revision が必須
- sources: id / title / url / accessed (`YYYY-MM-DD`) / kind / note
- objectives: id / question / slides（対応する slide ID 配列）
- voice: speaker / style / speed / dictionary
- slides: id / title / claim / evidence / content / narration / gapBefore / gapAfter

theme は `accessible-light-v1` のみ。voice は初期 `ずんだもん` / `ノーマル` / speed 1.08、dictionary は原語→発音。gap は初期各1秒。speakerの実際のIDは毎回ENGINEから解決する。各 narration 要素は一意な id と一文の text。改行はCLIが測定して入れる。バックスラッシュや波括弧をそのまま発話文に入れず、読みとして書く。コードのリテラルは content.code に置く。

## content の形

```json
{"layout":"key","headline":"一つの結論","points":[{"label":"見出し","detail":"説明"}]}
{"layout":"compare","columns":["項目","結果"],"rows":[["A","値"]],"takeaway":"意味"}
{"layout":"flow","steps":[{"label":"入力","detail":"内容"},{"label":"出力","detail":"内容"}],"takeaway":"意味"}
{"layout":"code","language":"go","code":"fmt.Println(1)","explanation":["1 が表示される"],"takeaway":"意味"}
{"layout":"example","label":"図の見方","cells":["0","1"],"equation":"結果","explanation":"意味"}
{"layout":"visual","asset":{"path":"assets/diagram.svg","alt":"図の内容","origin":{"kind":"diagram","description":"構造化した手順図"}},"explanation":"図からわかること"}
```

visual の path は story.json のある場所からの相対パス、または絶対パス。PNG / JPEG / WebP / 自己完結したSVG、20MiB以内。図を入力の任意HTMLとして埋め込まない。ダウンロードした画像は origin を `{"kind":"download","url":"https://公式の配布URL"}`、生成画像は `{"kind":"generated","prompt":"実際の生成指示"}` とする。画像ハッシュも撮影キャッシュに含める。

`key` は最大3項目、`compare` は2〜3列・4行、`flow` は2〜3段階、`code` は説明3項目まで、`example` は8セルまで。機械的な上限まで詰めず、長ければ分割する。

原文はエスケープしてDOMに置く。任意CSS・スクリプト・外部参照SVGは許可しない。JSON SchemaだけではID参照やrepository根拠の対応を検証できないので、最終的には必ずCLI validateを実行する。

`code.language` で構文ハイライトの言語を明示する。例: `go` / `javascript` / `typescript` / `python` / `bash` / `json` / `rust` / `sql` / `xml` / `css` / `yaml`。highlight.jsのcommon言語セットを使用し、自動判定は行わない。省略または未対応の言語は、HTMLをエスケープした通常のコードとして表示する。

## 関係を示す追加レイアウト

選択基準は [layouts.md](layouts.md) を参照する。

```json
{"layout":"before-after","before":{"label":"変更前の状態","detail":"説明"},"after":{"label":"変更後の状態","detail":"説明"},"takeaway":"変化の意味"}
{"layout":"sequence","actors":[{"id":"client","label":"クライアント"},{"id":"server","label":"サーバー"}],"messages":[{"from":"client","to":"server","label":"要求"},{"from":"server","to":"client","label":"応答"}],"activeMessage":1,"takeaway":"通信の意味"}
{"layout":"branch","condition":"条件を満たす？","yes":{"label":"はいの結果","detail":"説明"},"no":{"label":"いいえの結果","detail":"説明"},"takeaway":"判断の意味"}
{"layout":"focus","parts":[{"id":"input","label":"入力"},{"id":"output","label":"出力"}],"selected":"input","detail":{"label":"選んだ部分の見出し","detail":"詳細"},"takeaway":"全体との関係"}
```

`sequence` は2〜3主体、1〜3通信。actor ID はスライド内で一意、from/to は実在する別々のactorを指す。自己呼び出しは対応しない。矢印は指定した主体の列の中心同士を結び、メッセージ順が時間順となる。応答の省略は明示する。`focus` は2〜3部分で ID はスライド内で一意、selected は実在する部分を指す。概念の一覧と詳細を示す型であり、任意のアーキテクチャ図の拡大機能ではない。

`flow.activeStep` / `sequence.activeMessage` は任意で1始まりの整数。実在する段階・通信だけを選べる。段階表示は別スライドとして原稿に記述する。文字量によっては上限未満でも収まらないため、previewで必ず確認する。
