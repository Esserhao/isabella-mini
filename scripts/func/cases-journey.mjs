// ============================================================
// 用户旅程测试：模仿真人的连续使用。
//
// 页面（lab / home / card）在 Node 里不可加载，旅程模拟的是「人在界面上
// 做动作」时 app 实际发生的存储写入与模块调用序列 —— 按相同顺序驱动，
// 断言人在每一步能观察到的结果：连签天数、封存层级、彩蛋进度、收藏列表、
// 完成弹窗条件、历史条数。一条 story 内存储全程累积，跨步骤不重置。
// ============================================================
import { story, expect, peek, poke, dateStr } from './helpers.mjs'
import { track, getStats } from '../../src/utils/analytics.js'
import { toggleFav, getFavorites, removeFav } from '../../src/utils/favorites.js'
import { recordSeal, getStreak } from '../../src/utils/streak.js'
import { bumpSealCount, getSealCount, tierOf } from '../../src/utils/progress.js'
import { achieveEgg, getEggs, sealLabelOf } from '../../src/utils/eggs.js'
import {
  scoreDailyChallenge, markChallengeDone, isChallengeDone,
  takeDailyChallengeTarget, setDailyChallengeTarget,
  randomAccords, normalizeAccords
} from '../../src/utils/mix.js'
import {
  encodeAccordParams, decodeAccordParams, buildWxacodePath,
  setPendingBlend, takePendingBlend
} from '../../src/utils/wxacode.js'
import { ACCORDS, DAILY_CHALLENGES } from '../../src/utils/data.js'

// 封存一瓶 = lab triggerSeal 的副作用序列（画卡除外），旅程里作为一个「动作」。
// 时间戳用固定步进，跨旅程也不撞主键。
let bottleNo = 0
const sealBottle = (name, { challenge = false } = {}) => {
  track('seal')
  const streak = recordSeal()
  if (challenge) markChallengeDone()
  const bump = bumpSealCount()
  const time = 1756500000000 + bottleNo * 60000
  const vals = randomAccords()
  const arr = Array.isArray(peek('isabella_history')) ? peek('isabella_history') : []
  arr.unshift({ time, name, accords: vals })
  poke('isabella_history', arr.slice(0, 50))
  bottleNo++
  return { streak, bump, time, vals }
}

let myBlend = null
let myScore = 0
let lastTime = 0
let myVals = null

story('小白的七天：从第一瓶到「七日不熄」', [
  ['冷启动：一切从零', () => {
    expect(getFavorites()).toHaveLength(0)
    expect(getStreak()).toBe(0)
    expect(getEggs().achieved).toBe(0)
    expect(takeDailyChallengeTarget()).toBe(null)
    expect(isChallengeDone()).toBe(false)
    expect(getSealCount()).toBe(0)
  }],
  ['首页接受今日挑战', () => {
    setDailyChallengeTarget(DAILY_CHALLENGES[0])
  }],
  ['进工坊拿到题（暂存即删）', () => {
    expect(takeDailyChallengeTarget().theme).toBe(DAILY_CHALLENGES[0].theme)
    expect(takeDailyChallengeTarget()).toBe(null)
  }],
  ['照提示调香：比纯水强得多，但第一次不会满分', () => {
    const target = DAILY_CHALLENGES[0].target
    myBlend = {}
    Object.keys(target).forEach((k) => { myBlend[k] = Math.round(target[k] * 0.6) })
    myBlend.oriental = 30  // 手会抖：混进主题外的东方调，方向就偏了
    const blank = {}
    ACCORDS.forEach((a) => { blank[a.key] = 0 })
    myScore = scoreDailyChallenge(myBlend, { target }).score
    expect(myScore).toBeGreaterThan(10)
    expect(myScore).toBeLessThan(95)
    expect(myScore).toBeGreaterThan(scoreDailyChallenge(blank, { target }).score)
  }],
  ['封存第一瓶：连签 1、初次来访、挑战完成点亮', () => {
    const r = sealBottle('雨夜图书馆', { challenge: true })
    lastTime = r.time
    expect(r.streak).toBe(1)
    expect(r.bump.count).toBe(1)
    expect(r.bump.leveledUp).toBe(false)
    expect(r.bump.tier.title).toBe('初次来访')
    expect(isChallengeDone()).toBe(true)
  }],
  ['收藏自己的第一瓶', () => {
    expect(toggleFav({ time: lastTime, name: '雨夜图书馆' })).toBe(true)
    expect(getFavorites()).toHaveLength(1)
  }],
  ['同日再封一瓶：连签不涨、完成弹窗不再弹', () => {
    sealBottle('第二瓶')
    expect(getStreak()).toBe(1)
    expect(isChallengeDone()).toBe(true)
  }],
  ['第 2~6 天每天来封一瓶', () => {
    // 时间机器：五瓶按同日补计数（recordSeal 同日不涨连签），再把
    // 连签链拨成「昨天是第 6 天」——等价于这五天真实地隔天封存过。
    let last = null
    for (let i = 3; i <= 7; i++) {
      last = sealBottle(`第${i}瓶`)
      expect(last.bump.count).toBe(i)
    }
    poke('isabella_last_seal', dateStr(-1))
    poke('isabella_streak', 6)
    expect(getStreak()).toBe(6)
    expect(getSealCount()).toBe(7)
    expect(tierOf(7).title).toBe('被读懂的人')
  }],
  ['第 7 天封存：连签跨过七日线', () => {
    poke('isabella_last_seal', dateStr(-1))
    poke('isabella_streak', 6)
    const r = sealBottle('第七瓶·雨夜归来')
    expect(r.streak).toBe(7)
    expect(getStreak()).toBe(7)
    expect(achieveEgg('streak7')).toBe(true)
    expect(sealLabelOf({ tierLabel: '已封存', streak: 7, hour: 14, pureWater: false })).toBe('七日封存')
  }],
  ['「我的」页视角：进度 1/8，七日彩蛋已点亮', () => {
    const g = getEggs()
    expect(g.achieved).toBe(1)
    expect(g.total).toBe(8)
    expect(g.list.find((e) => e.key === 'streak7').time > 0).toBe(true)
  }],
  ['漏斗与收藏页视角：埋点、历史、收藏互相咬合', () => {
    expect(getStats().seal).toBe(8)
    expect(peek('isabella_history')).toHaveLength(8)
    expect(getFavorites()).toHaveLength(1)
  }],
])

story('把这瓶香分享给好友：参数往返全程', [
  ['摇一瓶并封存', () => {
    const r = sealBottle('雾中情人')
    myVals = r.vals
    expect(myVals).toBeTruthy()
  }],
  ['好友收到 p 参数：逐键还原', () => {
    const decoded = decodeAccordParams(encodeAccordParams(myVals))
    ACCORDS.forEach((a) => expect(decoded[a.key]).toBe(myVals[a.key]))
  }],
  ['card 页归一化：总和恒 100', () => {
    const norm = normalizeAccords(decodeAccordParams(encodeAccordParams(myVals)))
    let sum = 0
    ACCORDS.forEach((a) => { sum += norm[a.key] })
    expect(sum).toBe(100)
  }],
  ['码路径：无前导斜杠、带实名', () => {
    const p = buildWxacodePath(myVals, '雾中情人')
    expect(p.startsWith('pages/card/card?p=')).toBe(true)
    expect(p.includes('&n=')).toBe(true)
  }],
  ['「我也调一瓶」接力：新鲜可取、取完即删', () => {
    setPendingBlend(myVals, '雾中情人')
    const taken = takePendingBlend()
    expect(taken.name).toBe('雾中情人')
    expect(takePendingBlend()).toBe(null)
  }],
  ['好友搁置 11 分钟才点：接力作废，不还原出旧配方', () => {
    setPendingBlend(myVals, '雾中情人')
    peek('isabella_restore_blend').ts = Date.now() - 11 * 60 * 1000
    expect(takePendingBlend()).toBe(null)
  }],
])

story('一段时间后整理收藏', [
  ['收藏了三瓶', () => {
    toggleFav({ time: 101, name: '雨夜图书馆', accords: { citrus: 100 } })
    toggleFav({ time: 102, name: '雾中情人', accords: { woody: 100 } })
    toggleFav({ time: 103, name: '月光海岸', accords: { aquatic: 100 } })
    expect(getFavorites()).toHaveLength(3)
  }],
  ['删掉中间那瓶：其余不动', () => {
    removeFav(102)
    expect(getFavorites()).toHaveLength(2)
    expect(getFavorites().some((f) => f.time === 102)).toBe(false)
  }],
  ['收藏改动不影响封存进度与彩蛋', () => {
    expect(getSealCount()).toBe(0)
    expect(getEggs().achieved).toBe(0)
  }],
  ['全删光：收藏页回到空态', () => {
    removeFav(101)
    removeFav(103)
    expect(getFavorites()).toHaveLength(0)
  }],
])
