// ============================================================
// 档案行囊：把散在各 storage 键里的调香记忆打包成一段可复制的文本，
// 换机/清缓存后粘贴回来，智能合并恢复。纯本地，无服务器。
//
// 导出范围（只收「永久记忆」，教程标记/当日挑战等临时键不带走）：
//   isabella_history   调香日记（封存记录，本机只留 50 条）
//   isabella_favorites 收藏（time 为唯一键，本机只留 100 条）
//   isabella_eggs      彩蛋达成（key → 首次达成时间戳）
//   isabella_seen      图鉴翻阅记录（卷末余香进度）
//   isabella_streak / isabella_last_seal   连续封存天数（成对处理）
//   isabella_seal_count 累计封存瓶数（百瓶记/阶梯称号）
//   isabella_stats     埋点漏斗计数
//
// 文本格式（当前 ISABELLA2）：单行 `ISABELLA2|<校验码>|<压缩串>`。
//   单行是为了「全选复制」零遗漏。压缩分两层：
//   1) 数据瘦身——键名缩短、accords 只存非 0 项（`香调序号:占比`）、
//      formula 不带走（它由 accords 经 generateFormula 现算得出，导入时重建）；
//   2) lz-string 压缩 + base64——满仓档案（50 调香史+100 收藏）实测
//      44,485 字 → 约 6,500 字，微信输入框一屏能看全。
//   校验码（djb2·base36）挂在压缩串上：先验后解，粘贴不完整/被改动
//   直接拒收，绝不写脏本机数据。旧版 ISABELLA1（纯 JSON）保留兼容导入。
// ============================================================
import { galleryPerfumes, ACCORDS, notesData } from './data.js'
import { generateFormula } from './mix.js'
import LZString from 'lz-string'

// 兼容不同打包/运行时对 CJS 默认导出的处理：两种形态都兜住
const LZ = LZString && LZString.compressToBase64 ? LZString : LZString.default

const MARK = 'ISABELLA2'      // 当前格式：瘦身 JSON → lz-string 压缩 → base64
const MARK_V1 = 'ISABELLA1'   // 旧格式（纯 JSON），保留兼容导入

const ACCORD_KEYS = ACCORDS.map((a) => a.key)

// 各类内容总数（与 seen.js 同源算法：数据源长度即封顶）
const SEEN_CAPS = {
    perfume: galleryPerfumes.length,
    accord: ACCORDS.length,
    note: notesData.length
}

const HISTORY_CAP = 50
const FAV_CAP = 100

function readRaw(key) {
    try {
        const v = uni.getStorageSync(key)
        if (v === '' || v === null || v === undefined) return null
        return v
    } catch (e) { return null }
}

// ---------- 导出 ----------

// 收集本机全部永久记忆。空集合不放进去，档案尽量短。
export function collectArchive() {
    const d = {}
    const history = readRaw('isabella_history')
    if (Array.isArray(history) && history.length) d.h = history
    const favs = readRaw('isabella_favorites')
    if (Array.isArray(favs) && favs.length) d.f = favs
    const eggs = readRaw('isabella_eggs')
    if (eggs && typeof eggs === 'object' && !Array.isArray(eggs) && Object.keys(eggs).length) d.e = eggs
    const seen = readRaw('isabella_seen')
    if (seen && typeof seen === 'object' && !Array.isArray(seen) && Object.keys(seen).length) d.s = seen
    const streak = Number(readRaw('isabella_streak'))
    const lastSeal = readRaw('isabella_last_seal')
    const sealCount = Number(readRaw('isabella_seal_count'))
    const stats = readRaw('isabella_stats')
    const k = {}
    if (streak > 0) k.streak = streak
    if (typeof lastSeal === 'string' && lastSeal) k.lastSeal = lastSeal
    if (sealCount > 0) k.sealCount = sealCount
    if (stats && typeof stats === 'object' && !Array.isArray(stats) && Object.keys(stats).length) k.stats = stats
    if (Object.keys(k).length) d.k = k
    return { v: 1, t: Date.now(), d }
}

// djb2 校验码，base36 输出定长 7 位
function hashOf(str) {
    let h = 5381
    for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0
    return h.toString(36).padStart(7, '0')
}

// ---------- 瘦身（wire 上只带不可再生成的数据） ----------

// 每条记录压成 { t, n, a, q, o, m }：
//   t=time n=香名 q=台词 o=出处 m=感言（空的不带）
//   a=配比，只存非 0 项，`香调序号:占比` 逗号相连（序号按 data.js ACCORDS 顺序）
//   formula 刻意不带走：它是 accords 的纯函数，导入时用当前香料库现算
function packEntry(e) {
    if (!e || typeof e.time !== 'number' || !isFinite(e.time)) return null
    const a = []
    if (e.accords && typeof e.accords === 'object') {
        ACCORD_KEYS.forEach((k, i) => {
            const v = Number(e.accords[k])
            if (Number.isFinite(v) && v > 0) a.push(i + ':' + Math.round(v))
        })
    }
    const o = { t: Math.round(e.time), n: String(e.name || '') }
    if (a.length) o.a = a.join(',')
    if (e.quote) o.q = String(e.quote)
    if (e.origin) o.o = String(e.origin)
    if (e.note) o.m = String(e.note)
    return o
}

// 瘦身记录还原成完整记录。配比重建为全 12 香调对象（0 补齐），
// formula 由 accords 现算——香料库若日后扩充，导入即得当前版本配方。
function unpackEntry(p) {
    if (!p || typeof p.t !== 'number' || !isFinite(p.t)) return null
    const accords = {}
    if (typeof p.a === 'string' && p.a) {
        ACCORD_KEYS.forEach((k) => { accords[k] = 0 })
        p.a.split(',').forEach((seg) => {
            const m = seg.match(/^(\d{1,2}):(\d{1,3})$/)
            if (!m) return
            const i = Number(m[1])
            if (i < 0 || i >= ACCORD_KEYS.length) return
            accords[ACCORD_KEYS[i]] = Number(m[2])
        })
    }
    const e = { time: p.t, name: p.n || '', accords, formula: generateFormula(accords) }
    if (p.q) e.quote = p.q
    if (p.o) e.origin = p.o
    if (p.m) e.note = p.m
    return e
}

function packArchive(archive) {
    const d = archive.d || {}
    const out = { v: 1, t: archive.t, d: {} }
    if (Array.isArray(d.h)) out.d.h = d.h.map(packEntry).filter(Boolean)
    if (Array.isArray(d.f)) out.d.f = d.f.map(packEntry).filter(Boolean)
    if (d.e) out.d.e = d.e
    if (d.s) out.d.s = d.s
    if (d.k) out.d.k = d.k
    return out
}

function unpackArchive(slim) {
    const d = slim.d || {}
    const out = { v: 1, t: slim.t, d: {} }
    if (Array.isArray(d.h)) out.d.h = d.h.map(unpackEntry).filter(Boolean)
    if (Array.isArray(d.f)) out.d.f = d.f.map(unpackEntry).filter(Boolean)
    if (d.e && typeof d.e === 'object' && !Array.isArray(d.e)) out.d.e = d.e
    if (d.s && typeof d.s === 'object' && !Array.isArray(d.s)) out.d.s = d.s
    if (d.k && typeof d.k === 'object' && !Array.isArray(d.k)) out.d.k = d.k
    return out
}

// ---------- 序列化 / 解析 ----------

// 档案对象 → 可复制文本。瘦身后压缩，校验码挂在压缩串上。
export function serializeArchive(archive) {
    if (!archive || archive.v !== 1) return ''
    let compressed = ''
    try { compressed = LZ.compressToBase64(JSON.stringify(packArchive(archive))) } catch (e) { return '' }
    if (!compressed) return ''
    return MARK + '|' + hashOf(compressed) + '|' + compressed
}

// ---------- 解析 ----------

// 文本 → 档案对象。任何一步不对都返回 { ok:false, error }，绝不半途写库。
// 先认新格式 ISABELLA2，再认旧格式 ISABELLA1（早期导出的纯 JSON 档案）。
export function parseArchive(text) {
    const raw = String(text || '').trim()
    if (!raw) return { ok: false, error: '还没有粘贴档案文本' }
    let m = raw.match(new RegExp('^' + MARK + '\\|([0-9A-Za-z+/=]+)\\|(.+)$'))
    if (m) {
        if (hashOf(m[2]) !== m[1]) return { ok: false, error: '档案不完整或被改动过（校验码对不上）' }
        let json = null
        try { json = LZ.decompressFromBase64(m[2]) } catch (e) { json = null }
        if (!json) return { ok: false, error: '档案内容解析失败' }
        let slim
        try { slim = JSON.parse(json) } catch (e) { return { ok: false, error: '档案内容解析失败' } }
        if (!slim || slim.v !== 1 || !slim.d || typeof slim.d !== 'object') {
            return { ok: false, error: '档案版本对不上，请更新小程序后再试' }
        }
        return { ok: true, archive: unpackArchive(slim) }
    }
    m = raw.match(new RegExp('^' + MARK_V1 + '\\|([0-9a-z]+)\\|(.+)$'))
    if (m) {
        if (hashOf(m[2]) !== m[1]) return { ok: false, error: '档案不完整或被改动过（校验码对不上）' }
        let archive
        try { archive = JSON.parse(m[2]) } catch (e) { return { ok: false, error: '档案内容解析失败' } }
        if (!archive || archive.v !== 1 || !archive.d || typeof archive.d !== 'object') {
            return { ok: false, error: '档案版本对不上，请更新小程序后再试' }
        }
        return { ok: true, archive }
    }
    return { ok: false, error: '没认出这是本店的档案，检查一下是否复制完整' }
}

// ---------- 合并预览 ----------

function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0 }

// 档案内容概要（导入前弹窗 / 页面提示共用）
export function describeArchive(archive) {
    const d = (archive && archive.d) || {}
    return {
        history: Array.isArray(d.h) ? d.h.length : 0,
        favorites: Array.isArray(d.f) ? d.f.length : 0,
        eggs: (d.e && typeof d.e === 'object') ? Object.keys(d.e).length : 0,
        seen: (d.s && typeof d.s === 'object')
            ? Object.keys(SEEN_CAPS).reduce((s, k) => s + (Array.isArray(d.s[k]) ? d.s[k].length : 0), 0)
            : 0,
        sealCount: num(d.k && d.k.sealCount),
        streak: num(d.k && d.k.streak)
    }
}

// ---------- 智能合并 ----------

function validTime(x) { return x && typeof x === 'object' && typeof x.time === 'number' && isFinite(x.time) }

// 按 time 去重并集，新的在前；入口记录以本机为准（导出后可能又改过感言）
function mergeByTime(localList, remoteList, cap) {
    const out = Array.isArray(localList) ? localList.filter(validTime) : []
    const seen = new Set(out.map((x) => x.time))
    let added = 0
    ;(Array.isArray(remoteList) ? remoteList : []).forEach((x) => {
        if (!validTime(x) || seen.has(x.time)) return
        out.push(x)
        seen.add(x.time)
        added++
    })
    out.sort((a, b) => b.time - a.time)
    return { list: out.slice(0, cap), added }
}

export function mergeArchive(archive) {
    if (!archive || archive.v !== 1) return { ok: false }
    const d = archive.d || {}
    const sum = { history: 0, favorites: 0, eggs: 0, seen: 0, streak: false, sealCount: false, stats: 0 }

    // 调香日记 / 收藏：time 去重并集
    try {
        const h = mergeByTime(readRaw('isabella_history'), d.h, HISTORY_CAP)
        if (h.list.length) uni.setStorageSync('isabella_history', h.list)
        sum.history = h.added
    } catch (e) { /* 忽略 */ }
    try {
        const f = mergeByTime(readRaw('isabella_favorites'), d.f, FAV_CAP)
        if (f.list.length) uni.setStorageSync('isabella_favorites', f.list)
        sum.favorites = f.added
    } catch (e) { /* 忽略 */ }

    // 彩蛋：同 key 取最早达成时间（与 achieveEgg 的「只记第一次」语义一致）
    try {
        if (d.e && typeof d.e === 'object' && !Array.isArray(d.e)) {
            const local = readRaw('isabella_eggs')
            const rec = (local && typeof local === 'object' && !Array.isArray(local)) ? local : {}
            Object.keys(d.e).forEach((key) => {
                const t = num(d.e[key])
                if (!t) return
                if (!rec[key] || (num(rec[key]) > t)) {
                    rec[key] = t
                    sum.eggs++
                }
            })
            if (sum.eggs) uni.setStorageSync('isabella_eggs', rec)
        }
    } catch (e) { /* 忽略 */ }

    // 翻阅记录：逐类并集，按各自总数封顶
    try {
        if (d.s && typeof d.s === 'object' && !Array.isArray(d.s)) {
            const local = readRaw('isabella_seen')
            const rec = (local && typeof local === 'object' && !Array.isArray(local)) ? local : {}
            Object.keys(SEEN_CAPS).forEach((kind) => {
                const arr = Array.isArray(rec[kind]) ? rec[kind].slice() : []
                const set = new Set(arr)
                ;(Array.isArray(d.s[kind]) ? d.s[kind] : []).forEach((id) => {
                    const s = String(id)
                    if (!s || set.has(s)) return
                    if (arr.length >= SEEN_CAPS[kind]) return
                    arr.push(s)
                    set.add(s)
                    sum.seen++
                })
                if (arr.length) rec[kind] = arr
            })
            if (sum.seen) uni.setStorageSync('isabella_seen', rec)
        }
    } catch (e) { /* 忽略 */ }

    // 连续天数 + 最后封存日：成对取大（天数相等时保留本机，避免日期来回跳）
    try {
        const k = d.k || {}
        const localStreak = num(readRaw('isabella_streak'))
        const remoteStreak = num(k.streak)
        if (remoteStreak > localStreak && typeof k.lastSeal === 'string' && k.lastSeal) {
            uni.setStorageSync('isabella_streak', remoteStreak)
            uni.setStorageSync('isabella_last_seal', k.lastSeal)
            sum.streak = true
        }
        const localCount = num(readRaw('isabella_seal_count'))
        if (num(k.sealCount) > localCount) {
            uni.setStorageSync('isabella_seal_count', num(k.sealCount))
            sum.sealCount = true
        }
        // 埋点：逐事件取大（计数不回退）
        if (k.stats && typeof k.stats === 'object' && !Array.isArray(k.stats)) {
            const local = readRaw('isabella_stats')
            const rec = (local && typeof local === 'object' && !Array.isArray(local)) ? local : {}
            Object.keys(k.stats).forEach((ev) => {
                if (ev === '_last') {
                    if (num(k.stats._last) > num(rec._last)) rec._last = k.stats._last
                    return
                }
                const rv = num(k.stats[ev])
                const lv = num(rec[ev])
                if (rv > lv) { rec[ev] = rv; sum.stats++ }
            })
            uni.setStorageSync('isabella_stats', rec)
        }
    } catch (e) { /* 忽略 */ }

    return { ok: true, sum }
}
