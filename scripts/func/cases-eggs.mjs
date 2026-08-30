// 被测域：彩蛋登记（eggs.js）——登记表完整性、幂等达成、进度聚合、封存小字优先级。
import { suite, test, expect } from './helpers.mjs'
import { EGGS, achieveEgg, getEggs, sealLabelOf } from '../../src/utils/eggs.js'

suite('彩蛋登记表', () => {
  test('8 枚彩蛋：key 唯一、名称与达成条件齐全', () => {
    expect(EGGS).toHaveLength(8)
    expect(new Set(EGGS.map((e) => e.key)).size).toBe(8)
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
  test('多枚达成聚合正确（0/8 → 3/8，逐枚点亮位置对）', () => {
    expect(getEggs().achieved).toBe(0)
    achieveEgg('replica')
    achieveEgg('midnight')
    achieveEgg('namesake')
    const g = getEggs()
    expect(g.achieved).toBe(3)
    expect(g.total).toBe(8)
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
