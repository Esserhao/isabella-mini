// 封存卡布局自检：用 mock ctx 跑一遍 drawCardBase / drawCard，
// 记录所有文本与矩形坐标，检测越界与重叠。
import { drawCardBase, drawCard, drawShareCard, SHARE_SIZE } from '../src/utils/canvas-draw.js'
import { ACCORDS, RADAR_LABELS, galleryPerfumes } from '../src/utils/data.js'
import { computeRadarValues, generateFormula, getGuQuote } from '../src/utils/mix.js'
import { THEME } from '../src/utils/theme.js'

const W = 600, H = 900

function makeCtx() {
  const log = []
  const state = { font: '12px sans-serif', textAlign: 'left', textBaseline: 'top', globalAlpha: 1 }
  const stack = []
  const c = {
    _log: log,
    set font(v) { state.font = v }, get font() { return state.font },
    set textAlign(v) { state.textAlign = v }, get textAlign() { return state.textAlign },
    set textBaseline(v) { state.textBaseline = v }, get textBaseline() { return state.textBaseline },
    set globalAlpha(v) { state.globalAlpha = v }, get globalAlpha() { return state.globalAlpha },
    fillStyle: '', strokeStyle: '', lineWidth: 1,
    measureText(t) {
      const m = /(\d+(?:\.\d+)?)px/.exec(state.font)
      const size = m ? parseFloat(m[1]) : 12
      let w = 0
      for (const ch of String(t)) w += /[\u4e00-\u9fa5]/.test(ch) ? size : size * 0.55
      return { width: w }
    },
    fillText(text, x, y) {
      const m = /(\d+(?:\.\d+)?)px/.exec(state.font)
      const size = m ? parseFloat(m[1]) : 12
      const w = c.measureText(text).width
      let left = x
      if (state.textAlign === 'center') left = x - w / 2
      else if (state.textAlign === 'right') left = x - w
      log.push({ type: 'text', text: String(text), x, y, w, size, left, right: left + w, top: y - size * 0.6, bottom: y + size * 0.4, align: state.textAlign })
    },
    fillRect(x, y, w, h) { log.push({ type: 'rect', kind: 'fill', x, y, w, h, right: x + w, bottom: y + h, fill: c.fillStyle }) },
    strokeRect(x, y, w, h) { log.push({ type: 'rect', kind: 'stroke', x, y, w, h, right: x + w, bottom: y + h }) },
    beginPath() {}, moveTo() {}, lineTo() {}, arcTo() {}, closePath() {},
    arc() {}, fill() {}, stroke() {}, save() { stack.push({ ...state }) }, restore() { const s = stack.pop(); if (s) Object.assign(state, s) },
    translate() {}, rotate() {}, scale() {}, setLineDash() {}, clearRect() {},
    drawImage(img, x, y, w, h) { log.push({ type: 'image', x, y, w, h, right: x + w, bottom: y + h }) }
  }
  return c
}

function rectOf(e) {
  if (e.type === 'text') return { x: e.left, y: e.top, right: e.right, bottom: e.bottom, label: `TEXT "${e.text}"` }
  if (e.type === 'rect') return { x: e.x, y: e.y, right: e.right, bottom: e.bottom, label: `RECT(${e.kind}) fill=${e.fill}` }
  return { x: e.x, y: e.y, right: e.right, bottom: e.bottom, label: 'IMAGE(qr)' }
}
function overlap(a, b) {
  const ix = Math.min(a.right, b.right) - Math.max(a.x, b.x)
  const iy = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y)
  return ix > 2 && iy > 2 ? { ix, iy } : null
}

async function run(label, accords, opts = {}) {
  const ctx = makeCtx()
  const radarValues = computeRadarValues(accords)
  const formula = generateFormula(accords)
  const quote = getGuQuote(radarValues)
  const cardOpt = {
    width: W, height: H,
    name: opts.name || '午后柑橘园',
    radarValues, labels: RADAR_LABELS, quote,
    formula, accords: ACCORDS, accordValues: accords, theme: THEME,
    rarity: opts.rarity === undefined ? '稀有' : opts.rarity,
    tierTitle: opts.tierTitle === undefined ? '学徒封存' : opts.tierTitle,
    ...(opts.extra || {})
  }
  // 伪造 canvas 节点：让 loadImage 成功，从而完整走到 drawCard 的 qrCode 分支，
  // 覆盖真实绘制路径（含白底衬垫与「扫码调香」小字）
  const fakeCanvas = {
    createImage() {
      return {
        set src(v) { setTimeout(() => this.onload && this.onload(), 0) },
        onload: null, onerror: null
      }
    }
  }
  if (opts.withQr) {
    await drawCard(ctx, { ...cardOpt, canvas: fakeCanvas, qrCode: true, qrSrc: 'fake.png' })
    // 等一拍让 mock image 的 onload 触发
    await new Promise(r => setTimeout(r, 10))
  } else {
    drawCardBase(ctx, cardOpt)
  }
  const items = ctx._log.map(rectOf)
  console.log(`\n========== ${label} ==========`)
  console.log(`配方文本: ${formula.join('、')}`)
  console.log(`台词: ${quote}`)
  console.log('--- 元素坐标 ---')
  items.filter(i => i.y > 0 && i.y < H).sort((a, b) => a.y - b.y).forEach(i => {
    console.log(`  y=${i.y.toFixed(0).padStart(4)}..${i.bottom.toFixed(0).padStart(4)}  x=${i.x.toFixed(0).padStart(4)}..${i.right.toFixed(0).padStart(4)}  ${i.label}`)
  })
  // 越界检测（装饰性满版矩形如背景纸、色块本就该到卡片边缘，不参与越界判定）
  const oob = items.filter(i => !i.label.startsWith('RECT') && (i.bottom > H - 4 || i.right > W - 4 || i.x < 4))
  if (oob.length) { console.log('  !! 越界:'); oob.forEach(i => console.log(`     ${i.label} bottom=${i.bottom.toFixed(0)} right=${i.right.toFixed(0)} x=${i.x.toFixed(0)}`)) }
  // 文本重叠检测
  const texts = items.filter(i => i.label.startsWith('TEXT'))
  const rects = items.filter(i => (i.label.startsWith('RECT') && i.label.includes('fill=#fff')) || i.label.startsWith('IMAGE'))
  console.log('--- 文本 vs 白色块(小程序码衬垫) 重叠 ---')
  let hit = 0
  rects.forEach(r => texts.forEach(t => { const o = overlap(t, r); if (o) { hit++; console.log(`  !! "${t.label}" 被白块盖住 重叠 ${o.ix.toFixed(0)}x${o.iy.toFixed(0)}`) } }))
  console.log('--- 文本之间重叠 ---')
  let th = 0
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const o = overlap(texts[i], texts[j]); if (o) { th++; console.log(`  !! ${texts[i].label} 与 ${texts[j].label} 重叠 ${o.ix.toFixed(0)}x${o.iy.toFixed(0)}`) }
  }
  if (!hit && !th && !oob.length) console.log('  ✅ 未发现重叠/越界')
  return { hit, th, oob: oob.length }
}

const p0 = galleryPerfumes[0]
const a0 = {}
ACCORDS.forEach(a => { a0[a.key] = p0.accords[a.key] || 0 })

// 场景1：短配方（3个香调）
const short = { citrus: 60, floral: 30, woody: 10 }
ACCORDS.forEach(a => { if (short[a.key] === undefined) short[a.key] = 0 })
await run('场景1 短配方 + 无码', short)
await run('场景2 短配方 + 有小程序码', short, { withQr: true })
// 场景3：长配方（真实图鉴香水，可能4-6个香调）
await run('场景3 真实图鉴配方 + 有小程序码', a0, { withQr: true })
// 场景4：极长配方
const long = { citrus: 25, floral: 20, fruity: 15, woody: 15, oriental: 10, green: 8, musk: 4, aquatic: 3 }
ACCORDS.forEach(a => { if (long[a.key] === undefined) long[a.key] = 0 })
await run('场景4 极长配方(8调) + 有小程序码', long, { withQr: true })
// 场景5：超长感言。金线上方的右栏古先生感言最多 3 行，必须验证「截断」而不是「溢出卡片」
await run('场景5 超长古先生感言(>3行) + 有小程序码', a0, {
  withQr: true,
  extra: { quote: '这是一段刻意写得极长的调香感言，用来验证当文案长度超过三行时卡片会截断而不是把文字溢出到卡片外面，同时右栏与左栏品牌信息顶端仍然保持对齐不会互相压住。' }
})
// 场景6：用户填了自己的感言（20 字内），金线下方应出现「调香感言」区块
await run('场景6 用户感言(15字) + 有小程序码', a0, {
  withQr: true,
  extra: { note: '像夏天的傍晚，风里有橘子皮的味道' }
})
// 场景7：用户感言顶满 20 字上限，验证金线下方区块不溢出、不挤压金线
await run('场景7 用户感言(20字满) + 有小程序码', a0, {
  withQr: true,
  extra: { note: '第一次调出让自己满意的香，想留住这个下午。' }
})

// 场景8：香名顶满 20 字上限。香名是固定字号画的，不自适应就会顶出左右安全边距
await run('场景8 超长香名(20字) + 有小程序码', a0, {
  withQr: true,
  name: '一支名字长到会撑破卡片的香氛呀'
})

// ---------- 分享图（转发好友 5:4 / 朋友圈 1:1）----------
// 不能用封存卡那张 600×900 的图顶替：非目标比例会被居中裁剪，香名和感言正好在两端。
function runShare(label, size, accords, opts = {}) {
  const ctx = makeCtx()
  const radarValues = computeRadarValues(accords)
  const quote = getGuQuote(radarValues)
  drawShareCard(ctx, {
    width: size.w, height: size.h,
    name: opts.name || '午后柑橘园',
    radarValues, quote,
    accords: ACCORDS, accordValues: accords, theme: THEME
  })
  const items = ctx._log.map(rectOf)
  console.log(`\n========== ${label} (${size.w}x${size.h}) ==========`)
  console.log(`台词: ${quote}`)
  items.filter(i => i.label.startsWith('TEXT')).forEach(i => {
    console.log(`  y=${i.y.toFixed(0).padStart(4)}..${i.bottom.toFixed(0).padStart(4)}  x=${i.x.toFixed(0).padStart(4)}..${i.right.toFixed(0).padStart(4)}  ${i.label}`)
  })
  const texts = items.filter(i => i.label.startsWith('TEXT'))
  const oob = texts.filter(i => i.bottom > size.h || i.right > size.w || i.x < 0 || i.y < 0)
  if (oob.length) { console.log('  !! 越界:'); oob.forEach(i => console.log(`     ${i.label} bottom=${i.bottom.toFixed(0)} right=${i.right.toFixed(0)}`)) }
  let th = 0
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const o = overlap(texts[i], texts[j])
    if (o) { th++; console.log(`  !! ${texts[i].label} 与 ${texts[j].label} 重叠 ${o.ix.toFixed(0)}x${o.iy.toFixed(0)}`) }
  }
  if (!th && !oob.length) console.log('  ✅ 未发现重叠/越界')
  return { th, oob: oob.length }
}

await runShare('分享图A 转发好友 5:4', SHARE_SIZE.friend, a0)
await runShare('分享图B 朋友圈 1:1', SHARE_SIZE.timeline, a0)
await runShare('分享图C 超长香名 5:4', SHARE_SIZE.friend, a0, { name: '一支名字长到会撑破卡片的香水' })
