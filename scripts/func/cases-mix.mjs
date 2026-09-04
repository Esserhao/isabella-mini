// 被测域：mix.js —— 挑战评分 / 雷达 / 配方 / 归一化，以及「水位无关性」。
// 水只是让 12 香调能从 0 起步的机制性中间态（用户拍板：不考虑浓淡对香水的影响），
// 所以「稀释不改变任何香水行为」在这里是被断言的产品规格，不是巧合。
import { suite, test, expect } from './helpers.mjs'
import {
  computeRadarValues, generateFormula, scoreDailyChallenge,
  normalizeAccords, findExactMatch, getDailyChallenge, tierRatio, tierAccords
} from '../../src/utils/mix.js'
import { DAILY_CHALLENGES, ACCORDS, SOLVENT, PYRAMID_TIER, PYRAMID_TIERS, galleryPerfumes } from '../../src/utils/data.js'

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
  test('纯水公约：整瓶只含水（SOLVENT 也在入参里）配方必须为空，绝不幻觉前六香料', () => {
    const onlyWater = {}
    ACCORDS.forEach((a) => { onlyWater[a.key] = 0 })
    onlyWater[SOLVENT.key] = 100
    expect(generateFormula(onlyWater)).toEqual([])
  })
  test('配方对水位的无关性在「入参含 SOLVENT.key」时仍然成立', () => {
    const noWater = fullBlend()
    const withWater = { ...noWater, [SOLVENT.key]: 40 }
    expect(generateFormula(withWater)).toEqual(generateFormula(noWater))
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

suite('前中后层占比 tierRatio（三调行加占比的数据源）', () => {
  test('纯水 / 香调全 0 返回 null（调用方隐藏整块，不硬凑三行 0）', () => {
    expect(tierRatio({})).toBe(null)
    expect(tierRatio({ [SOLVENT.key]: 100 })).toBe(null)
  })
  test('柑橘 50 + 木质 50：中调如实为 0（不再因香料榜截断整层蒸发）', () => {
    expect(tierRatio({ citrus: 50, woody: 50 })).toEqual({ top: 50, middle: 0, base: 50 })
  })
  test('三调齐活时摊成和为 100 的整数', () => {
    const r = tierRatio({ citrus: 35, floral: 30, woody: 35 })
    expect(r.top + r.middle + r.base).toBe(100)
    expect(r.middle).toBe(30)
  })
  test('SOLVENT 不进结构：入参带纯水键结果不变', () => {
    const a = tierRatio({ citrus: 40, floral: 25, woody: 20, [SOLVENT.key]: 15 })
    const b = tierRatio({ citrus: 40, floral: 25, woody: 20 })
    expect(a).toEqual(b)
    expect(a).toEqual({ top: 47, middle: 29, base: 24 })
  })
  test('只有前调类香调时后两层如实为 0', () => {
    expect(tierRatio({ citrus: 30, green: 20 })).toEqual({ top: 100, middle: 0, base: 0 })
  })
})

suite('前中后层分类 tierAccords（三调行 ⓘ 释义的「分类」数据源）', () => {
  test('每层收着正确的香调（按 ACCORDS 顺序）', () => {
    expect(tierAccords('top')).toEqual(['citrus', 'green', 'aquatic'])
    expect(tierAccords('middle')).toEqual(['floral', 'fruity', 'fougere'])
    expect(tierAccords('base')).toEqual(['woody', 'oriental', 'musk', 'amber', 'vanilla', 'tobacco'])
  })
  test('12 香调恰好分完三层：无重叠、无遗漏（防映射漂移丢香调）', () => {
    const all = ['top', 'middle', 'base'].flatMap((t) => tierAccords(t))
    expect(new Set(all).size).toBe(12)
    expect([...new Set(all)].sort()).toEqual(ACCORDS.map((a) => a.key).sort())
  })
  test('PYRAMID_TIER 与 PYRAMID_TIERS 文案同源：每层文案都能查到映射里的层', () => {
    const tierKeys = ['top', 'middle', 'base']
    expect(PYRAMID_TIERS.map((t) => t.key)).toEqual(tierKeys)
    tierKeys.forEach((k) => expect(tierAccords(k).length).toBeGreaterThan(0))
  })
  test('层文案齐全：label/tagline/description/note 均非空', () => {
    PYRAMID_TIERS.forEach((t) => {
      expect(t.label.length).toBeGreaterThan(0)
      expect(t.tagline.length).toBeGreaterThan(0)
      expect(t.description.length).toBeGreaterThan(20)
      expect(t.note.length).toBeGreaterThan(0)
    })
  })
})

suite('图鉴香水数据（新增名香的护栏）', () => {
  // 香水库是「复刻名香」彩蛋、首页推荐、图鉴三调行的数据源，
  // 配比写错（漏键 / 和不为 100 / 两款撞车）会一路错到彩蛋判定，这里挡死。
  const KEYS = ACCORDS.map((a) => a.key)

  test('每款 accords 12 键齐全且和为 100', () => {
    galleryPerfumes.forEach((p) => {
      KEYS.forEach((k) => expect(k in p.accords).toBe(true))
      expect(Object.keys(p.accords).length).toBe(KEYS.length)
      expect(KEYS.reduce((s, k) => s + (Number(p.accords[k]) || 0), 0)).toBe(100)
    })
  })
  test('id 唯一、品牌与文案字段齐全', () => {
    const ids = galleryPerfumes.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    galleryPerfumes.forEach((p) => {
      expect(p.name && p.brand && p.year && p.perfumer).toBeTruthy()
      expect(p.hook.length).toBeGreaterThan(0)
      expect(p.description.length).toBeGreaterThan(20)
    })
  })
  test('每款都能算出三层占比，且三层和为 100', () => {
    galleryPerfumes.forEach((p) => {
      const r = tierRatio(p.accords)
      expect(r === null).toBe(false) // 只有纯水/全 0 才 null，名香不该出现
      expect(r.top + r.middle + r.base).toBe(100)
    })
  })
  test('任意两款 accords 不重复（否则复刻名香彩蛋有歧义）', () => {
    const sig = galleryPerfumes.map((p) => KEYS.map((k) => p.accords[k]).join(','))
    expect(new Set(sig).size).toBe(sig.length)
  })
  test('画像足够多样：全库第一主导香调至少 6 种', () => {
    const mains = galleryPerfumes.map((p) =>
      ACCORDS.reduce((m, a) => (p.accords[a.key] > p.accords[m.key] ? a : m), ACCORDS[0]).key)
    expect(new Set(mains).size >= 6).toBe(true)
  })
})
