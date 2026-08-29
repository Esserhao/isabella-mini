// ============================================================
// 内容审查：用户输入（调香感言 / 留言建议）提交前的安全检查
//
// 两层防线：
//   1. 本地敏感词粗筛（离线、零延迟）—— 拦掉最明显的脏话/违规词
//   2. 微信官方 msgSecCheck（云函数 submitFeedback 内调用）—— 权威判定
//
// 设计原则：
//   - 本地词表只做「粗筛」，不求全 —— 误杀比漏放更伤体验，
//     拿不准的交给云端官方接口兜底
//   - 云端不可用（未部署云函数/未开云开发）时降级为仅本地检查，
//     不阻塞用户提交，但会在控制台留痕
// ============================================================

// 本地敏感词粗筛表（仅列最典型项，正式审查以微信 msgSecCheck 为准）
// 覆盖：脏话辱骂、色情、涉政敏感、暴恐、赌博、毒品
const LOCAL_BAD_WORDS = [
  // 辱骂脏话
  '傻逼', '煞笔', '沙比', '妈的', '他妈', '你妈', '操你', '草你', '日你',
  '贱人', '贱货', '废物', '滚蛋', '白痴', '智障', '脑残', '去死',
  // 色情
  '色情', '嫖娼', '卖淫', '援交', '约炮', '一夜情',
  // 涉政敏感
  '法轮', '邪教', '反共', '台独', '港独', '藏独', '疆独',
  // 暴恐
  '恐怖袭击', '爆炸物', '枪支', '买枪', '卖枪',
  // 赌博 / 毒品
  '赌博', '博彩', '六合彩', '冰毒', '海洛因', '大麻', '吸毒', '贩毒'
]

/**
 * 本地敏感词粗筛
 * @param {string} text 待检文本
 * @returns {boolean} true = 命中敏感词（应拦截）
 */
export function localCheck(text) {
  if (!text) return false
  const t = String(text).toLowerCase()
  return LOCAL_BAD_WORDS.some((w) => t.includes(w.toLowerCase()))
}

/**
 * 提交前审查：先本地粗筛，通过即放行。
 * 官方 msgSecCheck 在云端写入时执行（见 submitFeedback 云函数），
 * 感言场景则在封存时随历史记录落本地，云端审查在用户提交留言时强制走。
 * @param {string} text 待检文本
 * @returns {{ pass: boolean, reason?: string }}
 */
export function moderateText(text) {
  const t = (text || '').trim()
  if (!t) return { pass: true }
  if (localCheck(t)) {
    return { pass: false, reason: '内容包含不当用词，换种说法再提交吧' }
  }
  return { pass: true }
}

/**
 * 云端官方审查（微信 security.msgSecCheck，经云函数代理）
 * 用于留言建议等「只给店主看」的内容，提交时强制过一遍。
 * 云函数未部署/调用失败时降级为仅本地检查，不阻塞用户。
 * @param {string} text 待检文本
 * @returns {Promise<{ pass: boolean, reason?: string }>}
 */
export async function cloudModerate(text) {
  // 先过本地，本地不过直接拦，省一次云调用
  const local = moderateText(text)
  if (!local.pass) return local

  // #ifdef MP-WEIXIN
  try {
    // 云开发未开通时 wx.cloud 为 undefined，直接访问 callFunction 会抛错，
    // 虽然被 catch 兜住但白等一次异常；先判存在性，走降级路径更干净。
    if (typeof wx === 'undefined' || !wx.cloud) return { pass: true }
    const res = await wx.cloud.callFunction({
      name: 'submitFeedback',
      data: { action: 'check', content: text }
    })
    const r = res && res.result
    if (r && r.ok === false) {
      return { pass: false, reason: r.errMsg || '内容审核未通过' }
    }
    return { pass: true }
  } catch (e) {
    // 云函数未部署或网络异常：降级放行（本地已粗筛），留痕便于排查
    console.warn('[moderate] 云端审查不可用，降级为本地检查', e)
    return { pass: true }
  }
  // #endif

  // 非微信环境（H5 预览等）：仅本地检查
  return { pass: true }
}
