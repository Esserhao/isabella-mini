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
  // 返回成败：存储写失败时调用方必须知道，否则会出现「界面已收藏、
  // 下次进来却消失」的假成功（真机存储满/异常时真实存在）。
  try { uni.setStorageSync(KEY, list.slice(0, LIMIT)); return true } catch (e) { return false }
}

// 真实封存时间戳（毫秒级，> 1e12 即 2001 年之后）才会被当日期展示；
// 扫码/分享卡的收藏主键是 stableFavId 的 32 位哈希（±21 亿），不是日期，
// 拿去 new Date() 会得到 1970 或 NaN。列表/卡页展示前都用这个闸过滤。
export function isSealedTime(time) {
  return typeof time === 'number' && time > 1e12
}

export function isFaved(time) {
  if (!time) return false
  return getFavorites().some((f) => f.time === time)
}

// 收藏 / 取消收藏。返回 true=已收藏 / false=已取消 / null=存储写失败（状态不变，
// 调用方据此提示重试，不能假成功）
export function toggleFav(item) {
  // 非法入参返回 null（=未生效）：契约里 false 是「已取消收藏」成功态，
  // 返回 false 会让调用方误报「已取消收藏」
  if (!item || !item.time) return null
  const list = getFavorites()
  const i = list.findIndex((f) => f.time === item.time)
  if (i >= 0) {
    const next = list.slice()
    next.splice(i, 1)
    if (!save(next)) return null
    return false
  }
  const entry = {
    time: item.time,
    name: item.name || '未命名香氛',
    accords: { ...(item.accords || {}) },
    quote: item.quote || '',
    formula: item.formula || [],
    pyramid: item.pyramid || null, // 三调随条目存，收藏卡能画前中后调
    note: item.note || '',
    origin: item.origin || '',
    radarMode: item.radarMode || ''
  }
  const next = [entry, ...list]
  if (!save(next)) return null
  return true
}

export function removeFav(time) {
  const list = getFavorites().filter((f) => f.time !== time)
  // 返回写入成败：写失败时调用方必须知道，否则列表没变却弹「已删除」、
  // 撤销栏还会在假状态下出现（撤销会反向走一次真删除流程）
  return save(list)
}
