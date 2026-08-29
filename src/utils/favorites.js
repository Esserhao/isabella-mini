// 收藏：只收「自己调过的配方」（历史配方）。
// 以封存时间戳 time 作为唯一键 —— 同一份配方可以被反复调出来，
// 但每次封存都是一次独立的创作记录，用 time 区分不会误伤。
const KEY = 'isabella_favorites'
const LIMIT = 100

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
    note: item.note || ''
  })
  save(list)
  return true
}

export function removeFav(time) {
  const list = getFavorites().filter((f) => f.time !== time)
  save(list)
}
