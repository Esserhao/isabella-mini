// ============================================================
// 阶梯递进（Stair-Stepping）—— 解决「调第 1 瓶和调第 10 瓶体验完全一样」
//
// 原理：多巴胺系统对相同刺激会耐受。第 3 瓶开始，用户感觉在「下降」，
// 即使客观上没变。所以每一层必须比上一层大一点。
//
// 约束：不新增功能、不新增素材、零后端。只是把已有的文案 / 印章 / 称号
// 按封存总数分层放出 —— 用约束换递进感（创意省钱）。
// ============================================================

const KEY_SEAL_COUNT = 'isabella_seal_count'

// 层级表。thresh = 达到该层所需的累计封存数
// stampScale / stampRotate：印章视觉随层级变化（程序化绘制，不换素材）
// voice：古先生说话的层次 —— 从点评配方，逐步变成点评「你这个人」
const TIERS = [
  {
    thresh: 0, key: 'novice', title: '初次来访',
    stampScale: 3.0, stampRotate: -18, sealLabel: '已封存',
    voice: 'formula',
    unlock: ''
  },
  {
    thresh: 3, key: 'apprentice', title: '学徒调香师',
    stampScale: 3.2, stampRotate: -14, sealLabel: '学徒封存',
    voice: 'formula',
    unlock: '第 3 瓶：卡上的印章换了个角度 —— 我开始正经对待你的东西了。'
  },
  {
    thresh: 5, key: 'reader', title: '被读懂的人',
    stampScale: 3.4, stampRotate: -10, sealLabel: '亲启封存',
    voice: 'person',
    unlock: '第 5 瓶：我不再只评你的配方了。从这瓶起，我说的是你。'
  },
  {
    thresh: 10, key: 'signature', title: '有签名的人',
    stampScale: 3.6, stampRotate: -6, sealLabel: '签名封存',
    voice: 'person',
    unlock: '第 10 瓶：你有气味签名了。这个称号只给调满十瓶的人。'
  },
  {
    thresh: 20, key: 'perfumer', title: '同行',
    stampScale: 3.8, stampRotate: -3, sealLabel: '同行封存',
    voice: 'peer',
    unlock: '第 20 瓶：我不当你是客人了。你是同行。'
  }
]

export function getSealCount() {
  try {
    const n = Number(uni.getStorageSync(KEY_SEAL_COUNT))
    if (n > 0) return n
    // 兼容老用户：没有计数器时用历史条数兜底（历史只留 50 条，会低估，但不会归零）
    const list = uni.getStorageSync('isabella_history')
    return Array.isArray(list) ? list.length : 0
  } catch (e) {
    return 0
  }
}

// 封存时调用，返回 { count, tier, leveledUp, unlock }
export function bumpSealCount() {
  const before = getSealCount()
  const count = before + 1
  try { uni.setStorageSync(KEY_SEAL_COUNT, count) } catch (e) { /* 忽略存储异常 */ }
  const tBefore = tierOf(before)
  const tier = tierOf(count)
  const leveledUp = tier.key !== tBefore.key
  return { count, tier, leveledUp, unlock: leveledUp ? tier.unlock : '' }
}

export function tierOf(count) {
  let t = TIERS[0]
  for (let i = 0; i < TIERS.length; i++) {
    if (count >= TIERS[i].thresh) t = TIERS[i]
  }
  return t
}

export function currentTier() {
  return tierOf(getSealCount())
}

// 下一层还差几瓶（用于「我的」页显示进度，给用户一个继续的理由）
export function nextTierGap(count) {
  const n = typeof count === 'number' ? count : getSealCount()
  const next = TIERS.find((t) => t.thresh > n)
  if (!next) return null
  return { need: next.thresh - n, title: next.title, thresh: next.thresh }
}

export function allTiers() {
  return TIERS.map((t) => ({ thresh: t.thresh, key: t.key, title: t.title }))
}
