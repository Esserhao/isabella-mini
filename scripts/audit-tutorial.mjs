// 手把手教程自检。
//
// 为什么需要这个脚本：引导出问题时，代码里完全看不出异常——
// 表现只是「点下一步没反应 / 卡在某一步」。
// Bug 4 就是典型：图鉴 tab 用 v-show 藏着目标元素，量不到宽高，
// 定位逻辑重试到死。这类问题只能靠脚本把 step 配置和页面模板对一遍。
//
// 检查项：
//   1. 每一步的 target 在对应页面里是否真有这个 id（改了/删了 id 会静默卡住）
//   2. target 是否被 v-if / v-show 包裹（条件不满足时量不到宽高）
//   3. 每步的 page 是否都是 tabBar 页（跨页走 switchTab，非 tabBar 页跳不过去）
//   4. 六维释义是否齐全（键名和标签对不上，弹窗里那一维只剩标题）
//
// 用法：node scripts/audit-tutorial.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TUTORIAL_STEPS } from '../src/utils/tutorial.js'
import { RADAR_LABELS, RADAR_DIM_DESC } from '../src/utils/data.js'
import { placeCard, desiredScrollTop, canFitCleanly, CARD_EDGE } from '../src/utils/coach-layout.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const exists = (p) => fs.existsSync(path.join(root, p))

// WXML 里的自闭合 / 空元素，不能压栈等闭合标签
const VOID = new Set(['image', 'input', 'icon', 'br', 'hr', 'import', 'include', 'wxs', 'slot', 'switch'])

function templateOf(src) {
  const m = /<template>([\s\S]*?)<\/template>/.exec(src)
  return m ? m[1] : ''
}
function stripComments(s) {
  return s.replace(/<!--[\s\S]*?-->/g, '')
}

// 解析模板，挑出所有带 id 的元素，并记下它的祖先链（用来查 v-if / v-show）
function parseIds(tpl) {
  const found = []
  const stack = []
  // 属性值里可能出现 > （比如 :style="a > b"），用引号做粗分隔够用了
  const tagRe = /<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g
  let m
  while ((m = tagRe.exec(tpl))) {
    const [, close, tag, rawAttrs, selfClose] = m
    if (close) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) { stack.length = i; break }
      }
      continue
    }
    const attrs = {}
    const attrRe = /([:@a-zA-Z][\w:.-]*)\s*=\s*"([^"]*)"/g
    let a
    while ((a = attrRe.exec(rawAttrs))) attrs[a[1]] = a[2]
    const node = { tag, attrs, ancestors: stack.map((s) => s.attrs) }
    // 静态 id 和动态 :id 都要认：图鉴/工坊的目标都是三元表达式绑上去的
    const staticId = attrs.id
    const dynamicId = attrs[':id'] !== undefined ? attrs[':id'] : attrs['v-bind:id']
    if (staticId !== undefined) found.push({ id: staticId, dynamic: false, node })
    else if (dynamicId !== undefined) found.push({ id: dynamicId, dynamic: true, node })
    if (!selfClose && !VOID.has(tag)) stack.push(node)
  }
  return found
}

// 祖先链上第一个会让它「不可见」的指令
function hiddenBy(ancestors) {
  for (const attrs of ancestors) {
    for (const k of Object.keys(attrs)) {
      if (k === 'v-show') return `v-show="${attrs[k]}"`
      if (k === 'v-if') return `v-if="${attrs[k]}"`
    }
  }
  return ''
}

const problems = []
const warnings = []
const total = TUTORIAL_STEPS.length

// ---- 1 & 2：target 是否存在、是否会被藏起来 ----
TUTORIAL_STEPS.forEach((s, i) => {
  const no = `#${i + 1}/${total}`
  if (!s.title || !s.text) problems.push(`${no} 缺 title 或 text`)
  if (!s.target) { problems.push(`${no} 缺 target`); return }

  const file = `src/pages/${s.page}/${s.page}.vue`
  if (!exists(file)) { problems.push(`${no} 页面文件不存在：${file}`); return }

  const ids = parseIds(stripComments(templateOf(read(file))))
  const name = String(s.target).replace(/^#/, '')
  // 动态 :id 匹配表达式里出现的字符串，例如 :id="i === 0 ? 'coachGalleryCard' : ''"
  const hits = ids.filter((x) =>
    x.dynamic
      ? new RegExp(`['"\`]${name}['"\`]`).test(x.id)
      : x.id === name
  )

  if (hits.length === 0) {
    problems.push(`${no} 目标 #${name} 在 ${file} 里找不到（id 改过？）`)
  } else {
    if (hits.length > 1) problems.push(`${no} 目标 #${name} 在 ${file} 里出现 ${hits.length} 次，应当唯一`)
    const hid = hiddenBy(hits[0].node.ancestors)
    if (hid) {
      warnings.push(
        `${no} 目标 #${name} 被 ${hid} 包裹 —— 条件不满足时宽高为 0、量不到位置。` +
        ' 请确认切到该步之前已经把条件打开（参考 gallery.vue 的 ensureCoachTargetVisible）'
      )
    }
  }
})

// ---- 3：跨页跳转用 switchTab，只能跳 tabBar 页 ----
const pagesJson = JSON.parse(read('src/pages.json'))
const tabPages = new Set((pagesJson.tabBar && pagesJson.tabBar.list || []).map((t) => t.pagePath))
TUTORIAL_STEPS.forEach((s, i) => {
  const p = `pages/${s.page}/${s.page}`
  if (!tabPages.has(p)) {
    problems.push(`#${i + 1}/${total} 的页 ${p} 不在 tabBar 里 —— goToPage 用 switchTab 跳不过去`)
  }
})

// ---- 4：六维释义与标签一一对应 ----
RADAR_LABELS.forEach((lab) => {
  if (!RADAR_DIM_DESC[lab]) problems.push(`六维释义缺失：${lab}`)
})
Object.keys(RADAR_DIM_DESC).forEach((k) => {
  if (!RADAR_LABELS.includes(k)) warnings.push(`RADAR_DIM_DESC 里有 RADAR_LABELS 用不到的键：${k}`)
})

// ---- 5：卡片摆放几何 ----
// 定位偏移只能上真机用眼睛看，这里把各种机型尺寸 × 目标形状先算一遍。
// 假设：页面能滚到任意位置（首页/工坊都是长页面，成立；图鉴是 scroll-view，滚不动）。
const DEVICES = [
  { name: 'iPhone SE 一代', w: 320, h: 568 },
  { name: 'iPhone 8 / SE2', w: 375, h: 667 },
  { name: 'iPhone 14 Pro Max', w: 430, h: 932 },
  { name: 'iPad mini 竖屏', w: 744, h: 1133 }
]
const TARGETS = [
  { name: '贴顶按钮', top: 90, height: 44 },
  { name: '视口中部按钮', top: 300, height: 44 },
  { name: '沉底按钮', top: 560, height: 44 },
  { name: '首屏之下的滑块区', top: 760, height: 260 },
  { name: '工坊雷达面板（很高）', top: 160, height: 380 }
]
const CARD_HEIGHTS = [145, 200, 260]   // 实测卡片约 145px，兜底 170，末步再多一行

// 目标比屏幕还高时，滚动后也不可能完整露出来，属物理限制
function canShowFully(screenH, rectHeight) {
  return rectHeight + CARD_EDGE * 2 <= screenH
}

let geoCases = 0
let geoSkipped = 0   // 摆在视口外、但脚本认为不需要滚的情况（有问题的话会报出来）
for (const d of DEVICES) {
  for (const t of TARGETS) {
    for (const ch of CARD_HEIGHTS) {
      geoCases++
      const cardW = Math.round(d.w * 600 / 750)   // 卡片宽 600rpx
      const tag = `${d.name} / ${t.name} / 卡片 ${ch}px`

      if (cardW > d.w - CARD_EDGE * 2) { problems.push(`几何：${tag} —— 卡片宽度超出屏幕`); continue }

      // 先按当前位置试摆，再决定要不要滚；滚了就按滚后的坐标重摆
      const want = desiredScrollTop({
        screenH: d.h, rectTop: t.top, rectHeight: t.height, scrollTop: 0, cardH: ch
      })
      const newTop = want === null ? t.top : t.top - want
      const after = placeCard({
        screenW: d.w, screenH: d.h, cardW, cardH: ch,
        rect: { top: newTop, left: 20, width: d.w - 40, height: t.height }
      })

      if (after.top < 0 || after.top + ch > d.h) {
        problems.push(`几何：${tag} —— 卡片跑出屏幕（top=${after.top}, 底=${after.top + ch}, 屏高=${d.h}）`)
      }
      if (after.left < 0 || after.left + cardW > d.w) {
        problems.push(`几何：${tag} —— 卡片横向出界（left=${after.left}, 宽=${cardW}）`)
      }

      // 聚光灯照不到视口外。目标在首屏之下时必须滚进来 —— 少判这一条，
      // 「只在不重叠时才不滚」的写法就会让长页面底部目标永远滚不动。
      const fully = newTop >= 0 && newTop + t.height <= d.h
      if (!fully) {
        const msg = `几何：${tag} —— 滚动后目标仍未完整露出（top=${newTop}）`
        if (canShowFully(d.h, t.height)) problems.push(msg)
        else warnings.push(msg + ' —— 目标本身比视口还高，只能露出一部分')
      }

      if (after.overlaps) {
        const msg = `几何：${tag} —— 卡片压住目标 ${after.overlapPx}px（top=${after.top}）`
        // 屏幕实在塞不下（目标 + 间距 + 卡片 > 屏高）是物理限制，不是算法问题，
        // 降级为提醒；塞得下还压住就是真 bug。
        if (canFitCleanly(d.h, t.height, ch)) problems.push(msg)
        else warnings.push(msg + ' —— 该屏高放不下，已取重叠最小的位置')
      }
      if (want === null && newTop + t.height > d.h) geoSkipped++
    }
  }
}

// ---- 报告 ----
console.log(`========== 手把手教程自检（共 ${total} 步） ==========`)
TUTORIAL_STEPS.forEach((s, i) => {
  console.log(`  ${i + 1}/${total}  ${s.page.padEnd(8)} ${s.target.padEnd(20)} ${s.title}`)
})
console.log('')

if (warnings.length) {
  console.log(`⚠️  提醒 ${warnings.length} 条：`)
  warnings.forEach((w) => console.log('  - ' + w))
  console.log('')
}
if (problems.length) {
  console.log(`❌ 问题 ${problems.length} 条：`)
  problems.forEach((p) => console.log('  - ' + p))
  process.exit(1)
}
console.log('✅ 教程步骤与页面模板一致，未发现问题')
