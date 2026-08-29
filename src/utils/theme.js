// 主题调色板（canvas 无法使用 CSS 变量，这里用 JS 颜色常量）
// 默认「森林」主题，与原有网页 style.css 保持一致
export const THEME = {
  bg: '#f0eee5',        // 页面背景
  paper: '#f6f3ea',     // 卡片纸底
  ink: '#2b2b2e',       // 主文字
  inkSoft: '#6b6a6a',   // 次文字
  primary: '#2e5c45',   // 主绿
  primarySoft: '#85a88f',
  gold: '#a97826',      // 辅金/铜
  line: 'rgba(26,26,30,0.10)',
  radarFill: 'rgba(46,92,69,0.20)',
  radarLine: '#2e5c45'
}

// 香调条配色（取自 ACCORDS 的 color，fallback 用主绿）
export const ACCORD_COLORS = {
  floral: '#c46b8f',
  citrus: '#e0a32e',
  woody: '#8a6a3b',
  green: '#5b8a4e',
  spice: '#b5542f',
  musk: '#9a8fb0',
  aquatic: '#3f86a8',
  gourmand: '#a9663f',
  leather: '#7a5a3a',
  powdery: '#c9a0b8',
  smoky: '#5a5550',
  resinous: '#9a7b2e'
}
