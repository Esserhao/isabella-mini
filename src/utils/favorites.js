// 收藏：只收「自己调过的配方」（历史配方）。
// 以封存时间戳 time 作为唯一键 —— 同一份配方可以被反复调出来，
// 但每次封存都是一次独立的创作记录，用 time 区分不会误伤。
import { ACCORDS } from './data.js'

const KEY = 'isabella_favorites'
const LIMIT = 100

// 扫码/分享卡没有封存时间，收藏主键用「名字+配方」派生稳定 id——
// 同一瓶香反复收藏只命中同一条，不会随访问次数越攒越多（长周期雷）。
// 键排序后拼接，保证派生结果与键顺序无关。
export function stableFavId(name, accords) {
  const sig = (name || '') + '|' + Object.keys(accords || {})
    .sort()
    .map((k) => k + ':' + (accords[k] || 0))
    .join(',')
  let h = 0
  for (let i = 0; i < sig.length; i++) { h = (h * 31 + sig.charCodeAt(i)) | 0 }
  return h
}

export function getFavorites() {
  try {
    const list = uni.getStorageSync(KEY)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function save(list) {
  try { uni.setStorageSync(KEY, list.slice(0, LIMIT)) } catch (e) { /* 忽略存储异常 */ }
}

export function isFaved(time) {
  if (!time) return false
  return getFavorites().some((f) => f.time === time)
}

// 收藏 / 取消收藏，返回操作后是否处于「已收藏」状态
export function toggleFav(item) {
  if (!item || !item.time) return false
  const list = getFavorites()
  const i = list.findIndex((f) => f.time === item.time)
  if (i >= 0) {
    list.splice(i, 1)
    save(list)
    return false
  }
  list.unshift({
    time: item.time,
    name: item.name || '未命名香氛',
    accords: { ...(item.accords || {}) },
    quote: item.quote || '',
    formula: item.formula || [],
    note: item.note || '',
    origin: item.origin || ''
  })
  save(list)
  return true
}

export function removeFav(time) {
  const list = getFavorites().filter((f) => f.time !== time)
  save(list)
}
