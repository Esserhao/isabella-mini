// 极简埋点（localStorage 实现，无服务器）
// 漏斗：enter_lab → start_blend → seal → save_card → share
// 任意环节数字断崖 = 该处有问题，就是该修的地方

export function track(event) {
  try {
    const key = 'isabella_stats'
    const raw = uni.getStorageSync(key)
    // 存储被写脏时（历史版本存过字符串/数组）继续往上累加会静默失效，
    // 这里只认纯对象，其他一律推平重来。
    const stats = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {}
    stats[event] = (Number(stats[event]) || 0) + 1
    stats._last = Date.now()
    uni.setStorageSync(key, stats)
  } catch (e) { /* 忽略 */ }
}

// 读取漏斗数据（供配方库页展示）
export function getStats() {
  try {
    const raw = uni.getStorageSync('isabella_stats')
    return (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {}
  } catch (e) { return {} }
}
