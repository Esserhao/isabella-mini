// 交叉校验 .vue：模板里用到的 class 是否都有样式，样式里是否留着没人用的 class。
// 专治「改版删了模板却忘了删样式」和「写了 class 忘了配样式」这两种静默死代码。
//
// 两个方向都只给提醒、不设门禁（exit 0）——实测三类合法情况会误报：
//   ① JS 钩子类名：CoachMask 的 .coach-annot 只用于 createSelectorQuery 量高度，本就不该有样式；
//   ② 纯布局容器：community 的 .menu-text 只包住 .menu-title/.menu-sub，靠继承即可；
//   ③ 全局类：定义写在 App.vue 不带 scoped 的 <style> 里，本页面 <style> 里当然找不到。
//      App.vue 的全局样式会自动并入 defined（见 globalClasses），这条已不再误报。
// 所以这里的输出是「值得看一眼」，不是「必须修」。
//
// 用法：node scripts/audit-selectors.mjs [文件路径...]
// 不带参数时默认查 src/pages 与 src/components 下所有 .vue。
import { readFileSync } from 'fs'
import { globSync } from 'fs'

const DEFAULT_GLOBS = ['src/pages/**/*.vue', 'src/components/**/*.vue']

function files() {
  const args = process.argv.slice(2)
  if (args.length) return args
  let out = []
  for (const g of DEFAULT_GLOBS) {
    try { out = out.concat(globSync(g)) } catch { /* 目录不存在就跳过 */ }
  }
  return out
}

// App.vue 里不带 scoped 的 <style> 是全局样式，所有页面都能用。
// 不并入 defined 的话，凡是提到全局的类（如 .rm-pill）都会在用到的每个页面报「无样式」，
// 那会逼着大家把共享样式在各页重复定义一遍 —— 正好是这份脚本该阻止的事。
let GLOBAL = null
function globalClasses() {
  if (GLOBAL) return GLOBAL
  GLOBAL = new Set()
  try {
    const src = readFileSync('src/App.vue', 'utf8')
    for (const m of src.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)) {
      if (/scoped/.test(m[1])) continue
      const css = m[2].replace(/\/\*[\s\S]*?\*\//g, '')
      for (const c of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) GLOBAL.add(c[1])
    }
  } catch { /* App.vue 不存在就当没有全局样式 */ }
  return GLOBAL
}

function check(file) {
  // App.vue 是全局样式文件，没有 <template> 是正常的，不该报「找不到模板块」
  if (/(^|\/)App\.vue$/.test(file)) return []
  const src = readFileSync(file, 'utf8')
  // 必须贪婪匹配到最后一个 </template>。用非贪婪的 *? 会停在内层
  // <template v-if="..."> 的闭合标签上，只扫到半个模板（表现为一堆假的「孤儿样式」）。
  const tpl = src.match(/<template>([\s\S]*)<\/template>/)
  const sty = src.match(/<style[^>]*>([\s\S]*?)<\/style>/)
  if (!tpl) return [{ file, level: 'problem', msg: '找不到 <template> 块' }]
  if (!sty) return []

  const used = new Set()
  const add = (c) => c && used.add(c)

  // 静态 class="a b"（前面的空白用来排除 :class —— 否则会被当成静态的）
  for (const m of tpl[1].matchAll(/(?:^|\s)class\s*=\s*"([^"]*)"/g)) {
    m[1].split(/\s+/).forEach((c) => !c.includes('{') && add(c))
  }

  // 动态 :class，按语法分支取类名。不能图省事「把所有带引号的串都当类名」——
  // :class="{ active: tab === 'perfumes' }" 里的 'perfumes' 是比较值，不是类名。
  for (const m of tpl[1].matchAll(/:\s*class\s*=\s*"([^"]*)"/g)) {
    const expr = m[1].trim()
    if (expr.startsWith('{')) {
      // 对象语法：只取冒号左边的键（标识符键 或 引号键）
      for (const k of expr.matchAll(/([a-zA-Z_][\w-]*)\s*:/g)) add(k[1])
      for (const k of expr.matchAll(/['"]([^'"]+)['"]\s*:/g)) k[1].split(/\s+/).forEach(add)
    } else {
      // 数组语法 :class="['a','b']" 或三元 :class="x ? 'a' : 'b'"
      for (const q of expr.matchAll(/['"]([^'"]+)['"]/g)) q[1].split(/\s+/).forEach(add)
    }
  }

  // 先剥掉注释再取类名，否则注释里提到的文件名（lab.vue）会被当成 .vue 类
  const css = sty[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '')
  // own = 本文件自己定义的；defined = own + 全局。
  // 两个检查必须用不同的集合：
  //   「无样式」用 defined —— 全局类也算有样式，否则 .rm-pill 会在用到的每个页面报错；
  //   「孤儿」   用 own    —— 全局类只给别的页面用，在本页面没用到不是孤儿，
  //                          否则 App.vue 每加一个全局类，全项目就会多 N 条假孤儿。
  const own = new Set()
  for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) own.add(m[1])
  const defined = new Set([...own, ...globalClasses()])

  const res = []
  for (const c of [...used].sort()) {
    if (!defined.has(c)) {
      res.push({ file, level: 'warn', msg: `无样式：模板用了 .${c} 但 <style> 里没定义（也可能是 JS 钩子或纯布局容器）` })
    }
  }
  for (const c of [...own].sort()) {
    if (!used.has(c)) res.push({ file, level: 'warn', msg: `孤儿样式：.${c} 定义了但模板没用` })
  }
  return res
}

const rows = files().flatMap(check)
for (const r of rows) console.log(`[!] ${r.file} — ${r.msg}`)
console.log(`\n选择器校验：${rows.length} 条提醒，0 个门禁失败（共查 ${files().length} 个文件）`)
console.log('说明：两个方向都是提醒级，见脚本头部注释里的两类已知误报。')
