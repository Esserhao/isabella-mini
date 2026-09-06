// ============================================================
// ai-quote.js —— 封存卡的「AI 评香」：调云函数 aiQuote 生成针对性评论
// 替换封存卡上随机抽的「古先生说」。任何一步失败（未开通云开发 /
// 云函数未部署 / 未配 key / 超时 / 上游抽风）都 resolve(null)——
// 调用方拿到 null 就保持本地台词池原句，封存主流程零依赖、永不卡死。
// ============================================================
import { ACCORDS } from './data.js'

export const AI_QUOTE_TIMEOUT = 3500

// 纯函数（可测）：12 香调对象 → 云函数入参。只带非 0 项，label 由前端传
//（云函数不依赖香料表，加香调也不用同步云函数）。
export function buildAiQuotePayload(accordValues, name = '') {
  const accords = ACCORDS
    .map((a) => ({ label: a.label, pct: Number((accordValues && accordValues[a.key]) || 0) }))
    .filter((x) => x.pct > 0)
  return { accords, name: String(name || '').slice(0, 20) }
}

function settle(resolve, timer, val) {
  clearTimeout(timer)
  resolve(val)
}

/**
 * 取 AI 评香。成功返回评语句（已清洗），任何异常/超时返回 null。
 * @param {Object} accordValues 12 香调比例
 * @param {string} name 香名（可空）
 * @param {number} timeoutMs 等待上限，默认 3.5s
 * @returns {Promise<string|null>}
 */
export function getAiQuote(accordValues, name = '', timeoutMs = AI_QUOTE_TIMEOUT) {
  // #ifdef MP-WEIXIN
  return new Promise((resolve) => {
    if (typeof wx === 'undefined' || !wx.cloud) { resolve(null); return }
    let timer = setTimeout(() => settle(resolve, timer, null), timeoutMs)
    try {
      wx.cloud.callFunction({
        name: 'aiQuote',
        data: buildAiQuotePayload(accordValues, name),
        success: (res) => {
          const r = res && res.result
          // 只认 ok+quote；NO_AI_KEY / GEN_REJECT / 云函数未部署 一律按 null 处理
          if (r && r.ok && r.quote) settle(resolve, timer, r.quote)
          else settle(resolve, timer, null)
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
