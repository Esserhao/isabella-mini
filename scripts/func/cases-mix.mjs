// 被测域：mix.js —— 挑战评分 / 雷达 / 配方 / 归一化，以及「水位无关性」。
// 水只是让 12 香调能从 0 起步的机制性中间态（用户拍板：不考虑浓淡对香水的影响），
// 所以「稀释不改变任何香水行为」在这里是被断言的产品规格，不是巧合。
import { suite, test, expect } from './helpers.mjs'
import {
  computeRadarValues, generateFormula, scoreDailyChallenge,
  normalizeAccords, findExactMatch, getDailyChallenge
} from '../../src/utils/mix.js'
import { DAILY_CHALLENGES, ACCORDS } from '../../src/utils/data.js'

suite('每日挑战选题', () => {
  test('同一天内多次取题稳定，且题目结构完整', () => {
    const a = getDailyChallenge()
    const b = getDailyChallenge()
    expect(a.theme).toBe(b.theme)
    expect(a.hint).toBeTruthy()
    expect(a.target).toBeTruthy()
  })
})

const fullBlend = () => {
  const v = {}
  ACCORDS.forEach((a) => { v[a.key] = 0 })
  Object.assign(v, { citrus: 25, floral: 15, woody: 30, green: 30 })
  return v
}
const diluted = () => {
  const v = fullBlend()
  ACCORDS.forEach((a) => { v[a.key] = v[a.key] / 2 })  // 香调总和 50 = 兑了一半水
  return v
}

suite('每日挑战评分', () => {
  test('无挑战 / 无目标返回 null', () => {
    expect(scoreDailyChallenge({}, null)).toBe(null)
    expect(scoreDailyChallenge({}, {})).toBe(null)
  })
  test('空白起点（纯水）所有主题都是最低档 10 分', () => {
    const blank = {}
    ACCORDS.forEach((a) => { blank[a.key] = 0 })
    DAILY_CHALLENGES.forEach((c) => {
      expect(scoreDailyChallenge(blank, { target: c.target }).score).toBe(10)
    })
  })
  test('正解恒为封顶 95 分', () => {
    DAILY_CHALLENGES.forEach((c) => {
      expect(scoreDailyChallenge(c.target, { target: c.target }).score).toBe(95)
    })
  })
  test('越像分越高（单调性抽查）', () => {
    const target = DAILY_CHALLENGES[0].target
    const s = (blend) => scoreDailyChallenge(blend, { target }).score
    expect(s(target)).toBeGreaterThan(s({ floral: 100 }))
  })
})

suite('水位不影响香水行为（浓淡无关性规格）', () => {
  test('六维雷达（结构模式）不受水位影响', () => {
    expect(computeRadarValues(diluted())).toEqual(computeRadarValues(fullBlend()))
  })
  test('六维雷达（绝对模式）不受水位影响', () => {
    expect(computeRadarValues(diluted(), 'absolute')).toEqual(computeRadarValues(fullBlend(), 'absolute'))
  })
  test('配方（香料名）不受水位影响', () => {
    expect(generateFormula(diluted())).toEqual(generateFormula(fullBlend()))
  })
  test('挑战契合度不受水位影响', () => {
    const target = DAILY_CHALLENGES[1].target
    const a = scoreDailyChallenge(diluted(), { target }).score
    const b = scoreDailyChallenge(fullBlend(), { target }).score
    expect(a).toBe(b)
  })
  test('复刻判定是唯一认绝对值的地方：稀释后不再逐键相等', () => {
    const p = { accords: fullBlend() }
    expect(findExactMatch(diluted(), [p])).toBe(null)
    expect(findExactMatch(fullBlend(), [p])).toBe(p)
  })
})

suite('雷达与归一化的边界', () => {
  test('全 0（纯水）雷达不产生 NaN，收缩在原点', () => {
    const r = computeRadarValues({})
    expect(r).toHaveLength(6)
    r.forEach((v) => expect(v).toBe(0))
  })
  test('单香调拉满在绝对模式下就是该维 100', () => {
    expect(computeRadarValues({ citrus: 100 }, 'absolute')[0]).toBe(100)
  })
  test('归一化：整数、非负、总和恒 100', () => {
    const out = normalizeAccords({ citrus: 33.3, floral: 33.3, woody: 33.4 })
    const keys = ACCORDS.map((a) => a.key)
    expect(keys.reduce((s, k) => s + out[k], 0)).toBe(100)
    keys.forEach((k) => {
      expect(Number.isInteger(out[k])).toBe(true)
      expect(out[k] >= 0).toBe(true)
    })
  })
  test('归一化：全 0 输入落到第一味 100（不让总和失守）', () => {
    const out = normalizeAccords({})
    expect(out[ACCORDS[0].key]).toBe(100)
  })
})
