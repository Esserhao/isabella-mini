// ============================================================
// aiQuote/lib.js —— 纯函数（无 wx-server-sdk / 无网络依赖，可被 Node 测试直接加载）
// 职责：构造发送给大模型的 messages、清洗模型返回的评论。
// 与 index.js 分离的原因：cloudfunctions 是 CommonJS 且云端才装 wx-server-sdk，
// 把无依赖逻辑抽到这里，scripts/func 的测试才能 require 它做单测。
// ============================================================

// 古先生 persona 约束：与 GU_QUOTES 同一套口吻（大白话、具体物象、带偏见、不升华）。
// 这里同时按项目「去 AI 味」规范禁掉一批书面/悬浮词，让模型别写出 AI 腔。
const SYSTEM_PROMPT =
  '你是古先生，一位在格拉斯学过调香、说话带烟火气的老调香师，正给顾客刚调好的一瓶香写短评。' +
  '要求：1) 只输出一句评论本身，不要标题、不要「古先生说」前缀、不要引号、不要解释；' +
  '2) 20~50 个汉字；3) 大白话，落到具体物件/气味/动作/画面，可带个人偏见；' +
  '4) 必须针对这瓶香的香调组合来写，不许写成放之四海皆准的万金油；' +
  '5) 禁用升华总结，禁用「仿佛/宛如/犹如/一丝/一抹/缓缓/微微/那一刻/这一生/时光/灵魂」这类词，' +
  '结尾落到动作或画面，不感叹人生。'

// 把香调数组拼成一句给模型看的话。payload.accords 形如 [{label:'柑橘', pct:24}, ...]（前端已按 ACCORDS 过滤非 0）
function buildUserText(accords, name) {
  const list = (Array.isArray(accords) ? accords : [])
    .filter((x) => x && x.label && Number(x.pct) > 0)
    .map((x) => `${x.label} ${Math.round(Number(x.pct))}%`)
  if (!list.length) return ''
  const namePart = name ? `这瓶香叫「${name}」，` : '这瓶香'
  return `${namePart}香调配比：${list.join('、')}。请针对这个配方写一句短评。`
}

// 构造 OpenAI 兼容的 messages 数组；配方为空返回 null（调用方直接拒绝）
function buildMessages(accords, name) {
  const user = buildUserText(accords, name)
  if (!user) return null
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user }
  ]
}

// 模型偶尔会带引号/「」/书名号/前后缀返回，剥掉再判长度；不合格返回 null（前端回退随机池）
function sanitizeQuote(raw) {
  if (!raw || typeof raw !== 'string') return null
  let t = String(raw).trim()
  // 迭代剥「外层成对引号」与「古先生说：」前缀——模型两种顺序都可能给
  //（带引号时前缀不在行首，单次正则剥不掉；循环剥到不再变化为止）。
  let prev
  do {
    prev = t
    t = t.replace(/^[「『"'“”‘’]+|[」』"'“”‘’]+$/g, '').trim()
    t = t.replace(/^(古先生(?:说|曰)?[:：]?|AI评香[:：]?)/, '').trim()
  } while (t !== prev)
  // 剥首尾停顿标点（保留内文标点）
  t = t.replace(/^[，。、；：,.!！?？…\s]+/, '').replace(/[，。、；：,.!！?？…\s]+$/, '').trim()
  // 上限 52 字：找最后一个句内断点截断，避免硬切词；找不到就硬截
  if (t.length > 52) {
    const cut = t.slice(0, 44)
    const m = cut.match(/[。！？!?，、；;]/g)
    const lastIdx = m ? cut.lastIndexOf(m[m.length - 1]) : -1
    t = (lastIdx > 12 ? cut.slice(0, lastIdx + 1) : t.slice(0, 44)).trim()
  }
  if (t.length < 6) return null
  return t
}

// 去 AI 味第二道闸：返回的句子若仍带悬浮书面词，宁可放弃（前端回退本地池）
const BANNED_WORDS = ['仿佛', '宛如', '犹如', '宛若', '如同', '一丝', '一抹', '些许', '隐约',
  '不禁', '缓缓', '微微', '淡淡', '那一刻', '这一生', '时光', '灵魂', '邂逅', '氤氲',
  '静谧', '缱绻', '不言而喻', '不言不语', '扑面而来', '无声无息', '淋漓尽致']
function hasBannedWord(text) {
  return BANNED_WORDS.some((w) => text.indexOf(w) !== -1)
}

module.exports = { SYSTEM_PROMPT, buildMessages, buildUserText, sanitizeQuote, hasBannedWord, BANNED_WORDS }
