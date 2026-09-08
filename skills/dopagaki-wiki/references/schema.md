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
{"layout":"code","code":"fmt.Println(1)","explanation":["1 が表示される"],"takeaway":"意味"}
{"layout":"example","label":"図の見方","cells":["0","1"],"equation":"結果","explanation":"意味"}
{"layout":"visual","asset":{"path":"assets/diagram.svg","alt":"図の内容","origin":{"kind":"diagram","description":"構造化した手順図"}},"explanation":"図からわかること"}
```

visual の path は story.json のある場所からの相対パス、または絶対パス。PNG / JPEG / WebP / 自己完結したSVG、20MiB以内。図を入力の任意HTMLとして埋め込まない。ダウンロードした画像は origin を `{"kind":"download","url":"https://公式の配布URL"}`、生成画像は `{"kind":"generated","prompt":"実際の生成指示"}` とする。画像ハッシュも撮影キャッシュに含める。

`key` は最大3項目、`compare` は2〜3列・4行、`flow` は2〜3段階、`code` は説明3項目まで、`example` は8セルまで。機械的な上限まで詰めず、長ければ分割する。

原文はエスケープしてDOMに置く。任意CSS・スクリプト・外部参照SVGは許可しない。JSON SchemaだけではID参照やrepository根拠の対応を検証できないので、最終的には必ずCLI validateを実行する。
