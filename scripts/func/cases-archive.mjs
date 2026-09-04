// ============================================================
// 档案行囊（src/utils/archive.js）功能用例：
// 导出往返、坏档拒收、智能合并（去重并集/取最早/封顶/取大）。
// node scripts/func/run.mjs 一键跑（已挂 npm run audit 尾部）。
// ============================================================
import { suite, test, expect, poke, peek } from './helpers.mjs'
import {
    collectArchive, serializeArchive, parseArchive, describeArchive, mergeArchive
} from '../../src/utils/archive.js'
import { galleryPerfumes } from '../../src/utils/data.js'

suite('档案行囊', () => {
    test('空机器导出：往返解析成功，概要全为 0，走压缩格式 ISABELLA2', () => {
        const text = serializeArchive(collectArchive())
        expect(text.startsWith('ISABELLA2|')).toBe(true)
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

    test('坏档拒收：空文本/缺标记/校验不符/压缩损坏，均不写库', () => {
        expect(parseArchive('').ok).toBe(false)
        expect(parseArchive('随便一段话').ok).toBe(false)
        expect(parseArchive('ISABELLA1|0000000|{"v":1}').ok).toBe(false) // 校验码对不上
        expect(parseArchive('ISABELLA2|0000000|AAAA').ok).toBe(false) // 校验码对不上
        const good = serializeArchive(collectArchive())
        expect(parseArchive(good.slice(0, good.length - 3)).ok).toBe(false) // 截断
        const tampered = good.slice(0, -1) + (good.endsWith('A') ? 'B' : 'A') // 改末字符
        expect(tampered).not.toBe(good)
        expect(parseArchive(tampered).ok).toBe(false)
        // 全部拒收后，本机存储仍是干净的
        expect(peek('isabella_history')).toBe('')
        expect(peek('isabella_favorites')).toBe('')
    })

    test('压缩往返：配比按非 0 项带走，回来重建全 12 香调并现算 formula', () => {
        const accords = { citrus: 30, woody: 70 }
        poke('isabella_history', [{
            time: 1000, name: '松间雪', accords,
            formula: ['不该带走的旧配方'], quote: '松风入盏', origin: 'tpl:x', note: '感言'
        }])
        const text = serializeArchive(collectArchive())
        expect(text.length).toBeLessThan(400) // 单条记录的档案应很短
        const p = parseArchive(text)
        expect(p.ok).toBe(true)
        const h = p.archive.d.h[0]
        expect(h.time).toBe(1000)
        expect(h.name).toBe('松间雪')
        expect(h.quote).toBe('松风入盏')
        expect(h.origin).toBe('tpl:x')
        expect(h.note).toBe('感言')
        expect(h.accords.citrus).toBe(30)
        expect(h.accords.woody).toBe(70)
        expect(Object.keys(h.accords).length).toBe(12) // 0 补齐
        expect(Array.isArray(h.formula)).toBe(true) // formula 现算重建
        expect(h.formula).not.toEqual(['不该带走的旧配方'])
    })

    test('旧版兼容：ISABELLA1 纯 JSON 档案仍可导入', () => {
        const json = JSON.stringify({ v: 1, t: 1, d: { e: { first_bottle: 123 } } })
        let hsh = 5381
        for (let i = 0; i < json.length; i++) hsh = ((hsh * 33) ^ json.charCodeAt(i)) >>> 0
        const text = 'ISABELLA1|' + hsh.toString(36).padStart(7, '0') + '|' + json
        const p = parseArchive(text)
        expect(p.ok).toBe(true)
        expect(describeArchive(p.archive).eggs).toBe(1)
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

    test('合并：满仓且档案全更旧时 added 为 0、dropped 如实计数（截断提示数据源）', () => {
        // 本机历史已满 50 条，档案里全是更旧的记录：一条都进不去
        const local = []
        for (let i = 1; i <= 50; i++) local.push({ time: i * 100, name: 'n' + i })
        poke('isabella_history', local)
        const archive = { v: 1, t: 1, d: { h: [
            { time: 10, name: '旧一' }, { time: 20, name: '旧二' }, { time: 30, name: '旧三' }
        ] } }
        const r = mergeArchive(archive)
        expect(r.ok).toBe(true)
        expect(r.sum.history).toBe(0) // 全部被 cap 顶掉，不能虚报「并进 3 瓶」
        expect(r.sum.dropped.history).toBe(3) // 但这 3 条是档案里没进全的，UI 要说明
        expect(peek('isabella_history')).toHaveLength(50) // 本机列表原样保留
        expect(peek('isabella_history')[0].time).toBe(5000)
    })

    test('合并：半仓时新旧档案混合——新进的算 added，被 cap 挤掉的算 dropped', () => {
        // 本机 48 条 + 档案 5 条（3 新 2 旧，旧的全被 50 上限顶掉）
        const local = []
        for (let i = 1; i <= 48; i++) local.push({ time: i * 100, name: 'n' + i })
        poke('isabella_history', local)
        const archive = { v: 1, t: 1, d: { h: [
            { time: 6000, name: '新三' }, { time: 6100, name: '新四' }, { time: 6200, name: '新五' },
            { time: 10, name: '旧甲' }, { time: 20, name: '旧乙' }
        ] } }
        const r = mergeArchive(archive)
        expect(r.ok).toBe(true)
        expect(r.sum.history).toBe(3)  // 3 条新的进来了
        expect(r.sum.dropped.history).toBe(2) // 2 条旧的没能并进
        const h = peek('isabella_history')
        expect(h).toHaveLength(50) // 合并后仍封顶 50
        expect(h.some((x) => x.time === 10)).toBe(false)
        expect(h.some((x) => x.time === 6200)).toBe(true)
    })

    test('合并：收藏满 100 时 dropped.favorites 分列计数', () => {
        const local = []
        for (let i = 1; i <= 100; i++) local.push({ time: i, name: 'f' + i })
        poke('isabella_favorites', local)
        const archive = { v: 1, t: 1, d: { f: [
            { time: 50, name: '重复(不计数)' }, { time: 0.5, name: '比全部更旧(被顶掉)' }
        ] } }
        const r = mergeArchive(archive)
        expect(r.ok).toBe(true)
        expect(r.sum.favorites).toBe(0)
        expect(r.sum.dropped.favorites).toBe(1) // time:0.5 没进；time:50 重复不算 dropped
        expect(peek('isabella_favorites')).toHaveLength(100)
        expect(peek('isabella_favorites').some((x) => x.time === 0.5)).toBe(false)
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
        // 上限随香水库走（现在 16 款），写死数字会在补录名香时假红
        for (let i = 1; i <= 20; i++) arr.push('p' + i) // 超出总数会被截
        const archive = { v: 1, t: 1, d: { s: { perfume: arr, accord: ['c1'] } } }
        const r = mergeArchive(archive)
        expect(r.ok).toBe(true)
        const rec = peek('isabella_seen')
        expect(rec.perfume).toHaveLength(galleryPerfumes.length)
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
