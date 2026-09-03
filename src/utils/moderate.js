// ============================================================
// 内容审查：用户输入（调香感言 / 留言建议）提交前的安全检查
//
// 两层防线：
//   1. 本地敏感词粗筛（离线、零延迟）—— 拦掉最明显的脏话/违规词
//   2. 微信官方 msgSecCheck（云函数 submitFeedback 内调用）—— 权威判定
//
// 设计原则：本地词表只做「粗筛」，不求全 —— 误杀比漏放更伤体验，
// 拿不准的交给云端官方接口兜底。
// ============================================================

// 本地敏感词粗筛表（仅列最典型项，正式审查以微信 msgSecCheck 为准）
// 覆盖：脏话辱骂、色情、涉政敏感、暴恐、赌博、毒品
const LOCAL_BAD_WORDS = [
  // 辱骂脏话
  // 注：「妈的/他妈/你妈/日你」这类人称代词组合极易误杀正常文本
  //（「送给他妈妈」「外婆妈妈的房间」「妈妈的生日你记得吗」），
  // 本地粗筛宁可漏放——留言仍有云端 msgSecCheck 兜底，感言只落本地。
  '傻逼', '煞笔', '沙比', '操你', '草你',
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
// 注：曾提供 cloudModerate（经云函数 check 分支单独审查），但全项目无人调用，
// 且 check 分支无频控会裸暴露 msgSecCheck 配额——已一并删除（2026-09-03）。
// 官方审查统一在 submitFeedback 写入前执行，不再提供独立审查入口。
