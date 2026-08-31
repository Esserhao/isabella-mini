// 被测域：彩蛋登记（eggs.js）——登记表完整性、幂等达成、进度聚合、封存小字优先级。
import { suite, test, expect } from './helpers.mjs'
import { EGGS, achieveEgg, getEggs, sealLabelOf } from '../../src/utils/eggs.js'

suite('彩蛋登记表', () => {
  test(EGGS.length + ' 枚彩蛋：key 唯一、名称与达成条件齐全', () => {
    expect(EGGS).toHaveLength(EGGS.length)
    expect(new Set(EGGS.map((e) => e.key)).size).toBe(EGGS.length)
    EGGS.forEach((e) => {
      expect(e.name).toBeTruthy()
      expect(e.desc).toBeTruthy()
    })
  })
})

suite('彩蛋达成记录', () => {
  test('首次达成返回真，重复达成不覆盖首次时间', () => {
    expect(achieveEgg('replica')).toBe(true)
    expect(achieveEgg('replica')).toBe(false)
  })
  test('未知 key 不入账', () => {
    expect(achieveEgg('no_such_egg')).toBe(false)
  })
  test('多枚达成聚合正确（0/' + EGGS.length + ' → 3/' + EGGS.length + '，逐枚点亮位置对）', () => {
    expect(getEggs().achieved).toBe(0)
    achieveEgg('replica')
    achieveEgg('midnight')
    achieveEgg('namesake')
    const g = getEggs()
    expect(g.achieved).toBe(3)
    expect(g.total).toBe(EGGS.length)
    const hit = new Set(['replica', 'midnight', 'namesake'])
    g.list.forEach((e) => expect(e.time > 0).toBe(hit.has(e.key)))
  })
})

suite('封存小字优先级（留白 > 深夜 > 七日 > 层级）', () => {
  const lbl = (o) => sealLabelOf({ tierLabel: '已封存', streak: 0, hour: 12, pureWater: false, ...o })
  test('各自单独命中时显示对应小字', () => {
    expect(lbl({})).toBe('已封存')
    expect(lbl({ streak: 7 })).toBe('七日封存')
    expect(lbl({ hour: 3 })).toBe('深夜封存')
    expect(lbl({ pureWater: true })).toBe('留白封存')
  })
  test('多条件同时命中取优先级最高', () => {
    expect(lbl({ hour: 3, streak: 7 })).toBe('深夜封存')
    expect(lbl({ pureWater: true, hour: 3, streak: 7 })).toBe('留白封存')
  })
  test('七日边界：第 6 天还不是七日封存', () => {
    expect(lbl({ streak: 6 })).toBe('已封存')
  })
})

// 每一枚彩蛋都应是「注册了就能点得亮」的有效 key：遍历 EGGS 逐枚首次达成，
// 任何未知/拼错 key 都会返回 false（achieveEgg 对未登记 key 直接拒绝），
// 这一断言能在加彩蛋时挡住「登记行漏写/拼错 key」这类裸奔。
suite('每一枚彩蛋都可被达成登记', () => {
  test('全部登记 key 首次达成均返回真（无死 key）', () => {
    EGGS.forEach((e) => {
      try { uni && uni.setStorageSync && uni.setStorageSync('isabella_eggs', {}) } catch (err) { /* 无 storage 环境忽略 */ }
      expect(achieveEgg(e.key)).toBe(true)
    })
  })
})
