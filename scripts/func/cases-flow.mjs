// 被测域：配方接力与出码参数（wxacode.js）+ 每日挑战目标存取（mix.js）。
// 这些是「页面之间搬配方」的通道，通道丢字段 = 还原出另一瓶香。
import { suite, test, expect, peek, poke } from './helpers.mjs'
import {
  encodeAccordParams, decodeAccordParams, buildWxacodePath,
  takePendingBlend, setPendingBlend, FALLBACK_QR
} from '../../src/utils/wxacode.js'
import {
  setDailyChallengeTarget, takeDailyChallengeTarget,
  isChallengeDone, markChallengeDone, getChallengeScore
} from '../../src/utils/mix.js'
import { ACCORDS } from '../../src/utils/data.js'

const blend = (patch) => {
  const v = {}
  ACCORDS.forEach((a) => { v[a.key] = 0 })
  return Object.assign(v, patch)
}

suite('配方接力（storage 暂存，card→lab）', () => {
  test('set → take 原样取出，且取完即删', () => {
    setPendingBlend(blend({ citrus: 60, woody: 40 }), '雨夜图书馆')
    const taken = takePendingBlend()
    expect(taken.name).toBe('雨夜图书馆')
    expect(taken.accords.citrus).toBe(60)
    expect(taken.accords.woody).toBe(40)
    expect(takePendingBlend()).toBe(null)
  })
  test('超过 10 分钟的接力视为过期作废', () => {
    setPendingBlend(blend({ citrus: 100 }), '旧配方')
    const rec = peek('isabella_restore_blend')
    rec.ts = Date.now() - 11 * 60 * 1000
    expect(takePendingBlend()).toBe(null)
  })
  test('没有接力时安静返回 null', () => {
    expect(takePendingBlend()).toBe(null)
  })
})

suite('小程序码参数（12 香调编解码）', () => {
  test('编码 → 解码逐键还原', () => {
    const v = blend({ citrus: 25, floral: 14, green: 22, aquatic: 9 })
    const decoded = decodeAccordParams(encodeAccordParams(v))
    ACCORDS.forEach((a) => expect(decoded[a.key]).toBe(v[a.key]))
  })
  test('全 0 编码判为无效（sum=0 → null，不给空配方还原）', () => {
    expect(decodeAccordParams(encodeAccordParams(blend({})))).toBe(null)
  })
  test('码路径：不带前导斜杠，实名才带 n 参数', () => {
    const real = buildWxacodePath(blend({ citrus: 100 }), '大地')
    expect(real.startsWith('pages/card/card?p=')).toBe(true)
    expect(real.includes('&n=')).toBe(true)
    const unnamed = buildWxacodePath(blend({ citrus: 100 }), '未命名香氛')
    expect(unnamed.includes('&n=')).toBe(false)
  })
  test('云开发不可用时出码回退空串（画卡跳过码图，不阻塞）', () => {
    expect(FALLBACK_QR).toBe('')
  })
})

suite('每日挑战目标存取（挑战入口的接力通道）', () => {
  test('写入 → 取出（即删）→ 二次取空', () => {
    setDailyChallengeTarget({ theme: '雨后森林', hint: '绿意与木质', target: { green: 70 } })
    const taken = takeDailyChallengeTarget()
    expect(taken.theme).toBe('雨后森林')
    expect(taken.hint).toBe('绿意与木质')
    expect(takeDailyChallengeTarget()).toBe(null)
  })
  test('昨天的残留挑战视为失效（跨天不污染今天的工坊）', () => {
    setDailyChallengeTarget({ theme: '旧题', hint: 'h', target: { green: 1 } })
    peek('isabella_daily_target').date = '2000-01-01'
    expect(takeDailyChallengeTarget()).toBe(null)
  })
  test('空挑战不写入（守卫防污染工坊）', () => {
    setDailyChallengeTarget(null)
    expect(peek('isabella_daily_target')).toBe('')
  })
})

suite('挑战完成标记', () => {
  test('标记后当天为已完成', () => {
    expect(isChallengeDone()).toBe(false)
    markChallengeDone()
    expect(isChallengeDone()).toBe(true)
  })
  test('当天重调：低分不覆盖高分，破纪录才更新（冲分不回退）', () => {
    markChallengeDone(88)
    expect(getChallengeScore()).toBe(88)
    markChallengeDone(60)
    expect(getChallengeScore()).toBe(88)   // 失手低分被拒，首页不回退
    markChallengeDone(90)
    expect(getChallengeScore()).toBe(90)   // 破纪录才覆盖
  })
  test('昨天的旧记录不挡今天（跨天正常写入新分数）', () => {
    poke('isabella_challenge_done', { date: '2000-01-01', score: 88 })
    markChallengeDone(60)
    expect(getChallengeScore()).toBe(60)
    expect(isChallengeDone()).toBe(true)
  })
})
