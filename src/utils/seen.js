// ============================================================
// 图鉴「翻阅」记录：香水 / 香调 / 手记三类内容，打开过详情就记一笔。
// 三类都翻过 → 点亮彩蛋「卷末余香」。
//
// 为什么单开一个模块：这枚彩蛋不在工坊触发（工坊那批都挂在 lab.vue 的
// sealEgg / checkEgg 上），触发点散在图鉴四个打开详情的入口里。
// 记录逻辑收在这里，图鉴页只管调 markSeen，不自己拼 storage。
//
// 存储：单键 isabella_seen（沿用 isabella_ 前缀公约，老用户升级不丢）。
// 结构 { perfume: [id], accord: [key], note: [title] } —— 存数组不存 Set，
// storage 只吃可序列化值。
//
// 依赖方向：seen.js → eggs.js（单向）。eggs.js 不许反过来 import 本模块，
// 否则成环；彩蛋页要进度就自己 import 两边再拼。
// ============================================================
import { achieveEgg } from './eggs.js'
import { galleryPerfumes, ACCORDS, notesData } from './data.js'

const KEY = 'isabella_seen'

// 本模块点亮的彩蛋 key
export const SEEN_EGG = 'read_all'

// 参与统计的三类内容。总数直接从数据源算：图鉴加内容不用改这里。
// 香料（INGREDIENT_LIBRARY，104 种）刻意不计入 —— 那是工具书条目，
// 逐条点开只是机械打卡，与其他彩蛋「靠亲手行为、有巧思」的调性不符。
const KINDS = {
    perfume: galleryPerfumes.length,
    accord: ACCORDS.length,
    note: notesData.length
}

export const SEEN_TOTAL = Object.keys(KINDS).reduce((s, k) => s + KINDS[k], 0)

function readAll() {
    try {
        const raw = uni.getStorageSync(KEY)
        return (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {}
    } catch (e) {
        return {}
    }
}

function writeAll(obj) {
    // 返回成败：写失败时 markSeen 不假成功（记录态本来就是局部重建，下次重读重记，
    // 幂等无损），避免「彩蛋进度白攒」
    try { uni.setStorageSync(KEY, obj); return true } catch (e) { return false }
}

// 已翻开的总项数。每类都按各自总数封顶 —— 数据源删条目后
// 老用户记录里的孤儿 id 不会把 count 顶到超过 total。
export function getSeenCount() {
    const rec = readAll()
    let n = 0
    Object.keys(KINDS).forEach((k) => {
        const arr = rec[k]
        if (Array.isArray(arr)) n += Math.min(arr.length, KINDS[k])
    })
    return Math.min(n, SEEN_TOTAL)
}

// 彩蛋页显示进度用
export function getSeenProgress() {
    return { count: getSeenCount(), total: SEEN_TOTAL }
}

// 记一笔。幂等：同一项重复打开不重复计数。
// 返回值 true = 这一笔刚好凑齐且是首次点亮（调用方据此弹提示）；
// 其余情况（重复打开 / 未凑齐 / 彩蛋早已点亮）一律 false。
export function markSeen(kind, id) {
    if (!Object.prototype.hasOwnProperty.call(KINDS, kind)) return false
    const key = String(id)
    if (!key || key === 'undefined' || key === 'null') return false

    const rec = readAll()
    const arr = Array.isArray(rec[kind]) ? rec[kind].slice() : []
    if (arr.indexOf(key) >= 0) return false
    arr.push(key)
    rec[kind] = arr
    // 存储写失败：这笔不算数，也不返回点亮信号（下次翻开会重新记）
    if (!writeAll(rec)) return false

    return getSeenCount() >= SEEN_TOTAL ? achieveEgg(SEEN_EGG) : false
}
