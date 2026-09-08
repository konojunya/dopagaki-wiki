import {
  design,
  pixels,
  componentColor,
  componentTypography,
  resolveReference,
  type Design,
} from "./design.js";
import { hash } from "./common.js";
export function buildTheme(design: Design) {
  const colors = design.colors;
  const color = (name: string, property = "textColor") =>
    componentColor(design, name, property);
  const type = {
    title: componentTypography(design, "headline"),
    body: componentTypography(design, "explanation"),
    code: componentTypography(design, "code"),
    table: componentTypography(design, "table"),
    caption: componentTypography(design, "caption"),
    metadata: componentTypography(design, "metadata"),
  };
  const theme = {
    version: "accessible-light-v1.1.0",
    designSha256: hash(design),
    width: pixels(design.components.slide.width),
    height: pixels(design.components.slide.height),
    title: pixels(type.title.fontSize),
    body: pixels(type.body.fontSize),
    code: pixels(type.code.fontSize),
    caption: pixels(type.caption.fontSize),
    captionTop: 832,
    captionHeight: pixels(design.components.caption.height),
    captionMargin: 112,
    captionBottom: 100,
    font: type.caption.fontFamily,
    ink: color("slide"),
    captionInk: color("caption"),
    captionBackground: color("caption", "backgroundColor"),
    captionBold: type.caption.fontWeight === 700,
    muted: color("metadata"),
    accent: color("headline"),
    tint: color("explanation", "backgroundColor"),
    background: color("slide", "backgroundColor"),
  };
  const css = `
@font-face{font-family:'Noto Sans JP';src:url('fonts/NotoSansJP.ttf');font-weight:100 900;font-display:block}
@font-face{font-family:'Noto Sans Mono';src:url('fonts/NotoSansMono.ttf');font-weight:100 900;font-display:block}
*{box-sizing:border-box}html,body{margin:0;background:${colors["code-background"]};color:${theme.ink};font-family:'${type.body.fontFamily}',sans-serif;font-weight:${type.body.fontWeight}}body{width:${theme.width}px}
.slide{width:${theme.width}px;height:${theme.height}px;padding:${design.spacing.top} ${design.spacing.horizontal} ${design.spacing.lg};background:${theme.background};display:grid;grid-template-rows:48px 120px 1fr ${theme.captionHeight}px 40px;gap:${design.spacing.sm}}
.topline{display:flex;justify-content:space-between;align-items:center;color:${theme.accent};font-size:${type.metadata.fontSize};line-height:${type.body.lineHeight};font-weight:${type.title.fontWeight};border-bottom:${design.components.divider.height} solid ${color("divider", "backgroundColor")};padding-bottom:${design.spacing.xs}}
h1{font-family:'${type.title.fontFamily}',sans-serif;font-size:${theme.title}px;line-height:${type.title.lineHeight};padding:4px 0;margin:0;font-weight:${type.title.fontWeight};align-self:center;letter-spacing:.01em}
main{min-height:0;display:flex;flex-direction:column;justify-content:center;gap:28px}p{margin:0} .headline{background:${color("headline", "backgroundColor")};font-size:${theme.title}px;line-height:${type.title.lineHeight};font-weight:${type.title.fontWeight};color:${theme.accent}}
.points{display:grid;gap:20px}.point{display:grid;grid-template-columns:410px 1fr;gap:${design.spacing.lg};align-items:baseline;border-top:${design.components.divider.height} solid ${color("divider", "backgroundColor")};padding-top:20px;font-size:${theme.body}px;line-height:${type.body.lineHeight}}.point strong{color:${theme.ink}}.point p{font-size:${theme.body}px}
.takeaway{color:${color("explanation")};font-size:${theme.body}px;line-height:${type.body.lineHeight};padding:18px 28px;background:${theme.tint};border-left:8px solid ${theme.accent}}
table{font-family:'${type.table.fontFamily}',sans-serif;border-collapse:collapse;width:100%;table-layout:fixed;font-size:${type.table.fontSize};line-height:${type.table.lineHeight};font-weight:${type.table.fontWeight}}th{text-align:left;background:${color("table", "backgroundColor")};color:${color("table")};font-weight:${type.title.fontWeight}}td,th{padding:18px ${design.spacing.md};border-bottom:${design.components.divider.height} solid ${color("divider", "backgroundColor")};overflow-wrap:anywhere}td:first-child{font-weight:${type.title.fontWeight}}
.steps{display:flex;gap:28px;align-items:stretch}.step{color:${color("explanation")};flex:1;min-width:0;background:${theme.tint};padding:28px;display:flex;flex-direction:column;gap:${design.spacing.md};font-size:${theme.body}px;line-height:${type.body.lineHeight}}.step b{color:${theme.accent};font-size:${theme.body}px}.arrow{background:${color("flow-arrow", "backgroundColor")};align-self:center;font-size:52px;color:${color("flow-arrow")}}
.code-grid{display:grid;grid-template-columns:1.12fr 1fr;gap:44px;align-items:center}pre{margin:0;padding:${design.spacing.md};background:${color("code", "backgroundColor")};color:${color("code")};font:${type.code.fontWeight} ${type.code.fontSize}/${type.code.lineHeight} '${type.code.fontFamily}','Noto Sans JP',monospace;white-space:pre;tab-size:2} .explanations{display:grid;gap:26px;font-size:${theme.body}px;line-height:${type.body.lineHeight}}.explanations p{border-left:5px solid ${theme.accent};padding-left:22px}
.visual{height:400px;display:flex;align-items:center;justify-content:center}.visual img{max-width:100%;max-height:100%;object-fit:contain}
.example-label{font-size:${theme.body}px;color:${theme.muted}}.cells{display:flex;gap:12px;justify-content:center}.cell{flex:1;text-align:center;border:3px solid ${theme.accent};border-radius:${resolveReference(design, design.components.cell.rounded)};background:${color("cell", "backgroundColor")};color:${color("cell")};padding:${design.spacing.md} ${design.spacing.xs};font-size:${theme.title}px;font-weight:${type.title.fontWeight};line-height:${type.title.lineHeight}}.equation{font-size:${theme.title}px;line-height:${type.title.lineHeight};font-weight:${type.title.fontWeight};text-align:center;color:${color("cell")}}
.caption{background:${theme.captionBackground};height:${theme.captionHeight}px;display:flex;align-items:center;justify-content:center;padding:12px ${design.spacing.sm};border-top:${design.components.divider.height} solid ${color("divider", "backgroundColor")}}.caption p{color:${color("caption")};font-family:'${type.caption.fontFamily}',sans-serif;font-size:${theme.caption}px;line-height:${type.caption.lineHeight};font-weight:${type.caption.fontWeight};text-align:center;white-space:pre-wrap;overflow-wrap:normal;word-break:normal}
footer{background:${color("metadata", "backgroundColor")};display:flex;justify-content:space-between;font-size:${type.metadata.fontSize};font-weight:${type.metadata.fontWeight};color:${theme.muted};line-height:${type.body.lineHeight}}
`;

  const previewCss = `body{font:20px/1.8 '${type.body.fontFamily}',sans-serif;margin:${design.spacing.md};background:${colors["code-background"]};color:${theme.ink}}img{width:100%;display:block}article{max-width:1200px;margin:${design.spacing.md} auto;background:${theme.background};padding:${design.spacing.sm}}a{color:${color("preview-link")};text-decoration:underline;text-underline-offset:.2em}a:visited{color:${color("preview-link-visited")}}a:hover{color:${colors.primary};text-decoration-thickness:3px}a:focus-visible{background:${color("preview-link-focus", "backgroundColor")};color:${color("preview-link-focus")};outline:4px solid ${colors["focus-outline"]};outline-offset:4px;box-shadow:0 0 0 4px ${colors.focus}}`;

  return { theme, css, previewCss };
}
export const { theme, css, previewCss } = buildTheme(design);
