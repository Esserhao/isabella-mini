// 被测域：用户数据的增删改（收藏 / 连签 / 封存阶梯 / 埋点）+ 内容审查 + 教程状态机。
// 历史列表的增删目前在 lab/history 页内联，无独立模块可测；删除按钮走 storage
// filter 的行为由历史页自测覆盖不到，这里测的是同构的 favorites 删除路径。
import { suite, test, expect, peek, poke, dateStr } from './helpers.mjs'
import { toggleFav, removeFav, getFavorites, isFaved } from '../../src/utils/favorites.js'
import { recordSeal, getStreak } from '../../src/utils/streak.js'
import { bumpSealCount, tierOf, nextTierGap } from '../../src/utils/progress.js'
import { track, getStats } from '../../src/utils/analytics.js'
import { moderateText } from '../../src/utils/moderate.js'

suite('收藏（含删除按钮的存储路径）', () => {
  test('收藏 → 已收藏 → 取消，逐态正确', () => {
    const item = { time: 1000, name: '雨夜图书馆', accords: { citrus: 100 } }
    expect(isFaved(1000)).toBe(false)
    expect(toggleFav(item)).toBe(true)
    expect(isFaved(1000)).toBe(true)
    expect(getFavorites()).toHaveLength(1)
    expect(toggleFav(item)).toBe(false)
    expect(getFavorites()).toHaveLength(0)
  })
  test('缺 time 的条目拒绝入收藏（收藏以封存时间为主键）', () => {
    // 三态契约：true=已收藏 / false=已取消 / null=写失败或非法入参（缺 time 属非法入参）
    expect(toggleFav({ name: '无主之香' })).toBe(null)
  })
  test('removeFav 按 time 精确删除，不动别人', () => {
    toggleFav({ time: 1, name: 'a' })
    toggleFav({ time: 2, name: 'b' })
    removeFav(1)
    expect(getFavorites()).toHaveLength(1)
    expect(getFavorites()[0].time).toBe(2)
  })
})

suite('连续封存（streak）', () => {
  test('首封为 1，当天重复封存不涨', () => {
    expect(recordSeal()).toBe(1)
    expect(recordSeal()).toBe(1)
  })
  test('昨天封过 → 今天连上，+1（第 7 天在此跨过彩蛋线）', () => {
    poke('isabella_last_seal', dateStr(-1))
    poke('isabella_streak', 6)
    expect(recordSeal()).toBe(7)
  })
  test('断档两天 → 重新从 1 计', () => {
    poke('isabella_last_seal', dateStr(-2))
    poke('isabella_streak', 9)
    expect(recordSeal()).toBe(1)
  })
  test('隔天未封 → 展示归零（钩子不撒谎）', () => {
    poke('isabella_last_seal', dateStr(-2))
    poke('isabella_streak', 9)
    expect(getStreak()).toBe(0)
  })
})

suite('封存阶梯', () => {
  test('第 1~2 瓶不弹解锁', () => {
    expect(bumpSealCount().leveledUp).toBe(false)
    expect(bumpSealCount().leveledUp).toBe(false)
  })
  test('第 3 瓶升「学徒调香师」并带解锁文案', () => {
    bumpSealCount()
    bumpSealCount()
    const third = bumpSealCount()
    expect(third.count).toBe(3)
    expect(third.leveledUp).toBe(true)
    expect(third.tier.key).toBe('apprentice')
    expect(third.unlock).toBeTruthy()
  })
  test('100 瓶封顶「半个主人」，再无下一档', () => {
    expect(tierOf(100).key).toBe('half_owner')
    expect(nextTierGap(100)).toBe(null)
  })
  test('进度提示：0 瓶差 3 瓶升学徒', () => {
    expect(nextTierGap(0).need).toBe(3)
    expect(nextTierGap(0).title).toBe('学徒调香师')
  })
})

suite('埋点', () => {
  test('同名事件累加', () => {
    track('seal')
    track('seal')
    expect(getStats().seal).toBe(2)
  })
  test('脏存储（历史版本写过字符串）推平重来，不静默失效', () => {
    poke('isabella_stats', '脏数据')
    track('seal')
    expect(getStats().seal).toBe(1)
  })
})

suite('内容审查（本地粗筛）', () => {
  test('命中敏感词拦截', () => {
    expect(moderateText('你就是个傻逼').pass).toBe(false)
  })
  test('正常文案与空文案放行', () => {
    expect(moderateText('像雨后的青草').pass).toBe(true)
    expect(moderateText('   ').pass).toBe(true)
  })
})

// 教程状态机依赖 vue 的 reactive —— Node 直连 vue 可能踩打包标记，
// 失败就整组跳过并留痕，不阻塞其余功能测试。
let tutMod = null
try {
  tutMod = await import('../../src/utils/tutorial.js')
} catch (e) {
  console.log(`  ⚠️  tutorial.js 在 Node 下不可加载（${e.message.split('\n')[0]}），教程状态机组跳过`)
}
if (tutMod) {
  const { tut, startTour, finishTour, nextStep } = tutMod
  suite('教程状态机', () => {
    test('第 4 步及以后结束 → 完成标记 + 工坊蒙层标记一起写', () => {
      startTour()
      expect(tut.active).toBe(true)
      nextStep()
      nextStep()
      nextStep()
      finishTour()
      expect(tut.active).toBe(false)
      // gu_tour_done 孤儿键已移除（只写不读），不再写入
      expect(peek('gu_tour_done')).toBe('')
      expect(peek('gu_lab_guided')).toBe(1)
    })
    test('首页就早退（index<3）→ 不算看过工坊引导', () => {
      startTour()
      finishTour()
      expect(peek('gu_tour_done')).toBe('')
      expect(peek('gu_lab_guided')).toBe('')
    })
    test('nextStep 推进，最后一步 finishTour 收尾', () => {
      startTour()
      nextStep()
      expect(tut.index).toBe(1)
      finishTour()
      expect(tut.active).toBe(false)
    })
  })
}
