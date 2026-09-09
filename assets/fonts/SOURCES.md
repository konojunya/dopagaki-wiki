# Bundled fonts

Downloaded 2026-09-09 from Google Fonts. The committed binaries pin the exact content used by both Chromium and libass; output manifests record font hashes.

- NotoSansJP.ttf: https://github.com/google/fonts/blob/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf — SIL Open Font License 1.1, see OFL.txt.
- NotoSansMono.ttf: https://github.com/google/fonts/blob/main/ofl/notosansmono/NotoSansMono%5Bwdth,wght%5D.ttf — SIL Open Font License 1.1, see OFL-NotoSansMono.txt.

The original font names and license notices are retained. Fonts are not sold separately. No platform font is copied into the repository.

## 字幕用の静的フォント

NotoSansJP-Regular.otf は notofonts/noto-cjk の commit `f8d157532fbfaeda587e826d4cd5b21a49186f7c` から取得。HTMLとlibassで同じ書体を使い、可変フォントの内部名によるOSフォントへの置換を防ぐ。

- https://github.com/notofonts/noto-cjk/blob/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Sans/SubsetOTF/JP/NotoSansJP-Regular.otf
- ライセンス: 同commitの Sans/LICENSE（OFL-NotoSansJP-Regular.txt に同梱）
