// 复刻名香彩蛋的自检。
//
// 为什么需要：这个彩蛋最怕的不是「不触发」，而是「乱触发」。
// 初始化用的就是图鉴第一瓶，重置回默认也是它，从图鉴接力进来时归一化后
// 逐键同样相等——这些全是系统铺好的配比，闸门一旦漏了，
// 用户一进工坊就会看到「恭喜调出」，彩蛋立刻变成笑话。
// 这种问题在代码里看不出来，只能靠脚本把状态机跑一遍。
//
// 关键：这里不复制一份逻辑，而是从 lab.vue 里把状态机的源码抠出来执行。
// 复制的话，以后改了组件这边也测不出来。抠不到就明确报错，绝不静默通过。
//
// 用法：node scripts/audit-egg.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { galleryPerfumes, ACCORDS, SOLVENT, BLEND_KEYS, DAILY_CHALLENGES } from '../src/utils/data.js'
import { findExactMatch, randomAccords, blankBlend, strengthOf, scoreDailyChallenge } from '../src/utils/mix.js'
import { achieveEgg, getEggs, sealLabelOf } from '../src/utils/eggs.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const labSrc = fs.readFileSync(path.join(root, 'src/pages/lab/lab.vue'), 'utf8')

// 抠出「复刻名香彩蛋」整段源码（到下一个分节注释为止）
function extractEggBlock(src) {
  const start = src.indexOf('// ---------- 复刻名香彩蛋 ----------')
  if (start < 0) throw new Error('lab.vue 里找不到「复刻名香彩蛋」分节，标记被改了？')
  const rest = src.slice(start)
  const end = rest.indexOf('\n// 懒人福音')
  if (end < 0) throw new Error('lab.vue 里找不到彩蛋段之后的「懒人福音」分节，标记被改了？')
  return rest.slice(0, end)
}

const block = extractEggBlock(labSrc)

// 组件里的 ref / uni / track 在 Node 下不存在，注入替身。
// eggHit 记下来给断言用；vibrations 数震动次数。
const vibrations = []
const scope = {
  ref: (v) => ({ value: v }),
  uni: { vibrateShort: (o) => { vibrations.push(o && o.type) } },
  track: () => {},
  galleryPerfumes,
  findExactMatch,
  // 彩蛋登记在 Node 里没有 storage，注入恒否替身；eggs.js 本体在文末单测。
  // selfHistoryCache 不注入 —— 块内自带 let 声明，注入会撞名；工厂把它导出后取引用。
  achieveEgg: () => false
}

// 把 const/let 声明变成可导出的返回值，用 new Function 包一层
const factory = new Function(
  ...Object.keys(scope),
  `${block}
   return { eggHit, armEgg, disarmEgg, checkEgg, celebrateEgg, selfHistoryCache }`
)
const egg = factory(...Object.values(scope))
// 「旧作重现」比对源：与 lab.vue 内部共享同一个数组（loadSelfHistory 原地更新它）
const selfHistoryCache = egg.selfHistoryCache

const problems = []
const KEYS = ACCORDS.map((a) => a.key)
let caseNo = 0

// 场景跑法：actions 是一串操作，最后断言「触发了几次震动」和「横幅在不在」
function run(name, actions, expect) {
  caseNo++
  vibrations.length = 0
  egg.disarmEgg()          // 每个场景都从干净状态开始
  egg.eggHit.value = null
  actions.forEach((fn) => fn())

  const hits = vibrations.length
  const shown = !!egg.eggHit.value
  const errs = []
  if (hits !== expect.vibrations) errs.push(`震动 ${hits} 次，期望 ${expect.vibrations} 次`)
  if (shown !== expect.shown) errs.push(`横幅${shown ? '在' : '不在'}，期望${expect.shown ? '在' : '不在'}`)
  const ok = errs.length === 0
  console.log(`  ${ok ? '✅' : '❌'} ${name}`)
  if (!ok) { errs.forEach((e) => console.log(`       ${e}`)); problems.push(`${name}：${errs.join('；')}`) }
}

const vals = (p) => { const o = {}; KEYS.forEach((k) => { o[k] = p.accords[k] | 0 }); return o }
const feed = (p) => () => egg.checkEgg(vals(p))
const feedRandom = () => egg.checkEgg(randomAccords())
const P0 = galleryPerfumes[0]   // 初始化 / 重置用的就是这瓶
const P3 = galleryPerfumes[3]

console.log('========== 复刻名香彩蛋自检 ==========')

run('刚进工坊：初始化铺的是图鉴第一瓶，不该弹',
  [feed(P0)], { vibrations: 0, shown: false })

run('点「重置」回到默认（还是那瓶），不该弹',
  [() => egg.armEgg(), () => egg.disarmEgg(), feed(P0)], { vibrations: 0, shown: false })

run('从图鉴点一瓶接力进工坊，配比逐键相等，不该弹',
  [() => egg.disarmEgg(), feed(P3)], { vibrations: 0, shown: false })

run('用户手调出和某瓶完全一样的配比，该弹',
  [() => egg.armEgg(), feed(P3)], { vibrations: 1, shown: true })

run('弹过之后切雷达模式重算，不该重复弹',
  [() => egg.armEgg(), feed(P3), feed(P3), feed(P3)], { vibrations: 1, shown: true })

run('调离命中再调回来，该再弹一次',
  [() => egg.armEgg(), feed(P3), feedRandom, feed(P3)], { vibrations: 2, shown: true })

run('手调但没调对，不该弹',
  [() => egg.armEgg(), feedRandom, feedRandom], { vibrations: 0, shown: false })

run('横幅展示期间调离，横幅应立刻收起',
  [() => egg.armEgg(), feed(P3), feedRandom], { vibrations: 1, shown: false })

// ---- 旧作重现：命中源换成自己的历史 ----
// 命中配比必须不在图鉴里（checkEgg 图鉴优先，图鉴中了就轮不到旧作分支）
const mine = {}
KEYS.forEach((k) => { mine[k] = 0 })
mine.citrus = 33
mine.vanilla = 67
const SELF = { id: 'self_777', name: '雨夜图书馆', accords: mine, self: true }

run('亲手调出自己历史里的旧作（图鉴没这瓶），该弹',
  [() => { selfHistoryCache.push(SELF) }, () => egg.armEgg(), () => egg.checkEgg(mine)],
  { vibrations: 1, shown: true })

run('刚封存的那瓶已从比对源剔除，不该弹',
  [() => { selfHistoryCache.length = 0 }, () => egg.armEgg(), () => egg.checkEgg(mine)],
  { vibrations: 0, shown: false })

run('旧作经接力还原（系统铺的）不置闸，不该弹',
  [() => { selfHistoryCache.push(SELF) }, () => egg.disarmEgg(), () => egg.checkEgg(mine)],
  { vibrations: 0, shown: false })

// 顺带盯住随机的质量：总和必须恰好 100，且要出得来主调
let sumBad = 0
let weakMain = 0
const N = 20000
for (let i = 0; i < N; i++) {
  const v = randomAccords()
  const s = KEYS.reduce((x, k) => x + v[k], 0)
  if (s !== 100 || KEYS.some((k) => !Number.isInteger(v[k]) || v[k] < 0)) sumBad++
  if (Math.max(...KEYS.map((k) => v[k])) < 20) weakMain++
}
console.log('')
console.log(`  ${sumBad === 0 ? '✅' : '❌'} 随机 ${N} 次，总和恒为 100 且为非负整数（异常 ${sumBad} 次）`)
if (sumBad) problems.push(`随机配比总和异常 ${sumBad} 次`)
// 没有主调的配比（最大项 <20%）属于「十二味各来一点」，允许少量但别成主流
const weakRate = weakMain / N
console.log(`  ${weakRate < 0.1 ? '✅' : '❌'} 随机 ${N} 次，缺乏主调的仅占 ${(weakRate * 100).toFixed(1)}%（阈值 10%）`)
if (weakRate >= 0.1) problems.push(`随机配比缺乏主调占比 ${(weakRate * 100).toFixed(1)}%，随机策略退化了`)

// 随机撞上彩蛋的概率应当极低（本来就是靠手调的彩蛋，撞上了说明随机退化成从图鉴挑）
let randomHit = 0
for (let i = 0; i < 200000; i++) {
  if (findExactMatch(randomAccords(), galleryPerfumes)) randomHit++
}
console.log(`  ${randomHit === 0 ? '✅' : '⚠️ '} 随机 20 万次撞上彩蛋 ${randomHit} 次（设计上应≈0，靠手调触发）`)

// ---- 每日挑战的入场地基线 ----
// 曾经把挑战目标本身铺进滑块（applyRestore({ accords: c.target })），
// 等于把答案抄上去：16 个主题进页面一律 95%，挑战直接送分。
// 现在起点是一杯纯水（12 个香调全 0），起始分必须全部落在最低档 10。
console.log('')
const blank = blankBlend()
const blankSum = BLEND_KEYS.reduce((s, k) => s + blank[k], 0)
const blankOK = blankSum === 100 && blank[SOLVENT.key] === 100 && KEYS.every((k) => blank[k] === 0)
console.log(`  ${blankOK ? '✅' : '❌'} 空白起点：香调全 0、纯水 ${blank[SOLVENT.key]}、总和 ${blankSum}`)
if (!blankOK) problems.push(`空白起点不是一杯纯水：${JSON.stringify(blank)}`)

const startScores = DAILY_CHALLENGES.map((c) => scoreDailyChallenge(blank, { target: c.target }).score)
const notFloor = startScores.filter((s) => s !== 10).length
console.log(`  ${notFloor === 0 ? '✅' : '❌'} ${DAILY_CHALLENGES.length} 个挑战主题，起始分均为最低档 10（越界 ${notFloor} 个）`)
if (notFloor) problems.push(`${notFloor} 个主题一进工坊就不是最低分，答案又被抄进滑块了`)

// 反向兜底：把正解喂进去，必须能拿到接近满分的分数，否则说明重标定把曲线压死了
const perfectScores = DAILY_CHALLENGES.map((c) => scoreDailyChallenge(c.target, { target: c.target }).score)
const lowestPerfect = Math.min(...perfectScores)
console.log(`  ${lowestPerfect >= 90 ? '✅' : '❌'} 正解喂进去最低得 ${lowestPerfect} 分（应 ≥90）`)
if (lowestPerfect < 90) problems.push(`重标定把满分压没了：正解最低只有 ${lowestPerfect} 分`)

// ---- 彩蛋收藏登记（eggs.js）：幂等性 + 状态聚合 ----
// eggs.js 里裸调 uni 读写 storage，这里注入内存替身到全局
globalThis.uni = {
  _s: {},
  getStorageSync(k) { return this._s[k] },
  setStorageSync(k, v) { this._s[k] = v }
}
const firstHit = achieveEgg('replica')
const secondHit = achieveEgg('replica')
const unknownHit = achieveEgg('no_such_egg')
const eggStatus = getEggs()
const eggsOK = firstHit === true && secondHit === false && unknownHit === false &&
  eggStatus.achieved === 1 && eggStatus.total === 8 &&
  eggStatus.list.every((e) => (e.key === 'replica') === (e.time > 0))
console.log(`  ${eggsOK ? '✅' : '❌'} 彩蛋登记：首次 ${firstHit} / 重复 ${secondHit} / 未知 ${unknownHit}，进度 ${eggStatus.achieved}/${eggStatus.total}`)
if (!eggsOK) problems.push('eggs.js 登记或聚合逻辑不对')

// ---- 封存小字优先级（eggs.js sealLabelOf）：留白 > 深夜 > 七日 > 层级 ----
const labelOf = (o) => sealLabelOf({ tierLabel: '已封存', streak: 0, hour: 12, pureWater: false, ...o })
const labelOK =
  labelOf({}) === '已封存' &&
  labelOf({ streak: 7 }) === '七日封存' &&
  labelOf({ hour: 3 }) === '深夜封存' &&
  labelOf({ hour: 3, streak: 7 }) === '深夜封存' &&
  labelOf({ pureWater: true, hour: 3, streak: 7 }) === '留白封存'
console.log(`  ${labelOK ? '✅' : '❌'} 封存小字优先级：层级 < 七日 < 深夜 < 留白`)
if (!labelOK) problems.push('sealLabelOf 优先级不对')

console.log('')
if (problems.length) {
  console.log(`❌ 问题 ${problems.length} 条：`)
  problems.forEach((p) => console.log('  - ' + p))
  process.exit(1)
}
console.log(`✅ 彩蛋闸门 ${caseNo} 个场景全部符合预期`)
