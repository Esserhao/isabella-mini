// 主题调色板（canvas 无法使用 CSS 变量，这里用 JS 颜色常量）
// 默认「森林」主题，与原有网页 style.css 保持一致
import { INGREDIENT_LIBRARY, ACCORDS } from './data.js'

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

// 取某个香调的本色。首页首屏 / 收藏 / 历史 / canvas 四处共用，
// 别各写一遍 `ACCORD_COLORS[k] || THEME.primary`——fallback 规则一改就会漏掉一处。
// 本色只用于「色带 / 色块 / 进度条 / 大块填充」；文字前景一律走 accordTextColor。
export function accordColor(key) {
  return ACCORD_COLORS[key] || THEME.primary
}

// 香调「文字色」：由本色加深派生，小字前景（12–14px 香料名、滑块名、配方行）对比度 ≥4.5:1。
// 色带色本身是「给色块看的」——citrus/vanilla/musk 等浅色当文字前景只有 2~3:1，
// 图鉴 104 个香料名全中招。色带维持原色（色块靠色相区分即可），文字另用这张深色表。
// 校准基准：#fff ≥5.5、页面底 #f0eee5 ≥4.8（见开发时对比度脚本）。
export const ACCORD_TEXT_COLORS = {
  citrus: '#7d5712',   // 柑橘：深姜黄
  floral: '#8a3357',   // 花香：深玫瑰
  fruity: '#a2451e',   // 果香：焦糖珊瑚
  woody: '#6e4a1f',    // 木质：深木棕
  oriental: '#9c3f14', // 东方：深香料红
  fougere: '#5f5488',  // 馥奇：深薰衣草紫
  green: '#38702a',    // 绿意：深草绿
  musk: '#7e5a75',     // 麝香：深灰粉紫
  amber: '#8a5f18',    // 琥珀：深金
  vanilla: '#7d6236',  // 香草：深奶油棕
  tobacco: '#6b4a2f',  // 烟草：深烟棕（本色已达标，仅作统一出口）
  aquatic: '#256f92'   // 水生：深海蓝
}

// 取某个香调的「文字色」；查不到回退主绿。文字前景专用，别拿它填色块。
export function accordTextColor(key) {
  return ACCORD_TEXT_COLORS[key] || THEME.primary
}

// ---------- 香料 → 主导香调本色 ----------
// 「项目里出现的香料都带香调色」的统一数据源：卡片配方 canvas、工坊香料滑块、
// 香调释义弹层、图鉴代表香料/前中后调、首页配方行共用这一个映射，
// 别在页面里各查各的——归属规则一改（比如某味料换香调）这里改一处就全局生效。
const INGREDIENT_ACCORD = {}
INGREDIENT_LIBRARY.forEach((ing) => {
  let top = ''
  let topV = -1
  const ws = ing.accords || {}
  for (const k in ws) {
    if (ws[k] > topV) { topV = ws[k]; top = k }
  }
  if (top) INGREDIENT_ACCORD[ing.name] = top
})
// 香调的典型原料也算香料：归到该香调（如「柠檬」归柑橘、「桂花」归花香）；
// 已在香料库里有归属的名字不覆盖（权重表优先）。
ACCORDS.forEach((a) => {
  (a.typicalIngredients || []).forEach((n) => {
    if (!INGREDIENT_ACCORD[n]) INGREDIENT_ACCORD[n] = a.key
  })
})

// 香料名 → 主导香调 key；查不到回退空串，由调用方决定回退样式
export function ingredientAccordKey(name) {
  return INGREDIENT_ACCORD[name] || ''
}

// 香料名 → 主导香调本色；查不到回退 ''（inline style 里空色不生效，安全）。
// 用于色带/色点等填充；香料名做文字时用下面的 ingredientAccordTextColor。
export function ingredientAccordColor(name) {
  const ak = INGREDIENT_ACCORD[name]
  return ak ? accordColor(ak) : ''
}

// 香料名 → 主导香调「文字色」（对比度版）；查不到回退 ''（文字保持墨色）。
// 配方行 / 滑块名 / 图鉴香料名等逐味上色的文字前景统一走这里。
export function ingredientAccordTextColor(name) {
  const ak = INGREDIENT_ACCORD[name]
  return ak ? accordTextColor(ak) : ''
}
