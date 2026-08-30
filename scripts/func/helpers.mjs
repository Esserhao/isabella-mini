// ============================================================
// 功能测试脚手架（可复用）。
//
// 与 scripts/audit-*.mjs 的分工：
//   audit 系列守「不变量 + 抠组件源码跑状态机」，本目录守「模块级功能行为」：
//   挑战评分、配方接力、彩蛋登记、收藏/连签/阶梯、审查……
//   新增功能测试三步：
//     1) 在对应 cases-*.mjs 的 suite 里加一个 test
//     2) 需要新的被测模块就直接 import —— src 的 utils 都是零 DOM 依赖的纯模块
//     3) node scripts/func/run.mjs 一键跑（已挂在 npm run audit 尾部）
//
// 两个前提：
//   - src 模块裸调 uni.*，Node 下没有 —— installEnv() 预先注入内存替身；
//   - wxacode.js 没有条件编译，Node 里顶层就取 wx.getFileSystemManager()，
//     所以 wx 也要有替身，import 它才不会炸。
// ============================================================

// —— 内存存储（uni / wx 共用一个 store）——
const store = Object.create(null)

export function installEnv(seed = {}) {
  globalThis.uni = {
    getStorageSync: (k) => (k in store ? store[k] : ''),
    setStorageSync: (k, v) => { store[k] = v },
    removeStorageSync: (k) => { delete store[k] },
    // 页面级 API 用不到，放着防止将来 cases 误引页面模块时莫名崩
    showToast: () => {},
    showModal: () => {},
    vibrateShort: () => {},
    navigateTo: () => {},
    switchTab: () => {}
  }
  globalThis.wx = {
    env: { USER_DATA_PATH: '/mock-user-data' },
    getFileSystemManager: () => ({
      writeFileSync() {},
      accessSync() { throw new Error('mock fs: no file') }
    })
  }
  Object.assign(store, seed)
  return store
}

export function clearStore() {
  for (const k of Object.keys(store)) delete store[k]
}
// 直查/直改底层存储（绕过 uni 包装），预置脏数据、改时间戳用。
// peek 对齐 uni.getStorageSync 的语义：缺失键返回 ''，保证断言读到的
// 就是应用真实会读到的值。
export function peek(k) { return (k in store ? store[k] : '') }
export function poke(k, v) { store[k] = v }

// —— 断言（失败即抛，由 test 捕获记为失败）——
const fmt = (v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v))
export function expect(got) {
  return {
    toBe(want) { if (got !== want) throw new Error(`${fmt(got)} 应为 ${fmt(want)}`) },
    toEqual(want) { if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${fmt(got)} 应为 ${fmt(want)}`) },
    toBeTruthy() { if (!got) throw new Error(`${fmt(got)} 应为真值`) },
    toBeGreaterThan(n) { if (!(got > n)) throw new Error(`${fmt(got)} 应大于 ${n}`) },
    toBeAtLeast(n) { if (!(got >= n)) throw new Error(`${fmt(got)} 应 ≥ ${n}`) },
    toHaveLength(n) {
      if (!got || got.length !== n) throw new Error(`长度应为 ${n}，实际 ${got ? got.length : 'undefined'}`)
    }
  }
}

// —— 套件与用例 ——
const outcomes = [] // { suite, name, ok, error }
let currentSuite = ''

export function suite(name, fn) {
  currentSuite = name
  fn()
  currentSuite = ''
}

// 每条用例跑前清空存储：用例之间互不串味；需要预置状态就在用例内自己写。
// 仅支持同步用例 —— 现有被测模块除 promise 化的出码外全是同步函数。
export function test(name, fn) {
  clearStore()
  try {
    fn()
    outcomes.push({ suite: currentSuite, name, ok: true })
  } catch (e) {
    outcomes.push({ suite: currentSuite, name, ok: false, error: e.message })
  }
}

export function getOutcomes() {
  return outcomes
}

// —— 日期工具（与 streak.js 的 fmt 同款，本地时区）——
export function dateStr(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
