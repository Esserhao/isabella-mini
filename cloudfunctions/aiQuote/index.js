// ============================================================
// 云函数 aiQuote —— 为封存卡生成「古先生」针对性评论（AI 版）
//
// 前端调用：wx.cloud.callFunction({ name: 'aiQuote', data: { accords, name } })
//   accords: [{ label: '柑橘', pct: 24 }, ...]  12 香调非 0 项（label 前端带过来）
//   name:    香名（可空）
// 返回：{ ok: true, quote } 或 { ok: false, errCode, errMsg }
//
// 通道：OpenAI 兼容 HTTP，环境变量可配（在云开发控制台给本函数配）：
//   AI_BASE_URL  默认 https://chatapi.weixin.qq.com/openai/v1（大赛 Coding Plan）
//   AI_API_KEY   必填，否则返回 NO_AI_KEY（前端自动回退本地台词池）
//   AI_MODEL     默认 DeepSeek-v4-flash
// 换 DeepSeek 官方/腾讯云混元只需改这三个环境变量，代码不动。
//
// ⚠️ 部署后在云开发控制台把本函数超时调到 ≥10s（默认 3s 不够）。
// ============================================================
const https = require('https')
const { buildMessages, sanitizeQuote, hasBannedWord } = require('./lib')

const BASE = process.env.AI_BASE_URL || 'https://chatapi.weixin.qq.com/openai/v1'
const KEY = process.env.AI_API_KEY || ''
const MODEL = process.env.AI_MODEL || 'DeepSeek-v4-flash'
const HTTP_TIMEOUT = 9000 // 给上游 9s；云函数超时请调 ≥10s

// 上游请求（OpenAI 兼容 /chat/completions）。resolve {ok,status,data} / {ok:false,errCode,errMsg}
function postChat(messages) {
  return new Promise((resolve) => {
    let url
    try { url = new URL('/chat/completions', BASE.endsWith('/') ? BASE : BASE + '/') } catch (e) {
      resolve({ ok: false, errCode: 'BAD_BASE_URL', errMsg: 'AI_BASE_URL 配置不合法' }); return
    }
    const body = JSON.stringify({ model: MODEL, messages, temperature: 1.1, max_tokens: 200 })
    const req = https.request({
      hostname: url.hostname, port: url.port || 443, path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: `Bearer ${KEY}`
      },
      timeout: HTTP_TIMEOUT
    }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        let data = null
        try { data = JSON.parse(text) } catch (e) { /* 非 JSON，走下方错误 */ }
        if (res.statusCode >= 200 && res.statusCode < 300 && data) resolve({ ok: true, data })
        else {
          const msg = (data && (data.error && (data.error.message || data.error.code))) ||
            (data && data.message) || `HTTP ${res.statusCode}`
          resolve({ ok: false, errCode: 'AI_UPSTREAM', errMsg: String(msg).slice(0, 200), status: res.statusCode })
        }
      })
    })
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, errCode: 'AI_TIMEOUT', errMsg: '上游超时' }) })
    req.on('error', (e) => resolve({ ok: false, errCode: 'AI_NETWORK', errMsg: (e && e.message) || '网络错误' }))
    req.write(body)
    req.end()
  })
}

exports.main = async (event = {}) => {
  // 1) Key 未配：直接告诉前端「没配」，别浪费一次网络往返
  if (!KEY) return { ok: false, errCode: 'NO_AI_KEY', errMsg: '云函数未配置 AI_API_KEY' }

  const accords = event.accords
  const name = typeof event.name === 'string' ? event.name.slice(0, 20) : ''
  const messages = buildMessages(accords, name)
  if (!messages) return { ok: false, errCode: 'BAD_INPUT', errMsg: 'accords 为空或格式不正确' }

  const r = await postChat(messages)
  if (!r.ok) return r

  // 3) 取模型文本并清洗；不合格返回 GEN_EMPTY（前端回退随机池，不再重试——省配额）
  const content = r.data && r.data.choices && r.data.choices[0] && r.data.choices[0].message &&
    r.data.choices[0].message.content
  if (!content || typeof content !== 'string') return { ok: false, errCode: 'GEN_EMPTY', errMsg: '模型未返回文本' }
  const quote = sanitizeQuote(content)
  if (!quote || hasBannedWord(quote)) {
    return { ok: false, errCode: 'GEN_REJECT', errMsg: quote ? '命中禁用词' : '内容不合格' }
  }
  return { ok: true, quote, model: MODEL }
}
