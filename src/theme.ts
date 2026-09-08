export const theme={version:'accessible-light-v1.0.0',width:1920,height:1080,title:64,body:48,code:40,caption:48,captionTop:832,captionHeight:160,captionMargin:112,captionBottom:100,font:'Noto Sans JP',ink:'#1a1a1c',muted:'#4d4d4d',accent:'#115a36',tint:'#e6f5ec',background:'#ffffff'};
export const css=`
@font-face{font-family:'Noto Sans JP';src:url('fonts/NotoSansJP.ttf');font-weight:100 900;font-display:block}
@font-face{font-family:'Noto Sans Mono';src:url('fonts/NotoSansMono.ttf');font-weight:100 900;font-display:block}
*{box-sizing:border-box}html,body{margin:0;background:#e8e8e8;color:${theme.ink};font-family:'Noto Sans JP',sans-serif}body{width:1920px}
.slide{width:1920px;height:1080px;padding:48px 96px 32px;background:white;display:grid;grid-template-rows:48px 120px 1fr 160px 40px;gap:16px}
.topline{display:flex;justify-content:space-between;align-items:center;color:${theme.accent};font-size:24px;line-height:1.5;font-weight:700;border-bottom:2px solid #808080;padding-bottom:8px}
h1{font-size:64px;line-height:1.4;padding:4px 0;margin:0;font-weight:700;align-self:center;letter-spacing:.01em}
main{min-height:0;display:flex;flex-direction:column;justify-content:center;gap:28px}p{margin:0} .headline{font-size:64px;line-height:1.4;font-weight:700;color:${theme.accent}}
.points{display:grid;gap:20px}.point{display:grid;grid-template-columns:410px 1fr;gap:32px;align-items:baseline;border-top:2px solid #808080;padding-top:20px;font-size:48px;line-height:1.5}.point strong{color:${theme.accent}}.point p{font-size:48px}
.takeaway{font-size:48px;line-height:1.5;padding:18px 28px;background:${theme.tint};border-left:8px solid ${theme.accent}}
table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:48px;line-height:1.45}th{text-align:left;background:${theme.tint};color:${theme.accent};font-weight:700}td,th{padding:18px 24px;border-bottom:2px solid #808080;overflow-wrap:anywhere}td:first-child{font-weight:700}
.steps{display:flex;gap:28px;align-items:stretch}.step{flex:1;min-width:0;background:${theme.tint};padding:28px;display:flex;flex-direction:column;gap:24px;font-size:48px;line-height:1.5}.step b{color:${theme.accent};font-size:48px}.arrow{align-self:center;font-size:52px;color:${theme.accent}}
.code-grid{display:grid;grid-template-columns:1.12fr 1fr;gap:44px;align-items:center}pre{margin:0;padding:24px;background:#f2f2f2;font:40px/1.5 'Noto Sans Mono','Noto Sans JP',monospace;white-space:pre;tab-size:2} .explanations{display:grid;gap:26px;font-size:48px;line-height:1.5}.explanations p{border-left:5px solid ${theme.accent};padding-left:22px}
.example-label{font-size:48px;color:${theme.muted}}.cells{display:flex;gap:12px;justify-content:center}.cell{flex:1;text-align:center;border:3px solid ${theme.accent};border-radius:10px;background:${theme.tint};padding:24px 8px;font-size:64px;font-weight:700;line-height:1.4}.equation{font-size:64px;line-height:1.4;font-weight:700;text-align:center;color:${theme.accent}}
.caption{height:160px;display:flex;align-items:center;justify-content:center;padding:12px 16px;border-top:2px solid #808080}.caption p{font-size:48px;line-height:1.4;text-align:center;white-space:pre-wrap;overflow-wrap:normal;word-break:normal}
footer{display:flex;justify-content:space-between;font-size:24px;color:${theme.muted};line-height:1.5}
`;
