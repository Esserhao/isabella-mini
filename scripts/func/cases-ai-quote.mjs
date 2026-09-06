// 被测域：AI 评香链路（ai-quote.js 前端构造 + aiQuote/lib.js 云函数纯函数）
// 云函数 index.js 顶层 require('wx-server-sdk') 本地装不了，只测无依赖的 lib。
// 前端 getAiQuote 依赖 wx.cloud 运行时，node 环境直接 resolve(null)，属降级路径，
// 由 installEnv 的 wx 替身 + 上层流程用例覆盖，这里不重复。
import { createRequire } from 'node:module'
import { suite, test, expect } from './helpers.mjs'
import { buildAiQuotePayload, buildAiQuoteSig, trimAiQuoteCache, AI_QUOTE_TIMEOUT } from '../../src/utils/ai-quote.js'

const require = createRequire(import.meta.url)
const lib = require('../../cloudfunctions/aiQuote/lib.js')

suite('AI 评香：配方载荷构造', () => {
  test('只带非 0 项，label+pct 齐全，name 截 20', () => {
    const v = { citrus: 24, woody: 22, floral: 0, fougere: 16, musk: 0, amber: 0 }
    const p = buildAiQuotePayload(v, '蓝')
    expect(p.accords.length).toBe(3)
    expect(p.accords[0]).toEqual({ label: '柑橘', pct: 24 })
    expect(p.name).toBe('蓝')
  })
  test('全 0（纯水）→ 空数组（云函数会拒，前端不发）', () => {
    const p = buildAiQuotePayload({})
    expect(p.accords.length).toBe(0)
  })
})

suite('AI 评香：等待上限与缓存签名', () => {
  test('超时 ≤2.5s：封存不让用户干等（宁回退本地文案库）', () => {
    expect(AI_QUOTE_TIMEOUT <= 2500).toBe(true)
  })
  test('签名含配方与香名，同配方不同名签名不同', () => {
    const v = { citrus: 60, floral: 40 }
    expect(buildAiQuoteSig(v, '蓝')).toBe(buildAiQuoteSig(v, '蓝'))
    expect(buildAiQuoteSig(v, '蓝') === buildAiQuoteSig(v, '青')).toBe(false)
    expect(buildAiQuoteSig(v, '蓝') !== buildAiQuoteSig({ citrus: 50, floral: 50 }, '蓝')).toBe(true)
  })
  test('LRU 淘汰：超上限删最旧，保留最新', () => {
    const cache = {}
    for (let i = 0; i < 5; i++) cache['s' + i] = { q: '句' + i, t: i }
    const out = trimAiQuoteCache(cache, 3)
    expect(Object.keys(out).length).toBe(3)
    expect(out.s4 && out.s3 && out.s2).toBeTruthy()
    expect(out.s0 === undefined).toBe(true)
    expect(out.s1 === undefined).toBe(true)
  })
})

suite('AI 评香：云函数 prompt 构造（lib.buildMessages）', () => {
  test('合法输入生成 system+user，user 含 label 与占比', () => {
    const msgs = lib.buildMessages([{ label: '木质', pct: 78 }, { label: '东方', pct: 8 }], '檀道试调')
    expect(msgs.length).toBe(2)
    expect(msgs[0].role).toBe('system')
    expect(msgs[1].content.indexOf('木质 78%') !== -1).toBe(true)
    expect(msgs[1].content.indexOf('檀道试调') !== -1).toBe(true)
  })
  test('空配方返回 null', () => {
    expect(lib.buildMessages([], '')).toBe(null)
    expect(lib.buildMessages(null, 'x')).toBe(null)
  })
})

suite('AI 评香：返回清洗（lib.sanitizeQuote）', () => {
  test('剥「古先生说：」前缀与成对引号（顺序无关）', () => {
    expect(lib.sanitizeQuote('古先生说：这支香像早上六点的厨房')).toBe('这支香像早上六点的厨房')
    expect(lib.sanitizeQuote('「古先生说：这支香像早上六点的厨房。」')).toBe('这支香像早上六点的厨房')
  })
  test('剥首尾多余标点，正文保留', () => {
    expect(lib.sanitizeQuote('，，这支香挺冲，像有人推开了窗。……')).toBe('这支香挺冲，像有人推开了窗')
  })
  test('超 52 字在句内断点截断，结果 ≤52', () => {
    const long = '这支香前调是炸开的柑橘，中段慢慢沉下来变成带着烟熏感的木头，尾调还留着一丁点甜，像有人把一整座果园背在背上走了十里路'
    const out = lib.sanitizeQuote(long)
    expect(!!out).toBe(true)
    expect(out.length <= 52).toBe(true)
  })
  test('过短（<6 字）视为敷衍，返回 null', () => {
    expect(lib.sanitizeQuote('不错')).toBe(null)
    expect(lib.sanitizeQuote('这支香挺冲')).toBe(null)
  })
  test('非字符串返回 null', () => {
    expect(lib.sanitizeQuote(undefined)).toBe(null)
    expect(lib.sanitizeQuote(42)).toBe(null)
    expect(lib.sanitizeQuote('')).toBe(null)
  })
})

suite('AI 评香：禁用词第二道闸（lib.hasBannedWord）', () => {
  test('命中悬浮书面词判 true', () => {
    expect(lib.hasBannedWord('香气仿佛在鼻尖跳舞')).toBe(true)
    expect(lib.hasBannedWord('这一生都忘不掉')).toBe(true)
  })
  test('正常大白话判 false', () => {
    expect(lib.hasBannedWord('这支香像刚晾干的白衬衫，有它自己的主意')).toBe(false)
  })
})
