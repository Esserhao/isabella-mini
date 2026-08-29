// 小程序 canvas 2d 手绘库（替代网页版 Chart.js / html2canvas）
// 调用方负责根据 dpr 对 ctx 做 scale，本文件统一使用「逻辑像素」坐标。
import { THEME, ACCORD_COLORS } from './theme.js'

function accordColor(key) {
  return ACCORD_COLORS[key] || THEME.primary
}

// 封存卡页脚的小程序码位置（drawCardBase 的页脚文案与 drawCard 的二维码共用，避免错位）
const CARD_QR = { x: 60, y: 812, size: 64 }

// 圆角矩形路径（小程序 Canvas2D 的 ctx.roundRect 支持不稳，自己描一遍）
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.arcTo(x + w, y, x + w, y + rr, rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  ctx.lineTo(x + rr, y + h)
  ctx.arcTo(x, y + h, x, y + h - rr, rr)
  ctx.lineTo(x, y + rr)
  ctx.arcTo(x, y, x + rr, y, rr)
  ctx.closePath()
}

// 动画帧封装：优先用 Canvas2D 节点的 requestAnimationFrame（小程序标准 API），
// 退回全局 requestAnimationFrame / setTimeout，保证真机与开发者工具均可用。
// 关键点：全局 requestAnimationFrame 在微信小程序 Canvas2D 环境下经常不触发回调，必须用 canvas 节点的方法。
function raf(canvas, cb) {
  if (canvas && typeof canvas.requestAnimationFrame === 'function') return canvas.requestAnimationFrame(cb)
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(cb)
  return setTimeout(() => cb(Date.now()), 16)
}
function caf(canvas, id) {
  if (canvas && typeof canvas.cancelAnimationFrame === 'function') return canvas.cancelAnimationFrame(id)
  if (typeof cancelAnimationFrame === 'function') return cancelAnimationFrame(id)
  return clearTimeout(id)
}

// ---------- 雷达图（通用，页面实时 / 卡片内嵌共用） ----------
export function drawRadar(ctx, opt) {
  const { cx, cy, radius, values, labels, max = 100,
    theme = THEME, showLabels = true, overlay = null } = opt
  const n = values.length
  const angle = (i) => (i / n) * Math.PI * 2 - Math.PI / 2

  // 清除/填充该区域，避免重叠。传入 bg 时填纸底（封存卡场景：保持纸色背景，导出不发白），
  // 不传时清空（首页 live 雷达场景：CSS 透出卡片底色）。
  const area = radius + 30
  if (opt.bg) {
    ctx.fillStyle = opt.bg
    ctx.fillRect(cx - area, cy - area, area * 2, area * 2)
  } else {
    ctx.clearRect(cx - area, cy - area, area * 2, area * 2)
  }

  // 网格层
  const layers = 4
  for (let layer = 1; layer <= layers; layer++) {
    const r = radius * (layer / layers)
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const x = cx + Math.cos(angle(i)) * r
      const y = cy + Math.sin(angle(i)) * r
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.strokeStyle = theme.line
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // 轴线
  for (let i = 0; i < n; i++) {
    const x = cx + Math.cos(angle(i)) * radius
    const y = cy + Math.sin(angle(i)) * radius
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    ctx.strokeStyle = theme.line
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // 数据多边形
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(max, values[i] || 0)) / max
    const x = cx + Math.cos(angle(i)) * radius * v
    const y = cy + Math.sin(angle(i)) * radius * v
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = theme.radarFill
  ctx.fill()
  ctx.strokeStyle = theme.radarLine
  ctx.lineWidth = 2
  ctx.stroke()

  // 数据点
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(max, values[i] || 0)) / max
    const x = cx + Math.cos(angle(i)) * radius * v
    const y = cy + Math.sin(angle(i)) * radius * v
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fillStyle = theme.radarLine
    ctx.fill()
    ctx.strokeStyle = '#f6f3ea'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // 叠加虚线多边形（对比名香）：不填充，仅虚线描边 + 小三角标记
  if (overlay && overlay.values && overlay.values.length === n) {
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, Math.min(max, overlay.values[i] || 0)) / max
      const x = cx + Math.cos(angle(i)) * radius * v
      const y = cy + Math.sin(angle(i)) * radius * v
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.strokeStyle = overlay.color || theme.gold
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.setLineDash([])

    // 虚线顶点空心三角标记
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, Math.min(max, overlay.values[i] || 0)) / max
      const px = cx + Math.cos(angle(i)) * radius * v
      const py = cy + Math.sin(angle(i)) * radius * v
      ctx.beginPath()
      ctx.moveTo(px, py - 5)
      ctx.lineTo(px + 4, py + 3)
      ctx.lineTo(px - 4, py + 3)
      ctx.closePath()
      ctx.fillStyle = overlay.color || theme.gold
      ctx.fill()
    }

    // 叠加标签（图鉴香水名，放在雷达右下角）
    if (overlay.label) {
      ctx.fillStyle = overlay.color || theme.gold
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.fillText(overlay.label, cx + radius, cy + radius + 20)
    }
  }

  // 标签
  if (showLabels && labels) {
    ctx.fillStyle = theme.inkSoft
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < n; i++) {
      const lr = radius + 16
      const x = cx + Math.cos(angle(i)) * lr
      const y = cy + Math.sin(angle(i)) * lr
      ctx.fillText(labels[i], x, y)
    }
  }
}

// ---------- 未完成雷达（首页赌注剪影：虚线网格 + 轴线 + 中央问号，制造"等你来填"的残缺感） ----------
export function drawEmptyRadar(ctx, opt) {
  const { cx, cy, radius, n = 6, theme = THEME } = opt
  const angle = (i) => (i / n) * Math.PI * 2 - Math.PI / 2

  // 网格层（虚线，未完成感）
  const layers = 4
  ctx.setLineDash([4, 4])
  for (let layer = 1; layer <= layers; layer++) {
    const r = radius * (layer / layers)
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const x = cx + Math.cos(angle(i)) * r
      const y = cy + Math.sin(angle(i)) * r
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.strokeStyle = theme.line
    ctx.lineWidth = 1
    ctx.stroke()
  }
  // 轴线
  for (let i = 0; i < n; i++) {
    const x = cx + Math.cos(angle(i)) * radius
    const y = cy + Math.sin(angle(i)) * radius
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    ctx.strokeStyle = theme.line
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.setLineDash([])

  // 中央问号（金色大号）
  ctx.fillStyle = theme.gold
  ctx.font = 'bold 72px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('?', cx, cy - 10)
  // 小字提示
  ctx.fillStyle = theme.inkSoft
  ctx.font = '15px sans-serif'
  ctx.fillText('你的香气轮廓', cx, cy + 46)
}

// ---------- 雷达生长动画（点「开始调香」：骨架先现，多边形 0.5s 从中心长出来） ----------
export function drawRadarGrow(ctx, opt, onDone) {
  const { cx, cy, radius, values, labels, max = 100,
    theme = THEME, duration = 500, canvas = null } = opt
  const n = values.length
  const angle = (i) => (i / n) * Math.PI * 2 - Math.PI / 2
  // 目标顶点
  const pts = values.map((v, i) => {
    const vv = Math.max(0, Math.min(max, v || 0)) / max
    return {
      x: cx + Math.cos(angle(i)) * radius * vv,
      y: cy + Math.sin(angle(i)) * radius * vv
    }
  })
  const area = radius + 30
  // 骨架（网格 + 轴线 + 标签）
  const drawSkeleton = () => {
    ctx.clearRect(cx - area, cy - area, area * 2, area * 2)
    const layers = 4
    for (let layer = 1; layer <= layers; layer++) {
      const r = radius * (layer / layers)
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const x = cx + Math.cos(angle(i)) * r
        const y = cy + Math.sin(angle(i)) * r
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = theme.line
      ctx.lineWidth = 1
      ctx.stroke()
    }
    for (let i = 0; i < n; i++) {
      const x = cx + Math.cos(angle(i)) * radius
      const y = cy + Math.sin(angle(i)) * radius
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(x, y)
      ctx.strokeStyle = theme.line
      ctx.lineWidth = 1
      ctx.stroke()
    }
    if (labels) {
      ctx.fillStyle = theme.inkSoft
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < n; i++) {
        const lr = radius + 16
        const x = cx + Math.cos(angle(i)) * lr
        const y = cy + Math.sin(angle(i)) * lr
        ctx.fillText(labels[i], x, y)
      }
    }
  }
  const drawPoly = (t) => {
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const x = cx + (pts[i].x - cx) * t
      const y = cy + (pts[i].y - cy) * t
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = theme.radarFill
    ctx.fill()
    ctx.strokeStyle = theme.radarLine
    ctx.lineWidth = 2
    ctx.stroke()
  }
  const drawDots = () => {
    for (let i = 0; i < n; i++) {
      ctx.beginPath()
      ctx.arc(pts[i].x, pts[i].y, 3, 0, Math.PI * 2)
      ctx.fillStyle = theme.radarLine
      ctx.fill()
      ctx.strokeStyle = '#f6f3ea'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  drawSkeleton()
  const start = Date.now()
  let rafId = null
  const frame = () => {
    const t = Math.min(1, (Date.now() - start) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    drawSkeleton()
    drawPoly(eased)
    if (t >= 1) {
      drawDots()
      onDone && onDone()
      return
    }
    rafId = raf(canvas, frame)
  }
  rafId = raf(canvas, frame)
}

// ---------- 分子结构图（香调网络） ----------
export function drawMolecule(ctx, opt) {
  const { cx, cy, radius, accords, accordValues, theme = THEME } = opt
  // accords: [{key,label}], accordValues: {key:val}
  const nodes = accords.length ? accords : []
  const count = nodes.length
  if (count === 0) return

  // 连线
  ctx.strokeStyle = theme.line
  ctx.lineWidth = 1
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const a1 = (i / count) * Math.PI * 2 - Math.PI / 2
      const a2 = (j / count) * Math.PI * 2 - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius)
      ctx.lineTo(cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius)
      ctx.stroke()
    }
  }

  // 节点
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2
    const x = cx + Math.cos(a) * radius
    const y = cy + Math.sin(a) * radius
    const pct = accordValues[nodes[i].key] || 0
    const nr = 12 + (pct / 100) * 10
    ctx.beginPath()
    ctx.arc(x, y, nr, 0, Math.PI * 2)
    ctx.fillStyle = accordColor(nodes[i].key)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(pct + '%', x, y)
    // 标签
    ctx.fillStyle = theme.ink
    ctx.font = '11px sans-serif'
    const ly = y < cy ? y - nr - 8 : y + nr + 8
    ctx.fillText(nodes[i].label, x, ly)
  }

  // 中心主调
  let main = nodes[0]
  for (const a of nodes) {
    if ((accordValues[a.key] || 0) > (accordValues[main.key] || 0)) main = a
  }
  ctx.beginPath()
  ctx.arc(cx, cy, 20, 0, Math.PI * 2)
  ctx.fillStyle = theme.primary
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('主调', cx, cy)
}

// ---------- 封存卡主体（不含签名，同步绘制） ----------
export function drawCardBase(ctx, opt) {
  const { width, height, name, radarValues, labels,
    quote, formula, accords, accordValues, theme = THEME,
    rarity = '', tierTitle = '', sealLabel = '' } = opt
  const M = 60
  // 背景
  ctx.fillStyle = theme.paper
  ctx.fillRect(0, 0, width, height)
  // 外边框
  ctx.strokeStyle = theme.primary
  ctx.lineWidth = 3
  ctx.strokeRect(10, 10, width - 20, height - 20)

  // 顶部标题区
  ctx.fillStyle = theme.primary
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(name || '未命名香氛', width / 2, 52)

  // 稀有度徽章 + 层级称号（居中，位于香名与金线之间）
  const badgeParts = [rarity, tierTitle].filter(Boolean)
  if (badgeParts.length) {
    const badgeText = badgeParts.join(' · ')
    ctx.font = '12px sans-serif'
    const bw = ctx.measureText(badgeText).width + 28
    const bx = (width - bw) / 2
    const by = 66
    const bh = 22
    roundRect(ctx, bx, by, bw, bh, 11)
    ctx.fillStyle = rgba(THEME.gold, 0.14)
    ctx.fill()
    ctx.strokeStyle = rgba(THEME.gold, 0.5)
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = theme.gold
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(badgeText, width / 2, by + bh / 2 + 1)
  }

  ctx.strokeStyle = theme.gold
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(M, 100)
  ctx.lineTo(width - M, 100)
  ctx.stroke()

  // 雷达图（居中偏上，留出空间给香调彩条）。
  // 顶标签约 y=114（在金线 100 之下），底标签约 y=400。
  drawRadar(ctx, {
    cx: width / 2, cy: 258, radius: 122,
    values: radarValues, labels, theme, showLabels: true,
    bg: theme.paper
  })

  // ---------- 区块 1：主要香调（浅底卡片，含占比彩条） ----------
  const topAccords = accords.slice().sort((a, b) =>
    (accordValues[b.key] || 0) - (accordValues[a.key] || 0))
    .filter((a) => (accordValues[a.key] || 0) > 0)
    .slice(0, 3)
  const ingX = M
  const ingW = width - M * 2
  const rowH = 30
  const rowGap = 14

  // 区块标题带小竖线，强化分组感
  const secTitleY = 432
  ctx.fillStyle = theme.primary
  ctx.fillRect(ingX, secTitleY - 7, 4, 14)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 14px sans-serif'
  ctx.fillText('主要香调', ingX + 12, secTitleY)

  // 区块浅底卡片（高度随有效香调行数自适应）
  const blockPad = 14
  const listTop = secTitleY + 20 + blockPad
  const blockH = blockPad * 2 + Math.max(1, topAccords.length) * (rowH + rowGap) - rowGap
  roundRect(ctx, ingX - 12, listTop - blockPad, ingW + 24, blockH, 12)
  ctx.fillStyle = 'rgba(46,92,69,0.045)'
  ctx.fill()

  let listBottom = listTop
  topAccords.forEach((a, i) => {
    const v = accordValues[a.key] || 0
    const yy = listTop + i * (rowH + rowGap)
    ctx.fillStyle = theme.ink
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(a.label + (i === 0 ? ' · 主调' : ''), ingX, yy + 7)
    ctx.fillStyle = theme.gold
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(v + '%', ingX + ingW, yy + 7)

    const barY = yy + 16
    const barH = 10
    const barW = (v / 100) * ingW
    roundRect(ctx, ingX, barY, ingW, barH, 5)
    ctx.fillStyle = 'rgba(26,26,30,0.07)'
    ctx.fill()
    if (barW > 0) {
      roundRect(ctx, ingX, barY, barW, barH, 5)
      ctx.fillStyle = accordColor(a.key)
      ctx.fill()
    }
    listBottom = barY + barH
  })

  // ---------- 区块 2：配方 ----------
  // 标题与「主要香调」保持同一格式：绿色小竖线 + bold 14px + primary + 左对齐；
  // 内容则在避开小程序码后的可用区域内居中，与左对齐的标题形成明确区分。
  const qrReserved = CARD_QR.x + CARD_QR.size + 16
  const textMaxW = width - M - qrReserved
  const textCenterX = qrReserved + textMaxW / 2

  let cursor = listBottom + 32
  ctx.fillStyle = theme.primary
  ctx.fillRect(ingX, cursor - 7, 4, 14)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 14px sans-serif'
  ctx.fillText('配方', ingX + 12, cursor)
  cursor += 20

  ctx.textAlign = 'center'
  ctx.fillStyle = theme.ink
  ctx.font = '14px sans-serif'
  const formulaText = formula && formula.length ? formula.join('、') : '—'
  const fH = wrapTextCenter(ctx, formulaText, textCenterX, cursor, textMaxW, 21, 2)
  cursor += fH + 12

  // ---------- 区块 3：调香感言（斜体，带上下细线包裹） ----------
  ctx.strokeStyle = 'rgba(169,120,38,0.28)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(width / 2 - 40, cursor)
  ctx.lineTo(width / 2 + 40, cursor)
  ctx.stroke()

  cursor += 18
  ctx.fillStyle = theme.inkSoft
  ctx.font = 'italic 15px sans-serif'
  const qH = wrapTextCenter(ctx, quote || '', width / 2, cursor, width - M * 2, 24, 3)
  cursor += qH + 14

  ctx.strokeStyle = 'rgba(169,120,38,0.28)'
  ctx.beginPath()
  ctx.moveTo(width / 2 - 40, cursor)
  ctx.lineTo(width / 2 + 40, cursor)
  ctx.stroke()

  // ---------- 页脚：金线 + 小程序码 + 品牌信息 ----------
  const footerY = Math.max(cursor + 24, CARD_QR.y - 22)
  ctx.strokeStyle = 'rgba(169,120,38,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(M, footerY)
  ctx.lineTo(width - M, footerY)
  ctx.stroke()

  const fx = CARD_QR.x + CARD_QR.size + 16
  const fy = CARD_QR.y
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = theme.ink
  ctx.font = 'bold 13px sans-serif'
  ctx.fillText('调香日记', fx, fy + 14)
  const d = new Date()
  const ds = d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0')
  ctx.fillStyle = 'rgba(107,106,106,0.9)'
  ctx.font = '12px sans-serif'
  ctx.fillText('封存于 ' + ds, fx, fy + 38)
  ctx.fillStyle = theme.gold
  ctx.font = '12px sans-serif'
  ctx.fillText('扫码调香 · 调出你的味道', fx, fy + 60)
}

// ---------- 程序化印章（替代已删除的 name.png 手写签名） ----------
// 双圈 + 上弧品牌字「古先生的调香日记」+ 中心封存标签，随层级变化。
function drawArcText(ctx, text, cx, cy, r, opts = {}) {
  const span = opts.span || Math.PI * 0.82
  const begin = -Math.PI / 2 - span / 2
  const n = text.length
  const step = n > 1 ? span / (n - 1) : 0
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < n; i++) {
    const a = begin + step * i
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a + Math.PI / 2)
    ctx.fillText(text[i], 0, 0)
    ctx.restore()
  }
  ctx.restore()
}

export function drawSeal(ctx, opt) {
  const { sx, sy, r = 42, rotate = 0, theme = THEME, label = '封存' } = opt
  ctx.save()
  ctx.translate(sx, sy)
  if (rotate) ctx.rotate(rotate)

  // 双圈
  ctx.strokeStyle = theme.gold
  ctx.lineWidth = Math.max(2, r * 0.06)
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke()
  ctx.lineWidth = Math.max(1, r * 0.03)
  ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.stroke()

  // 上弧品牌字
  ctx.fillStyle = theme.gold
  ctx.font = `bold ${Math.round(r * 0.2)}px sans-serif`
  drawArcText(ctx, '古先生的调香日记', 0, 0, r * 0.6, { span: Math.PI * 0.82 })

  // 中心封存标签（随阶梯层级变化：已封存 / 学徒封存 / 同行封存 …）
  ctx.fillStyle = theme.primary
  ctx.font = `bold ${Math.round(r * 0.24)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 0, r * 0.04)

  // 底部小星点
  ctx.fillStyle = theme.gold
  ctx.beginPath()
  ctx.arc(0, r * 0.42, Math.max(1.5, r * 0.045), 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

// ---------- 封存卡（最终导出图） ----------
export async function drawCard(ctx, opt) {
  const { width, height, canvas,
    qrCode = false, qrSrc = '' } = opt
  drawCardBase(ctx, opt)

  // 小程序码：与 drawCardBase 的页脚文案共用 CARD_QR 坐标，保证码贴在文案左侧。
  // 这张卡会被保存到相册或分享到聊天窗口，看到的人扫码就能进小程序。真码。
  if (qrCode && canvas && qrSrc) {
    try {
      const qrImg = await loadImage(canvas, qrSrc)
      const qrSize = CARD_QR.size
      // 白底衬垫：只包住码本身，文案由 drawCardBase 负责，互不遮挡
      ctx.fillStyle = '#fff'
      roundRect(ctx, CARD_QR.x - 4, CARD_QR.y - 4, qrSize + 8, qrSize + 8, 8)
      ctx.fill()
      ctx.drawImage(qrImg, CARD_QR.x, CARD_QR.y, qrSize, qrSize)
    } catch (e) {
      // 加载失败静默，不阻塞主流程
    }
  }
}

// 卡片右下角印章位置（相对卡片宽高的偏移与半径），供 drawCard 与 drawStampAnimated 共用
export const CARD_STAMP = { dx: 84, dy: 84, r: 42 }

// ---------- 印章「落印」动画（程序化，不依赖图片） ----------
// 每帧重绘卡片主体（drawCardBase），再用 globalAlpha + 轻微缩放模拟「盖章」渐显。
// opt.cardOpt 为 drawCardBase 所需的完整参数（不含 stamp/canvas）。
// 返回 Promise：动画完成 resolve(true)。
export function drawStampAnimated(ctx, canvas, opt) {
  const {
    sx, sy, sr, cardOpt,
    duration = 1000,
    rotate = -18 * Math.PI / 180,
    stampScale = 3,
    label = '封存'
  } = opt
  const r = sr * stampScale

  return new Promise((resolve) => {
    const start = Date.now()
    let rafId = null
    let done = false
    const finish = (ok) => {
      if (done) return
      done = true
      if (rafId) caf(canvas, rafId)
      resolve(ok)
    }
    const frame = () => {
      const t = Math.min(1, (Date.now() - start) / duration)
      // ease-out cubic：落印先快后稳
      const eased = 1 - Math.pow(1 - t, 3)
      // 1) 每帧先干净重绘卡片主体，避免残影
      drawCardBase(ctx, cardOpt)
      // 2) 印章从 1.12 倍缩放 + 低透明，渐变到原尺寸、不透明（像被按下）
      ctx.save()
      ctx.globalAlpha = eased
      drawSeal(ctx, {
        sx, sy,
        r: r * (1.12 - 0.12 * eased),
        rotate,
        theme: THEME,
        label
      })
      ctx.restore()
      if (t >= 1) { finish(true); return }
      rafId = raf(canvas, frame)
    }
    rafId = raf(canvas, frame)
  })
}

// hex → rgba 辅助（用于晕染渐变）
function rgba(hex, a) {
  let h = String(hex || '#a97826').replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

// canvas 2d 加载本地图片
function loadImage(canvas, src) {
  return new Promise((resolve, reject) => {
    const img = canvas.createImage()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('stamp image load fail'))
    img.src = src
  })
}

// 文字换行
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return
  const chars = String(text).split('')
  let line = ''
  let yy = y
  for (const ch of chars) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy)
      line = ch
      yy += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, yy)
}

// 换行并居中绘制，返回实际占用高度。
// 结构化布局需要「先量后画」：只有知道这段文字占几行，才能算出下一个区块的 Y，
// 否则内容长短不一（短配方 / 8 调长配方 / 长感言）会让区块互相重叠或底部留大片空白。
function wrapTextCenter(ctx, text, cx, top, maxWidth, lineHeight, maxLines = 3) {
  if (!text) return 0
  const chars = String(text).split('')
  const lines = []
  let line = ''
  for (const ch of chars) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = ch
      if (lines.length >= maxLines) break
    } else {
      line = test
    }
  }
  if (line && lines.length < maxLines) lines.push(line)
  const safe = lines.length ? lines : ['']
  safe.forEach((l, i) => {
    ctx.fillText(l, cx, top + i * lineHeight + lineHeight / 2)
  })
  return safe.length * lineHeight
}
