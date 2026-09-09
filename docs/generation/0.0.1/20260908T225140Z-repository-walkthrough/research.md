# 調査記録

対象: https://github.com/konojunya/dopagaki-wiki

commit: 9f0c8e66294229e87ab01b83ddbfac0eb10f5457

未コミット変更: なし（git status --shortで確認）。

入口src/cli.tsからschema → slides → speech → timeline → videoを追跡。Skillの判断・確認手順はspec、コードの処理はimplementationとして区別した。参照URLはローカルで読んだ同一commitへ固定。

画像キャッシュはHTML・フォント・画像素材・ブラウザ、音声キャッシュは文章・発音・辞書・話者識別・設定、動画キャッシュは時刻・画像・音声・ASS・FFmpegビルド等で決まる。声や辞書を変えた場合に『1文だけ再合成』とは限らないため条件を画面と音声に明示。画像の再利用時もブラウザ検査、動画の再利用時もverifyVideoを実行する。

自作SVGは文単位の再利用を示す説明図。外部画像・ロゴ・生成画像は使用していない。
