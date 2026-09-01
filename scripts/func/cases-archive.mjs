// ============================================================
// 档案行囊（src/utils/archive.js）功能用例：
// 导出往返、坏档拒收、智能合并（去重并集/取最早/封顶/取大）。
// node scripts/func/run.mjs 一键跑（已挂 npm run audit 尾部）。
// ============================================================
import { suite, test, expect, poke, peek } from './helpers.mjs'
import {
    collectArchive, serializeArchive, parseArchive, describeArchive, mergeArchive
} from '../../src/utils/archive.js'

suite('档案行囊', () => {
    test('空机器导出：往返解析成功，概要全为 0', () => {
        const text = serializeArchive(collectArchive())
        expect(text.startsWith('ISABELLA1|')).toBe(true)
        const p = parseArchive(text)
        expect(p.ok).toBe(true)
        const info = describeArchive(p.archive)
        expect(info.history).toBe(0)
        expect(info.favorites).toBe(0)
        expect(info.eggs).toBe(0)
        expect(info.seen).toBe(0)
        expect(info.sealCount).toBe(0)
        expect(info.streak).toBe(0)
    })

    test('导出往返：各类数据 collect → serialize → parse 数量一致', () => {
        poke('isabella_history', [{ time: 100, name: '松间雪' }, { time: 200, name: '纸鸢' }])
        poke('isabella_favorites', [{ time: 100, name: '松间雪', accords: { citrus: 100 } }])
        poke('isabella_eggs', { first_bottle: 1111 })
        poke('isabella_seen', { perfume: ['a1'], accord: ['x'], note: ['n'] })
        poke('isabella_streak', 4)
        poke('isabella_last_seal', '2026-08-30')
        poke('isabella_seal_count', 12)
        poke('isabella_stats', { enter_lab: 20, seal: 12, _last: 999 })

        const text = serializeArchive(collectArchive())
        const p = parseArchive(text)
        expect(p.ok).toBe(true)
        const info = describeArchive(p.archive)
        expect(info.history).toBe(2)
        expect(info.favorites).toBe(1)
        expect(info.eggs).toBe(1)
        expect(info.seen).toBe(3)
        expect(info.sealCount).toBe(12)
        expect(info.streak).toBe(4)
    })

    test('坏档拒收：空文本/缺标记/校验不符/JSON 损坏，均不写库', () => {
        expect(parseArchive('').ok).toBe(false)
        expect(parseArchive('随便一段话').ok).toBe(false)
        expect(parseArchive('ISABELLA1|0000000|{"v":1}').ok).toBe(false) // 校验码对不上
        const good = serializeArchive(collectArchive())
        expect(parseArchive(good.slice(0, good.length - 3)).ok).toBe(false) // 截断
        // 全部拒收后，本机存储仍是干净的
        expect(peek('isabella_history')).toBe('')
        expect(peek('isabella_favorites')).toBe('')
    })

    test('合并：历史/收藏按 time 去重并集，新的在前', () => {
        poke('isabella_history', [{ time: 100, name: '旧一' }, { time: 200, name: '旧二' }])
        poke('isabella_favorites', [{ time: 100, name: '旧一' }])
        const text = serializeArchive(collectArchive()) // 不可用：本地构造档案更直接
        const archive = { v: 1, t: 1, d: {
            h: [{ time: 200, name: '旧二(远)' }, { time: 300, name: '新三' }, { time: 'bad' }],
            f: [{ time: 400, name: '新藏' }, { time: 100, name: '旧一(远)' }]
        } }
        const r = mergeArchive(archive)
        expect(r.ok).toBe(true)
        expect(r.sum.history).toBe(1)
        expect(r.sum.favorites).toBe(1)
        const h = peek('isabella_history')
        expect(h.map((x) => x.time).join(',')).toBe('300,200,100')
        const f = peek('isabella_favorites')
        expect(f.map((x) => x.time).join(',')).toBe('400,100')
    })

    test('合并：历史满 50 条封顶，最旧的被挤掉', () => {
        const local = []
        for (let i = 1; i <= 50; i++) local.push({ time: i, name: 'n' + i })
        poke('isabella_history', local)
        const archive = { v: 1, t: 1, d: { h: [{ time: 1000, name: '新' }, { time: 1001, name: '新2' }] } }
        const r = mergeArchive(archive)
        expect(r.ok).toBe(true)
        const h = peek('isabella_history')
        expect(h).toHaveLength(50)
        expect(h[0].time).toBe(1001)
        expect(h.some((x) => x.time === 1)).toBe(false) // 最旧被挤出
    })

    test('合并：彩蛋同 key 取最早达成时间', () => {
        poke('isabella_eggs', { first_bottle: 5000 })
        const archive = { v: 1, t: 1, d: { e: { first_bottle: 3000, dawn: 7000 } } }
        const r = mergeArchive(archive)
        expect(r.ok).toBe(true)
        expect(r.sum.eggs).toBe(2)
        const rec = peek('isabella_eggs')
        expect(rec.first_bottle).toBe(3000)
        expect(rec.dawn).toBe(7000)
    })

    test('合并：翻阅记录并集且按各类总数封顶', () => {
        poke('isabella_seen', { perfume: ['p1'] })
        const arr = []
        for (let i = 1; i <= 15; i++) arr.push('p' + i) // 香水总数 11，超出会被截
        const archive = { v: 1, t: 1, d: { s: { perfume: arr, accord: ['c1'] } } }
        const r = mergeArchive(archive)
        expect(r.ok).toBe(true)
        const rec = peek('isabella_seen')
        expect(rec.perfume).toHaveLength(11)
        expect(rec.accord.join(',')).toBe('c1')
    })

    test('合并：连续天数成对取大，累计封存与足迹取多的一边', () => {
        poke('isabella_streak', 3)
        poke('isabella_last_seal', '2026-08-01')
        poke('isabella_seal_count', 5)
        poke('isabella_stats', { enter_lab: 9, seal: 5 })
        const archive = { v: 1, t: 1, d: { k: {
            streak: 7, lastSeal: '2026-08-29', sealCount: 9,
            stats: { enter_lab: 4, seal: 8, share: 2, _last: 1 }
        } } }
        const r = mergeArchive(archive)
        expect(r.ok).toBe(true)
        expect(r.sum.streak).toBe(true)
        expect(r.sum.sealCount).toBe(true)
        expect(peek('isabella_streak')).toBe(7)
        expect(peek('isabella_last_seal')).toBe('2026-08-29')
        expect(peek('isabella_seal_count')).toBe(9)
        const stats = peek('isabella_stats')
        expect(stats.enter_lab).toBe(9) // 本机多，不回退
        expect(stats.seal).toBe(8)
        expect(stats.share).toBe(2)
    })

    test('合并：天数不比本机多时连成对键都不动；版本不对整体拒绝', () => {
        poke('isabella_streak', 5)
        poke('isabella_last_seal', '2026-08-01')
        const r = mergeArchive({ v: 1, t: 1, d: { k: { streak: 5, lastSeal: '2026-08-29' } } })
        expect(r.sum.streak).toBe(false)
        expect(peek('isabella_last_seal')).toBe('2026-08-01')
        expect(mergeArchive({ v: 2, t: 1, d: {} }).ok).toBe(false)
    })
})
