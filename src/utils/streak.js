// 连续调香天数（Streak）—— 工具类产品最强留存钩子
// 记录：每次封存成功后调用 recordSeal()；展示时用 getStreak()

function fmt(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr() {
  return fmt(new Date())
}

// 封存成功时调用：连续天数 +1（今天已记则不变；断档则重置为 1）
export function recordSeal() {
  try {
    const today = todayStr()
    const last = uni.getStorageSync('isabella_last_seal') || ''
    // 老数据可能存成字符串，直接 +1 会拼成 "11" 这类脏值，先过一遍 Number
    const streak = Number(uni.getStorageSync('isabella_streak')) || 0
    if (last === today) return streak
    const y = new Date(Date.now() - 86400000)
    const next = last === fmt(y) ? streak + 1 : 1
    uni.setStorageSync('isabella_last_seal', today)
    uni.setStorageSync('isabella_streak', next)
    return next
  } catch (e) { return 0 }
}

// 读取当前连续天数：今天或昨天调过才算连续，否则归零
export function getStreak() {
  try {
    const last = uni.getStorageSync('isabella_last_seal') || ''
    const streak = Number(uni.getStorageSync('isabella_streak')) || 0
    const today = todayStr()
    const y = fmt(new Date(Date.now() - 86400000))
    if (last === today || last === y) return streak
    return 0
  } catch (e) { return 0 }
}
