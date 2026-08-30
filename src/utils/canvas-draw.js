// 小程序 canvas 2d 手绘库（替代网页版 Chart.js / html2canvas）
// 调用方负责根据 dpr 对 ctx 做 scale，本文件统一使用「逻辑像素」坐标。
import { THEME, ACCORD_COLORS } from './theme.js'
import { topAccordDesc } from './mix.js'

function accordColor(key) {
  return ACCORD_COLORS[key] || THEME.primary
}

// 封存卡的小程序码：x 与正文左边界对齐，size 固定。
// y **不再写死**——二维码上移到「配方下方 / 金线上方」后，纵向位置随上方区块高度浮动
// （配方占 1 行还是 2 行会改变）。由 drawCardBase 计算后返回，drawCard 按返回值绘制，
// 保证码与右侧品牌文案不错位。
const CARD_QR = { x: 60, size: 64 }

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

    // 注意：对比名香的「名字」不画进画布。
    // 原先画在右下角 (cx+radius, cy+radius+20)，两个硬伤：
    // ① 和正下方的轴标签（清冽感）在 x 上重叠约 7px，两串字糊在一起；
    // ② 离画布下边缘只剩十几个像素，紧跟其后的文案看着像贴在图上。
    // 名字改由调用方（工坊调香台）在雷达下方单独一行展示，间距可控。
    // overlay.label 仍然收着，只是不再负责绘制。
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

// ---------- 封存卡主体（不含签名，同步绘制） ----------
export function drawCardBase(ctx, opt) {
  const { width, height, name, radarValues, labels,
    quote, formula, accords, accordValues, theme = THEME,
    rarity = '', tierTitle = '', sealLabel = '', qrCode = false, note = '', sealTime = 0 } = opt
  const M = 60
  // 背景
  ctx.fillStyle = theme.paper
  ctx.fillRect(0, 0, width, height)
  // 外边框
  ctx.strokeStyle = theme.primary
  ctx.lineWidth = 3
  ctx.strokeRect(10, 10, width - 20, height - 20)

  // 顶部标题区。香名上限 20 字，固定 28px 会顶出左右安全边距，长名字自动缩小
  ctx.fillStyle = theme.primary
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  fitFontSize(ctx, name || '未命名香氛', width - M * 2, 28, 16, true)
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
  // 标题与内容均左对齐，与「主要香调」保持同一 X 起点（ingX）。
  // 小程序码已上移到配方下方，内容可以占满整幅宽度，不必再给码让位。
  let cursor = listBottom + 30
  ctx.fillStyle = theme.primary
  ctx.fillRect(ingX, cursor - 7, 4, 14)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 14px sans-serif'
  ctx.fillText('配方', ingX + 12, cursor)
  cursor += 20

  ctx.textAlign = 'left'
  ctx.fillStyle = theme.ink
  ctx.font = '14px sans-serif'
  const formulaText = formula && formula.length ? formula.join('、') : '—'
  const fH = wrapTextCenter(ctx, formulaText, ingX, cursor, ingW, 21, 2)
  cursor += fH + 20

  // ---------- 小程序码 + 品牌信息 + 古先生感言（金线之上，紧接配方）----------
  // 码本体由 drawCard 绘制（需要异步 loadImage），这里只排文案并算出码的位置。
  // 码右侧横排两栏：左栏品牌信息、右栏古先生的话，两栏顶端对齐。
  const qrSize = CARD_QR.size
  const qrX = CARD_QR.x
  const qrY = cursor

  // 不带码时（工坊实时预览还没封存）整块左移到正文起点，
  // 否则码位会在卡片中部空出一块 64px 的洞。
  const colX = qrCode ? qrX + qrSize + 16 : ingX
  const infoW = 170                       // 左栏宽度，够放下「扫码调香 · 调出你的味道」
  const guX = colX + infoW                // 右栏起点
  const guW = (width - M) - guX           // 右栏宽度，到右边界为止

  // 左栏：品牌信息
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = theme.ink
  ctx.font = 'bold 13px sans-serif'
  ctx.fillText('调香日记', colX, qrY + 14)
  // 封存日期优先用真实的 sealTime（data.time），不再画「今天」——
  // 否则 8 月封存的香，隔几周重开卡片页会印出重绘当天的日期，信息错误。
  const d = new Date(sealTime ? sealTime : Date.now())
  const ds = d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0')
  ctx.fillStyle = 'rgba(107,106,106,0.9)'
  ctx.font = '12px sans-serif'
  ctx.fillText('封存于 ' + ds, colX, qrY + 38)
  ctx.fillStyle = theme.gold
  ctx.font = '12px sans-serif'
  ctx.fillText(sealLabel || '扫码调香 · 调出你的味道', colX, qrY + 60)

  // 右栏：古先生的话（顶端与左栏首行对齐；中文不用斜体——伪斜跨机型不一致）
  // 先按 14px 量行数，再按实际高度决定这一块的总高。
  const guLineH = 20
  ctx.font = '14px sans-serif'
  const guFull = String(quote || '')
  const guLines = wrapLines(ctx, guFull, guW, 3)
  // 三行装不下时给末行加省略号。wrapLines 会把装不下的部分整个丢弃，
  // 不补的话句子会突然断在半截，看着像渲染 bug（分享图同款处理）
  if (guFull && guLines.join('').length < guFull.length) {
    const last = guLines.length - 1
    guLines[last] = guLines[last].slice(0, -1) + '…'
  }
  const guH = guLines.length * guLineH
  ctx.fillStyle = theme.inkSoft
  guLines.forEach((l, i) => {
    ctx.fillText(l, guX, qrY + 4 + i * guLineH + guLineH / 2)
  })

  // 整块高度取「码 / 左栏三行 / 右栏感言」三者最大值，保证谁都不被裁掉
  // 注意不能叫 blockH —— 上面「主要香调」区块已经用掉这个名字了
  const qrBlockH = Math.max(qrSize, 60, guH)
  const qrBottom = qrY + qrBlockH

  // ---------- 页脚金线（上述区块下方）----------
  const footerY = qrBottom + 22
  ctx.strokeStyle = 'rgba(169,120,38,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(M, footerY)
  ctx.lineTo(width - M, footerY)
  ctx.stroke()

  // ---------- 区块 3：用户自己的调香感言（金线之下）----------
  // 这是用户封存时亲手填的那句 20 字感触（note），和上方古先生的话（quote）是两回事。
  // 没填就整块留白——金线位置不变，保证填与不填的卡片结构一致。
  const noteText = String(note || '').trim()
  if (noteText) {
    const nAreaTop = footerY + 20
    const nAreaBottom = height - 30
    const nAreaH = nAreaBottom - nAreaTop
    const nLineH = 26
    const nLabelH = 22
    let nMaxLines = Math.floor((nAreaH - nLabelH) / nLineH)
    if (nMaxLines < 1) nMaxLines = 1
    if (nMaxLines > 2) nMaxLines = 2

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '12px sans-serif'
    const nLines = wrapLines(ctx, noteText, width - M * 2, nMaxLines)
    const nH = nLabelH + nLines.length * nLineH
    const nTop = nAreaTop + Math.max(0, (nAreaH - nH) / 2)

    ctx.fillStyle = theme.gold
    ctx.fillText('调香感言', width / 2, nTop + 8)
    ctx.fillStyle = theme.ink
    ctx.font = '16px sans-serif'
    nLines.forEach((l, i) => {
      ctx.fillText(l, width / 2, nTop + nLabelH + i * nLineH + nLineH / 2)
    })
  }

  // 供 drawCard 定位二维码图片，避免码与右侧文案错位
  return { qr: { x: qrX, y: qrY, size: qrSize } }
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
  // 二维码纵向位置由本次布局决定（配方占几行会改变它），取返回值而非常量
  const layout = drawCardBase(ctx, opt)
  const qr = (layout && layout.qr) || null

  // 小程序码：位置由 drawCardBase 算出，与右侧品牌文案共用同一 y，保证不错位。
  // 这张卡会被保存到相册或分享到聊天窗口，看到的人扫码就能进小程序。真码。
  if (qrCode && qr && canvas && qrSrc) {
    try {
      const qrImg = await loadImage(canvas, qrSrc)
      // 白底衬垫：只包住码本身，文案由 drawCardBase 负责，互不遮挡
      ctx.fillStyle = '#fff'
      roundRect(ctx, qr.x - 4, qr.y - 4, qr.size + 8, qr.size + 8, 8)
      ctx.fill()
      ctx.drawImage(qrImg, qr.x, qr.y, qr.size, qr.size)
    } catch (e) {
      // 加载失败静默，不阻塞主流程
    }
  }
}

// ---------- 分享图（转发好友 5:4 / 朋友圈 1:1）----------
// 微信官方规范：onShareAppMessage 的 imageUrl 显示比例是 5:4，onShareTimeline 是 1:1。
// 直接把 600×900 的封存卡塞进去会被居中裁剪——香名在顶部、调香感言在底部，
// 正好是被裁掉的两端。所以分享图单独画一版。
//
// 内容只留三样：香名（超大字）+ 雷达色块（视觉锤）+ 一句话。
// 不放小程序码：分享出去的是小程序卡片，点开直接进小程序，码在这里没有意义
// （码只在「存到相册」那张图上需要，那张图可能被打印或发到别的平台）。
export const SHARE_SIZE = {
  friend: { w: 750, h: 600 },   // 5:4
  timeline: { w: 600, h: 600 }  // 1:1
}

// 简化雷达：只画数据多边形 + 外圈，不画网格线/轴线/标签。
// 分享图在聊天里只有约 200×160，任何 1px 细线缩完都是一团糊。
function drawShareRadar(ctx, opt) {
  const { cx, cy, radius, values, max = 100, color } = opt
  const n = values.length
  const angle = (i) => (i / n) * Math.PI * 2 - Math.PI / 2

  // 外圈参照边界：缩略图上能一眼看出「这是个图形」而不是一团色块
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const x = cx + Math.cos(angle(i)) * radius
    const y = cy + Math.sin(angle(i)) * radius
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.strokeStyle = rgba(color, 0.28)
  ctx.lineWidth = Math.max(2, radius * 0.02)
  ctx.stroke()

  // 数据多边形：实心填充，这是整张分享图的视觉锤
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(max, values[i] || 0)) / max
    const x = cx + Math.cos(angle(i)) * radius * v
    const y = cy + Math.sin(angle(i)) * radius * v
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = rgba(color, 0.55)
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(3, radius * 0.04)
  ctx.stroke()
}

// 画一张分享图。opt: { width, height, name, radarValues, quote, accords, accordValues, theme }
export function drawShareCard(ctx, opt) {
  const {
    width, height, name = '', radarValues = [], quote = '',
    accords = [], accordValues = {}, theme = THEME
  } = opt

  const cx = width / 2
  const border = Math.max(3, width * 0.006)

  // 背景 + 外边框（与封存卡同一套纸感）
  ctx.fillStyle = theme.paper
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = theme.primary
  ctx.lineWidth = border
  ctx.strokeRect(border, border, width - border * 2, height - border * 2)

  // 主香调的颜色就是这瓶香的性格，拿它当视觉锤的主色
  let topKey = ''
  let topVal = -1
  accords.forEach((a) => {
    const v = accordValues[a.key] || 0
    if (v > topVal) { topVal = v; topKey = a.key }
  })
  const mainColor = accordColor(topKey)

  // 1) 香名：分享图上第一眼要看到的，字号按画布宽度取 7.5%，长名字自动缩小。
  // 没起名时不用「未命名香氛」——改用主香调描述（如「柑橘调·木质调」），
  // 分享出去至少能看出这瓶香是什么性格。
  const titleName = (name && name !== '未命名香氛') ? name : topAccordDesc(accordValues, 2)
  ctx.fillStyle = theme.primary
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  fitFontSize(ctx, titleName, width * 0.84, width * 0.075, Math.round(width * 0.03), true)
  ctx.fillText(titleName, cx, height * 0.14)

  // 2) 雷达色块：画面中心，直径约占短边 42%
  const radarR = Math.min(width, height) * 0.21
  drawShareRadar(ctx, {
    cx, cy: height * 0.55, radius: radarR,
    values: radarValues, color: mainColor
  })

  // 3) 一句话：最多 2 行，超出截断（分享卡片上它只是氛围，不是信息主体）
  const qSize = Math.round(width * 0.028)
  const qLineH = qSize * 1.5
  ctx.font = `${qSize}px sans-serif`
  const qText = String(quote || '')
  const qLines = wrapLines(ctx, qText, width * 0.84, 2)
  // 两行装不下时给末行加省略号。句子突然断在半截，看起来像渲染 bug
  // （当前 90 条感言最长 58 字，1:1 版容量约 59 字，刚好不触发；加新文案就会）
  if (qText && qLines.join('').length < qText.length) {
    const last = qLines.length - 1
    qLines[last] = qLines[last].slice(0, -1) + '…'
  }
  const qTop = height * 0.815
  ctx.fillStyle = theme.inkSoft
  qLines.forEach((l, i) => {
    ctx.fillText(l, cx, qTop + i * qLineH)
  })

  // 4) 品牌
  const bSize = Math.round(width * 0.022)
  ctx.fillStyle = theme.gold
  ctx.font = `${bSize}px sans-serif`
  ctx.fillText('调香日记', cx, height * 0.945)
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

// 换行并居中绘制，返回实际占用高度。
// 结构化布局需要「先量后画」：只有知道这段文字占几行，才能算出下一个区块的 Y，
// 否则内容长短不一（短配方 / 8 调长配方 / 长感言）会让区块互相重叠或底部留大片空白。
// 按可用宽度自适应字号：先用 startSize 量一次，超宽就按比例缩到刚好，再逐 px 微调。
// 香名上限是 20 字，固定字号在窄画布上必然撑破——名字长就自动变小，而不是溢出画布。
// 返回最终字号，调用前需保证 ctx.font 已被本函数设好。
function fitFontSize(ctx, text, maxWidth, startSize, minSize, bold = false) {
  const set = (s) => { ctx.font = `${bold ? 'bold ' : ''}${s}px sans-serif` }
  let size = Math.round(startSize)
  set(size)
  const w0 = ctx.measureText(text || '').width
  if (w0 > maxWidth && w0 > 0) {
    size = Math.max(minSize, Math.floor(size * maxWidth / w0))
    set(size)
    while (size > minSize && ctx.measureText(text || '').width > maxWidth) {
      size -= 1
      set(size)
    }
  }
  return size
}

// 纯计算：按 maxWidth 折行，返回行数组，不绘制。
// 拆出来是为了让布局阶段能「先量后画」——感言要在金线下方的剩余区域里垂直居中，
// 必须先知道它占几行，才能算起始 y。
// 注意：依赖调用前已设好的 ctx.font（measureText 按当前字号量）。
function wrapLines(ctx, text, maxWidth, maxLines = 3) {
  if (!text) return []
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
  return lines.length ? lines : ['']
}

// 水平居中折行绘制（cx 为水平中心；左对齐时传左起点亦可，行为由 ctx.textAlign 决定）。
// 返回实际占用高度，供调用方推进 cursor。
function wrapTextCenter(ctx, text, cx, top, maxWidth, lineHeight, maxLines = 3) {
  if (!text) return 0
  const lines = wrapLines(ctx, text, maxWidth, maxLines)
  lines.forEach((l, i) => {
    ctx.fillText(l, cx, top + i * lineHeight + lineHeight / 2)
  })
  return lines.length * lineHeight
}
