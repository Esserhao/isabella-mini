// ============================================================
// wxacode.js —— 「这瓶香专属」真小程序码
// 调云函数 getWxacode 生成带配方参数的真码，本地文件缓存，
// 同一配方只生成一次（配额 10 万，但能省则省、也更快）。
// 云开发未开通 / 调用失败时，静默回退到静态通用码，不阻塞主流程。
// ============================================================
import { ACCORDS } from './data.js'

// 兜底码：不再使用静态图，云函数不可用时返回空串，
// 封存卡绘制时跳过小程序码（不阻塞主流程）。
export const FALLBACK_QR = ''

// 把配方编码为 URL 安全的纯数字串（逗号是 URL 合法字符，无需再编码，
// 避免 base64 的 +/= 在 query 解析时被转义出错）
export function encodeAccordParams(accordValues) {
  const src = (accordValues && typeof accordValues === 'object') ? accordValues : {}
  return ACCORDS.map((a) => Number(src[a.key]) || 0).join(',')
}

// 反向解码：扫码落地页 onLoad 收到的 p 参数（"60,0,5,..."）→ 香调比例对象
export function decodeAccordParams(p) {
  const parts = String(p || '').split(',').map(Number)
  const result = {}
  ACCORDS.forEach((a, i) => { result[a.key] = Number.isFinite(parts[i]) ? parts[i] : 0 })
  const sum = Object.values(result).reduce((s, v) => s + v, 0)
  return sum > 0 ? result : null
}

// ---------- 「我也调一瓶」：card → lab 的配方接力 ----------
// lab 是 tabBar 页，switchTab 不支持带参跳转，用 storage 暂存配方，
// lab 页 onShow 时取出并还原（取完即删，避免下次进工坊被旧配方覆盖）。
const RESTORE_KEY = 'isabella_restore_blend'

export function setPendingBlend(accordValues, name) {
  try {
    uni.setStorageSync(RESTORE_KEY, { accords: accordValues, name: name || '', ts: Date.now() })
  } catch (e) { /* 忽略 */ }
}

// 取出并立即删除；超过 10 分钟视为过期作废
export function takePendingBlend() {
  try {
    const d = uni.getStorageSync(RESTORE_KEY)
    uni.removeStorageSync(RESTORE_KEY)
    if (!d || !d.accords) return null
    if (Date.now() - (d.ts || 0) > 10 * 60 * 1000) return null
    const accords = decodeAccordParams(encodeAccordParams(d.accords))
    return accords ? { accords, name: d.name || '' } : null
  } catch (e) {
    return null
  }
}

// 扫码落地页 path：pages/card/card?p=60,0,...&n=香名
// 注意两点：
//   1. getwxacode 的 path 不能以 / 开头
//   2. 不指向 lab 页 —— lab 是 tabBar 页，部分微信版本扫 tabBar 页的码
//      会丢弃 query 参数导致配方还原失败；card 是普通页，参数稳定可达。
export function buildWxacodePath(accordValues, name) {
  const p = encodeAccordParams(accordValues)
  let path = `pages/card/card?p=${p}`
  if (name && name !== '未命名香氛') {
    path += `&n=${encodeURIComponent(name)}`
  }
  // 超长保护（接口上限 1024，实际数字配方 ~60 字符，几乎不会触发）
  if (path.length > 1000) path = `pages/card/card?p=${p}`
  return path
}

// #ifdef MP-WEIXIN
const fs = wx.getFileSystemManager()

// 写 base64 图片到用户目录，返回本地路径；失败返回 ''
function writeBase64Image(base64, fileKey) {
  try {
    const filePath = `${wx.env.USER_DATA_PATH}/${fileKey}.jpg`
    fs.writeFileSync(filePath, base64, 'base64')
    return filePath
  } catch (e) {
    return ''
  }
}

function fileExists(p) {
  try { fs.accessSync(p); return true } catch (e) { return false }
}
// #endif

/**
 * 获取「这瓶香专属」小程序码的本地路径（含缓存）。
 * @param {Object} accordValues 12 香调比例
 * @param {string} name 香名（可空）
 * @returns {Promise<string>} 本地图片路径；任何异常回退 FALLBACK_QR
 */
export function getWxacodePath(accordValues, name = '') {
  // #ifdef MP-WEIXIN
  const key = encodeAccordParams(accordValues)
  const cacheKey = `wxacode:${key}`

  return new Promise((resolve) => {
    // 1) 本地缓存：记的是文件路径，还要确认文件没被系统清理
    try {
      const cached = uni.getStorageSync(cacheKey)
      if (cached && fileExists(cached)) { resolve(cached); return }
    } catch (e) { /* 缓存读取异常走重新生成 */ }

    // 2) 未开通云开发 / wx.cloud 不可用：直接兜底
    if (typeof wx === 'undefined' || !wx.cloud) { resolve(FALLBACK_QR); return }

    // 3) 调云函数生成
    wx.cloud.callFunction({
      name: 'getWxacode',
      data: { path: buildWxacodePath(accordValues, name), width: 430 },
      success: (res) => {
        const r = res && res.result
        if (r && r.ok && r.base64) {
          const filePath = writeBase64Image(r.base64, `wxacode_${key.replace(/,/g, '_')}`)
          if (filePath) {
            try { uni.setStorageSync(cacheKey, filePath) } catch (e) { /* 忽略 */ }
            resolve(filePath)
            return
          }
        }
        resolve(FALLBACK_QR)
      },
      fail: () => resolve(FALLBACK_QR)
    })
  })
  // #endif

  // #ifndef MP-WEIXIN
  return Promise.resolve(FALLBACK_QR)
  // #endif
}
