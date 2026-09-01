// 被测域：图鉴翻阅记录（seen.js）——计数、幂等、凑齐点亮彩蛋、香料不计入。
import { suite, test, expect, poke } from './helpers.mjs'
import { galleryPerfumes, ACCORDS, notesData } from '../../src/utils/data.js'
import { EGGS, getEggs } from '../../src/utils/eggs.js'
import { markSeen, getSeenCount, getSeenProgress, SEEN_TOTAL, SEEN_EGG } from '../../src/utils/seen.js'

// 把三类内容全翻一遍，返回最后一笔的 markSeen 结果（= 是否刚好首次点亮）
function markAll() {
  let last = false
  galleryPerfumes.forEach((p) => { last = markSeen('perfume', p.id) })
  ACCORDS.forEach((a) => { last = markSeen('accord', a.key) })
  notesData.forEach((n) => { last = markSeen('note', n.title) })
  return last
}

suite('图鉴翻阅记录', () => {
  test('总数 = 香水 + 香调 + 手记（香料刻意不计入）', () => {
    expect(SEEN_TOTAL).toBe(galleryPerfumes.length + ACCORDS.length + notesData.length)
    expect(getSeenProgress()).toEqual({ count: 0, total: SEEN_TOTAL })
  })

  test('「卷末余香」已登记在彩蛋表，且文案不含「古先生」', () => {
    const egg = EGGS.find((e) => e.key === SEEN_EGG)
    expect(!!egg).toBe(true)
    expect(egg.name.includes('古先生')).toBe(false)
    expect(egg.desc.includes('古先生')).toBe(false)
  })

  test('记一笔 +1，同一项重复打开不重复计数', () => {
    markSeen('perfume', galleryPerfumes[0].id)
    expect(getSeenCount()).toBe(1)
    markSeen('perfume', galleryPerfumes[0].id)
    expect(getSeenCount()).toBe(1)
  })

  test('三类都翻过才凑齐，翻满即点亮「卷末余香」', () => {
    galleryPerfumes.forEach((p) => markSeen('perfume', p.id))
    expect(getSeenCount()).toBe(galleryPerfumes.length)
    // 只翻了香水，不该点亮
    expect(getEggs().list.find((e) => e.key === SEEN_EGG).time).toBe(0)
    ACCORDS.forEach((a) => markSeen('accord', a.key))
    expect(getEggs().list.find((e) => e.key === SEEN_EGG).time).toBe(0)
    expect(markAll()).toBe(true)
    expect(getSeenCount()).toBe(SEEN_TOTAL)
    expect(getEggs().list.find((e) => e.key === SEEN_EGG).time).toBeGreaterThan(0)
  })

  test('凑齐后再翻旧内容，不重复点亮', () => {
    markAll()
    expect(markSeen('perfume', galleryPerfumes[0].id)).toBe(false)
    expect(getSeenCount()).toBe(SEEN_TOTAL)
  })

  test('香料不计入翻阅统计', () => {
    expect(markSeen('ingredient', '柠檬')).toBe(false)
    expect(getSeenCount()).toBe(0)
  })

  test('未登记的 kind 一律拒绝', () => {
    expect(markSeen('whatever', 1)).toBe(false)
    expect(getSeenCount()).toBe(0)
  })

  test('id 为空或 undefined 字符串不入账', () => {
    expect(markSeen('perfume', '')).toBe(false)
    expect(markSeen('perfume', undefined)).toBe(false)
    expect(getSeenCount()).toBe(0)
  })

  // 老用户升级 / 图鉴删条目后，storage 里会留下比现在多的旧 id。
  // 每类按各自总数封顶，count 不会被顶到超过 total（彩蛋页不会显示 40/32）。
  test('孤儿记录不会把 count 顶超 total', () => {
    const stale = []
    for (let i = 0; i < 40; i++) stale.push('old_' + i)
    poke('isabella_seen', { perfume: stale, accord: stale })
    expect(getSeenCount()).toBe(galleryPerfumes.length + ACCORDS.length)
    expect(getSeenCount()).toBeLessThan(SEEN_TOTAL + 1)
  })
})
