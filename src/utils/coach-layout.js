// 聚光灯教程的几何计算。
//
// 为什么要单独抽出来：定位偏移这类问题在代码里看不出来，只能上真机用眼睛看。
// 抽成纯函数后，scripts/audit-tutorial.mjs 可以在没有 DOM 的环境里
// 把各种机型尺寸 × 目标位置算一遍，提交前先挡掉一批。
//
// 全部使用 px、视口坐标（boundingClientRect 返回的就是视口坐标，
// 遮罩和亮框都是 position:fixed，可以直接用，不用再减 scrollTop）。

export const CARD_GAP = 18    // 注解卡片与高亮目标之间的间距
export const CARD_EDGE = 12   // 注解卡片与屏幕边缘的最小留白
export const RING_PAD = 6     // 亮框在目标四周外扩，避免目标贴边时白光被切

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(v, hi))
}

// 挖洞区域（暗色遮罩 / 白色亮框共用）
export function paddedHole(rect, pad = RING_PAD) {
  if (!rect) return null
  return {
    top: Math.max(0, rect.top - pad),
    left: Math.max(0, rect.left - pad),
    width: rect.width + pad * 2,
    height: rect.height + pad * 2
  }
}

// 卡片与目标的纵向重叠像素数
function overlapOf(top, cardH, rect) {
  return Math.max(0, Math.min(rect.top + rect.height, top + cardH) - Math.max(rect.top, top))
}

// 注解卡片摆在哪儿。
// 候选位置按优先级：紧贴目标下方 > 紧贴目标上方 > 贴底 > 贴顶，全都夹紧在屏幕内。
// 先挑「完全不压住目标」的；如果四个都压（小屏 + 很高的目标，物理上放不下），
// 就挑压得最少的那个 —— 以前只写死「贴底」，不是最优。
// 压住时 overlaps=true、overlapPx 给出重叠高度，调用方/脚本据此判断。
export function placeCard({ screenW, screenH, rect, cardW, cardH }) {
  const left = clamp(
    rect.left + rect.width / 2 - cardW / 2,
    CARD_EDGE,
    Math.max(CARD_EDGE, screenW - cardW - CARD_EDGE)
  )
  const maxTop = Math.max(CARD_EDGE, screenH - cardH - CARD_EDGE)
  const below = rect.top + rect.height + CARD_GAP
  const above = rect.top - cardH - CARD_GAP
  const cands = [
    clamp(below, CARD_EDGE, maxTop),
    clamp(above, CARD_EDGE, maxTop),
    clamp(screenH - cardH - CARD_EDGE, CARD_EDGE, maxTop),
    CARD_EDGE
  ]

  let best = cands[0]
  let bestOverlap = Infinity
  for (const t of cands) {
    const o = overlapOf(t, cardH, rect)
    if (o < bestOverlap) { best = t; bestOverlap = o }   // 严格小于：同分时保留高优先级
    if (bestOverlap === 0) break
  }

  return {
    top: Math.round(best),
    left: Math.round(left),
    overlaps: bestOverlap > 0,
    overlapPx: Math.round(bestOverlap)
  }
}

// 这个屏幕能不能「干干净净」放下目标 + 卡片（即完全不重叠）。
// 放不下不是 bug，是物理限制 —— 脚本据此把 unavoidable 降级成提醒。
export function canFitCleanly(screenH, rectHeight, cardH) {
  return rectHeight + CARD_GAP + cardH + CARD_EDGE * 2 <= screenH
}

// 目标按当前位置摆不下卡片、或目标没完整露出来时，算出页面该滚到哪儿。
// 返回 null = 不用滚。
//
// 两个触发条件缺一不可：
//   1. 卡片会压住目标（plan.overlaps）
//   2. 目标被视口切掉 / 整个在首屏之下（cutTop / cutBottom）
// 只判 1 会漏掉第 2 种：目标在首屏之下时，卡片贴底摆、测不出重叠，
// 页面就永远不滚，聚光灯画在屏幕外 —— 工坊的滑块区正是这种长页面目标。
// 反过来说，只要目标看得见、卡片又不压它，就别滚：
// 首页第 1 步→第 2 步这种同页相邻目标，白跳一下很晃眼。
export function desiredScrollTop({ screenH, rectTop, rectHeight, scrollTop, cardH }) {
  const plan = placeCard({
    screenW: 0, screenH, cardW: 0, cardH,
    rect: { top: rectTop, left: 0, width: 0, height: rectHeight }
  })

  const cutTop = rectTop < 4
  const cutBottom = rectTop + rectHeight > screenH - CARD_EDGE
  if (!plan.overlaps && !cutTop && !cutBottom) return null

  // 要让卡片摆得进目标下方，目标的顶边最高只能到这儿
  const maxTopForBelow = screenH - rectHeight - CARD_GAP - cardH - CARD_EDGE
  // 目标太高、下方塞不下时，把它顶到最上面：卡片压在它下方，重叠最少
  const ideal = maxTopForBelow >= CARD_EDGE + 8
    ? Math.min(Math.round(screenH * 0.28), maxTopForBelow)
    : CARD_EDGE + 4
  // 目标本身比屏幕还高时，上面那步会算出负的，顶到最上面 —— 至少看得见头
  const wantTop = Math.max(CARD_EDGE, Math.min(ideal, screenH - rectHeight - CARD_EDGE))

  const delta = rectTop - wantTop
  if (Math.abs(delta) <= 8) return null
  return Math.max(0, scrollTop + delta)
}
