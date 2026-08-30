// 调香台「纯水优先让位」的自检。
//
// 为什么需要：normalizeFrom 是唯一改动滑块数值的出口，四条拖动路径全汇总到这里。
// 它守着一条硬约束——12 个香调 + 纯水，总和必须恰好 100。这条约束一旦破，
// 滑块上显示的数字对不上、雷达比例失真、封存出来的配方也不是 100%，
// 而且破得很隐蔽：单次拖动只差 1~2，肉眼根本看不出来，拖几次就漂走了。
//
// 关键点：不复制一份逻辑，而是从 lab.vue 里把 normalizeFrom 的源码抠出来执行。
// 复制的话，改了组件这边也测不出来。抠不到就报错，绝不静默通过。
//
// 用法：node scripts/audit-blend.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ACCORDS, SOLVENT, BLEND_KEYS } from '../src/utils/data.js'
import { blankBlend, strengthOf } from '../src/utils/mix.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const labSrc = fs.readFileSync(path.join(root, 'src/pages/lab/lab.vue'), 'utf8')

// 抠 normalizeFrom 整段（从它的分节注释起，到 syncIngFromAccord 为止）
function extractBlock(src) {
  const start = src.indexOf('// 归一化：把 anchorKey 定在 target')
  if (start < 0) throw new Error('lab.vue 里找不到 normalizeFrom 的分节注释，标记被改了？')
  const rest = src.slice(start)
  const end = rest.indexOf('// 两套滑块共用同一份底层占比')
  if (end < 0) throw new Error('lab.vue 里找不到 normalizeFrom 之后的 syncIngFromAccord 分节，标记被改了？')
  return rest.slice(0, end)
}

const block = extractBlock(labSrc)

// 组件里的 armEgg / SOLVENT / BLEND_KEYS / 彩蛋登记在 Node 下不存在，注入替身。
// touchedAccords（「十二味全开」的会话记录）用真 Set，文末对它做准确性断言。
const values = {}
const scope = {
  armEgg: () => {},
  SOLVENT,
  BLEND_KEYS,
  ACCORDS,
  values,
  touchedAccords: new Set(),
  achieveEgg: () => false
}
const factory = new Function(
  ...Object.keys(scope),
  `${block}\n return { normalizeFrom }`
)
const { normalizeFrom } = factory(...Object.values(scope))
// 脚本层也要拿到「十二味记录」的同一个 Set（reset 里清零、文末断言）
const touchedAccords = scope.touchedAccords

const problems = []
let caseNo = 0

const KEYS = ACCORDS.map((a) => a.key)
const W = SOLVENT.key

// 必须先全部清零再覆盖：场景里只写了关心的那几味，
// 直接 Object.assign 会把上一个场景剩下的香调带进来，断言就全错了。
function reset(blend) {
  BLEND_KEYS.forEach((k) => { values[k] = 0 })
  Object.assign(values, blend || blankBlend())
  touchedAccords.clear()
}
const total = () => BLEND_KEYS.reduce((s, k) => s + (values[k] || 0), 0)
const show = () => {
  const parts = []
  KEYS.forEach((k) => { if (values[k]) parts.push(k + '=' + values[k]) })
  parts.push(W + '=' + values[W])
  return parts.join(' ')
}
// 每步之后都要成立的三条硬约束
function checkInvariants(tag) {
  const t = total()
  const bad = []
  if (t !== 100) bad.push(`总和 ${t}≠100`)
  const neg = BLEND_KEYS.filter((k) => !Number.isInteger(values[k]) || values[k] < 0)
  if (neg.length) bad.push(`非整数或负数：${neg.map((k) => k + '=' + values[k]).join(',')}`)
  if (bad.length) {
    problems.push(`${tag} → ${bad.join('；')}（${show()}）`)
    return false
  }
  return true
}

// 场景：一串拖拽 + 最后对若干项逐一断言
function run(name, start, actions, expect) {
  caseNo++
  reset(start)
  actions.forEach(([k, v]) => normalizeFrom(k, v))
  const okInv = checkInvariants(name)
  const errs = []
  Object.keys(expect).forEach((k) => {
    if (values[k] !== expect[k]) errs.push(`${k} 应为 ${expect[k]}，实际 ${values[k]}`)
  })
  const ok = okInv && errs.length === 0
  console.log(`  ${ok ? '✅' : '❌'} ${name}`)
  if (!ok) { errs.forEach((e) => console.log(`       ${e}`)); if (!okInv) problems.push(name) }
  if (errs.length) problems.push(`${name}：${errs.join('；')}`)
}

console.log('========== 纯水优先让位自检 ==========')

// 起点：一杯纯水
run('清水起步，把花香加到 30 → 水让出 30',
  null, [['floral', 30]],
  { floral: 30, [W]: 70, woody: 0 })

run('水还够时再加木质 20 → 花香纹丝不动',
  { floral: 30, [W]: 70 }, [['woody', 20]],
  { floral: 30, woody: 20, [W]: 50 })

run('把花香从 30 降到 10 → 腾出的 20 全部补给水，木质不动',
  { floral: 30, woody: 20, [W]: 50 }, [['floral', 10]],
  { floral: 10, woody: 20, [W]: 70 })

run('把花香降到 0 → 水继续补满，木质仍不动',
  { floral: 10, woody: 20, [W]: 70 }, [['floral', 0]],
  { floral: 0, woody: 20, [W]: 80 })

run('水已为 0 时加柑橘 30 → 只能按原比例从香调里让',
  { floral: 60, woody: 40, [W]: 0 }, [['citrus', 30]],
  { citrus: 30, floral: 42, woody: 28, [W]: 0 })

run('把水从 40 拖到 70 → 香调等比例被置换掉',
  { floral: 60, [W]: 40 }, [[W, 70]],
  { floral: 30, [W]: 70 })

run('把水从 40 拖到 10 → 香调按比例被放大',
  { floral: 60, [W]: 40 }, [[W, 10]],
  { floral: 90, [W]: 10 })

run('某香调直接拖到 100 → 其余（含水）全部归 0',
  { floral: 60, woody: 40, [W]: 0 }, [['citrus', 100]],
  { citrus: 100, floral: 0, woody: 0, [W]: 0 })

run('把某香调拖到 0 → 它的份额全给水',
  { citrus: 20, floral: 30, [W]: 50 }, [['floral', 0]],
  { citrus: 20, floral: 0, [W]: 80 })

run('连续十次小幅加量，水一路让到底',
  null,
  [['floral', 10], ['woody', 10], ['citrus', 10], ['green', 10], ['musk', 10],
   ['amber', 10], ['vanilla', 10], ['tobacco', 10], ['aquatic', 10], ['fruity', 10]],
  { floral: 10, woody: 10, citrus: 10, green: 10, musk: 10,
    amber: 10, vanilla: 10, tobacco: 10, aquatic: 10, fruity: 10, [W]: 0 })

// 「十二味全开」的记录准确性：10 次香调拖拽后应记满 10 味（拖纯水不计）
const paletteOK = touchedAccords.size === 10 &&
  !touchedAccords.has(W) && touchedAccords.has('floral') && touchedAccords.has('fruity')
console.log(`  ${paletteOK ? '✅' : '❌'} 十二味记录：10 次香调拖拽后记录 ${touchedAccords.size} 味（应 10，不含纯水）`)
if (!paletteOK) problems.push('十二味记录不准：' + [...touchedAccords].join(','))

// 模糊测试：随机起点 + 随机拖拽，每一步都必须守住总和 100
let fuzzBad = 0
let fuzzSteps = 0
let worst = 0
for (let i = 0; i < 3000; i++) {
  reset(blankBlend())
  for (let step = 0; step < 12; step++) {
    const key = BLEND_KEYS[Math.floor(Math.random() * BLEND_KEYS.length)]
    normalizeFrom(key, Math.floor(Math.random() * 101))
    fuzzSteps++
    const t = total()
    if (t !== 100) {
      fuzzBad++
      worst = Math.max(worst, Math.abs(t - 100))
      break
    }
    if (BLEND_KEYS.some((k) => !Number.isInteger(values[k]) || values[k] < 0 || values[k] > 100)) {
      fuzzBad++
      break
    }
  }
}
const fuzzOK = fuzzBad === 0
console.log(`  ${fuzzOK ? '✅' : '❌'} 随机模糊测试 ${fuzzSteps} 步拖拽，总和始终为 100（异常 ${fuzzBad} 次${worst ? '，最大偏差 ' + worst : ''}）`)
if (!fuzzOK) problems.push(`模糊测试 ${fuzzBad} 次破坏总和约束`)

// 浓度分级：纯水 100 应当是「几乎全是水」，纯水 0 应当是香精档
const s0 = strengthOf(blankBlend())
const sFull = strengthOf({ [W]: 0 })
const sMid = strengthOf({ [W]: 82 })
const strengthOK = s0.essence === 0 && s0.name === '几乎全是水' && sFull.essence === 100 && sMid.essence === 18
console.log(`  ${strengthOK ? '✅' : '❌'} 浓度分级：纯水100→${s0.name} / 纯水0→香精 ${sFull.essence}% / 纯水82→香精 ${sMid.essence}%`)
if (!strengthOK) problems.push('浓度分级取值不对')

console.log('')
if (problems.length) {
  console.log(`❌ 问题 ${problems.length} 条：`)
  problems.forEach((p) => console.log('  - ' + p))
  process.exit(1)
}
console.log(`✅ 让位规则 ${caseNo} 个场景 + ${fuzzSteps} 步模糊测试全部通过`)
