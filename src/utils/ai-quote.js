// ============================================================
// ai-quote.js —— 封存卡的「AI 评香」：调云函数 aiQuote 生成针对性评论
// 替换封存卡上随机抽的「古先生说」。任何一步失败（未开通云开发 /
// 云函数未部署 / 未配 key / 超时 / 上游抽风）都 resolve(null)——
// 调用方拿到 null 就保持本地台词池原句，封存主流程零依赖、永不卡死。
//
// 体验红线：封存是即时动作，AI 不能让它变慢。
//   ① 超时 2.5s（宁可回退本地 120 句，也不让用户干等）；
//   ② 同配方+同香名的评论只调一次 AI，本地 LRU 缓存——重封/收藏重开秒出。
// ============================================================
import { ACCORDS } from './data.js'

export const AI_QUOTE_TIMEOUT = 2500
const AI_CACHE_KEY = 'isabella_ai_quote_cache'
const AI_CACHE_CAP = 30

// 纯函数（可测）：12 香调对象 → 云函数入参。只带非 0 项，label 由前端传
//（云函数不依赖香料表，加香调也不用同步云函数）。
export function buildAiQuotePayload(accordValues, name = '') {
  const accords = ACCORDS
    .map((a) => ({ label: a.label, pct: Number((accordValues && accordValues[a.key]) || 0) }))
    .filter((x) => x.pct > 0)
  return { accords, name: String(name || '').slice(0, 20) }
}

// 纯函数（可测）：缓存签名。与 wxacode 的配方串同格式（12 味逗号序 + 香名），
// 同名同配方的评论只生成一次；改名会换签名重新生成（旧码名不匹配新句）。
export function buildAiQuoteSig(accordValues, name = '') {
  const v = accordValues || {}
  const nums = ACCORDS.map((a) => Number(v[a.key]) || 0).join(',')
  return `${nums}|${String(name || '')}`
}

// 纯函数（可测）：LRU 淘汰。缓存形如 { sig: { q, t } }，超 cap 删最旧 t。
export function trimAiQuoteCache(cache, cap = AI_CACHE_CAP) {
  const c = cache && typeof cache === 'object' ? cache : {}
  const keys = Object.keys(c)
  if (keys.length <= cap) return c
  const sorted = keys
    .map((k) => ({ k, t: (c[k] && c[k].t) || 0 }))
    .sort((a, b) => b.t - a.t)
    .slice(0, cap)
  const out = {}
  sorted.forEach((x) => { out[x.k] = c[x.k] })
  return out
}

function readCachedQuote(sig) {
  try {
    const d = uni.getStorageSync(AI_CACHE_KEY)
    if (d && d[sig] && d[sig].q) return d[sig].q
  } catch (e) { /* 缓存读失败走重新生成 */ }
  return null
}

function writeCachedQuote(sig, quote) {
  try {
    let d = uni.getStorageSync(AI_CACHE_KEY)
    if (!d || typeof d !== 'object') d = {}
    d[sig] = { q: quote, t: Date.now() }
    uni.setStorageSync(AI_CACHE_KEY, trimAiQuoteCache(d))
  } catch (e) { /* 写缓存失败不影响主流程 */ }
}

function settle(resolve, timer, val) {
  clearTimeout(timer)
  resolve(val)
}

/**
 * 取 AI 评香。成功返回评语句（已清洗，且本地有缓存），任何异常/超时返回 null。
 * @param {Object} accordValues 12 香调比例
 * @param {string} name 香名（可空）
 * @param {number} timeoutMs 等待上限，默认 2.5s
 * @returns {Promise<string|null>}
 */
export function getAiQuote(accordValues, name = '', timeoutMs = AI_QUOTE_TIMEOUT) {
  // #ifdef MP-WEIXIN
  const sig = buildAiQuoteSig(accordValues, name)
  return new Promise((resolve) => {
    if (typeof wx === 'undefined' || !wx.cloud) { resolve(null); return }
    // 缓存命中：同一瓶重封/收藏重开不再等 AI（首次之外都走这里，几乎零延迟）
    const cached = readCachedQuote(sig)
    if (cached) { resolve(cached); return }
    let timer = setTimeout(() => settle(resolve, timer, null), timeoutMs)
    try {
      wx.cloud.callFunction({
        name: 'aiQuote',
        data: buildAiQuotePayload(accordValues, name),
        success: (res) => {
          const r = res && res.result
          // 只认 ok+quote；NO_AI_KEY / GEN_REJECT / 云函数未部署 一律按 null 处理
          if (r && r.ok && r.quote) {
            writeCachedQuote(sig, r.quote)
            settle(resolve, timer, r.quote)
          } else {
            settle(resolve, timer, null)
          }
        },
        fail: () => settle(resolve, timer, null)
      })
    } catch (e) {
      settle(resolve, timer, null)
    }
  })
  // #endif

  // #ifndef MP-WEIXIN
  return Promise.resolve(null)
  // #endif
}
