// ============================================================
// 功能测试入口：node scripts/func/run.mjs（已挂 npm run audit 尾部、npm run func）
//
// 顺序：先装好 uni/wx 内存替身，再动态 import 各用例文件（静态 import 会被
// 提升到环境就绪之前，wxacode.js 顶层取 wx.getFileSystemManager() 会炸）。
// ============================================================
import { installEnv, getOutcomes } from './helpers.mjs'

installEnv()

await import('./cases-mix.mjs')
await import('./cases-flow.mjs')
await import('./cases-eggs.mjs')
await import('./cases-store.mjs')
await import('./cases-journey.mjs')

const outcomes = getOutcomes()
const bySuite = new Map()
for (const o of outcomes) {
  if (!bySuite.has(o.suite)) bySuite.set(o.suite, [])
  bySuite.get(o.suite).push(o)
}

console.log('========== 功能测试 ==========')
for (const [name, list] of bySuite) {
  console.log(`\n—— ${name} ——`)
  for (const o of list) {
    console.log(`  ${o.ok ? '✅' : '❌'} ${o.name}`)
    if (!o.ok) console.log(`       ${o.error}`)
  }
}

const fails = outcomes.filter((o) => !o.ok)
console.log('')
if (fails.length) {
  console.log(`❌ 功能测试 ${outcomes.length} 条中 ${fails.length} 条失败：`)
  fails.forEach((f) => console.log(`  - [${f.suite}] ${f.name}：${f.error}`))
  process.exitCode = 1
} else {
  console.log(`✅ 功能测试 ${outcomes.length} 条全部通过`)
}
