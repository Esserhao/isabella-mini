// 主题调色板（canvas 无法使用 CSS 变量，这里用 JS 颜色常量）
// 默认「森林」主题，与原有网页 style.css 保持一致
export const THEME = {
  bg: '#f0eee5',        // 页面背景
  paper: '#f6f3ea',     // 卡片纸底
  ink: '#2b2b2e',       // 主文字
  inkSoft: '#6b6a6a',   // 次文字
  primary: '#2e5c45',   // 主绿
  primarySoft: '#85a88f',
  gold: '#a97826',      // 辅金/铜（描边、装饰线）
  goldDeep: '#8a5f18',  // 深金：卡面与分享图上的金色「文字/数字」专用（对比度 ≥4.5）
  line: 'rgba(26,26,30,0.10)',
  radarFill: 'rgba(46,92,69,0.20)',
  radarLine: '#2e5c45'
}

// 香调条配色。键集必须与 ACCORDS 的 12 个 key 一一对应——
// 缺键会走 fallback 主绿：果香/东方/馥奇主导的瓶，彩条和分享图主色会全变成绿色。
// （旧表的 spice/gourmand/leather 等键来自更早的香调体系，项目里已无此 key，已清除。）
export const ACCORD_COLORS = {
  citrus: '#e0a32e',   // 柑橘：明黄
  floral: '#c46b8f',   // 花香：玫瑰粉
  fruity: '#e07856',   // 果香：蜜桃珊瑚
  woody: '#8a6a3b',    // 木质：老木棕
  oriental: '#b5542f', // 东方：香料红棕
  fougere: '#8f86ad',  // 馥奇：薰衣草灰紫
  green: '#5b8a4e',    // 绿意：草绿
  musk: '#b79ab0',     // 麝香：皮肤感粉紫
  amber: '#c08a3e',    // 琥珀：金树脂
  vanilla: '#d2b48c',  // 香草：奶油棕
  tobacco: '#6b4a2f',  // 烟草：深烟棕
  aquatic: '#3f86a8'   // 水生：海蓝
}
