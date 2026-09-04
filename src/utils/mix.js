// ============================================================
// 调香核心算法（从原 lab.js 抽出的纯函数，零 DOM 依赖）
// 阶段1 工坊组件直接 import 使用
// ============================================================
import { ACCORDS, SOLVENT, RADAR_LABELS, INGREDIENT_LIBRARY, GU_QUOTES, PERSON_QUOTES, PEER_QUOTES, DAILY_CHALLENGES, PYRAMID_TIER } from './data.js';

// 12 香调比例 → 6 维雷达值（明亮度/温暖度/甜美度/清冽感/深邃度/轻盈感）
// mode: 'relative'（默认）= 除以自身 6 维最大值，看「这瓶气息的内部结构」；
//       'absolute'          = 除以「单香调拉满时该维的理论上限」，100=该感知维到极致，瓶间可横比。
// 注意：rarity.js 的稀有度采样仍走默认 relative，基准不变，无需重采样。
export function computeRadarValues(accordValues, mode = 'relative') {
    const src = accordValues && typeof accordValues === 'object' ? accordValues : {};
    let total = 0;
    for (const k in src) {
        const v = Number(src[k]);
        if (Number.isFinite(v) && v > 0) total += v;
    }
    if (total <= 0) total = 1;
    const r = {};
    for (const k in src) {
        const v = Number(src[k]);
        r[k] = (Number.isFinite(v) && v > 0) ? v / total : 0;
    }

    const raw = [
        // 明亮度：柑橘 + 绿意 + 水生
        (r.citrus || 0) * 0.8 + (r.green || 0) * 0.3 + (r.aquatic || 0) * 0.4,
        // 温暖度：东方 + 木质 + 香草 + 烟草
        (r.oriental || 0) * 0.8 + (r.woody || 0) * 0.3 + (r.vanilla || 0) * 0.6 + (r.tobacco || 0) * 0.5,
        // 甜美度：果香 + 花香 + 香草
        (r.fruity || 0) * 0.75 + (r.floral || 0) * 0.25 + (r.vanilla || 0) * 0.7,
        // 清冽感：绿意 + 馥奇 + 水生
        (r.green || 0) * 0.7 + (r.fougere || 0) * 0.4 + (r.aquatic || 0) * 0.8,
        // 深邃度：木质 + 东方 + 麝香 + 琥珀 + 烟草
        (r.woody || 0) * 0.7 + (r.oriental || 0) * 0.5 + (r.musk || 0) * 0.6 + (r.amber || 0) * 0.7 + (r.tobacco || 0) * 0.4,
        // 轻盈度：柑橘 + 花香 + 水生
        (r.citrus || 0) * 0.5 + (r.floral || 0) * 0.4 + (r.aquatic || 0) * 0.5
    ];

    if (mode === 'absolute') {
        // 绝对刻度分母：该维度权重向量里单香调单独占比 100% 时的 raw（即该感知维的理论满分）
        const absMax = [0.8, 0.8, 0.75, 0.8, 0.7, 0.5];
        return raw.map((v, i) => Math.min(100, Math.round((v / absMax[i]) * 100)));
    }
    const maxRaw = Math.max(...raw, 0.001);
    return raw.map(v => Math.round((v / maxRaw) * 100));
}

// 香调比例 → 取 6 个最具代表性的香料名（用于卡片"配方"展示）
// 纯水公约：SOLVENT 只是工坊里的稀释中间态，绝不进任何「香味分析」——
// 所以这里把 SOLVENT.key 整个排除掉，既不会污染 total，也不会被当成一味香调。
export function generateFormula(accordValues) {
    const src = accordValues && typeof accordValues === 'object' ? accordValues : {};
    let total = 0;
    for (const k in src) {
        if (k === SOLVENT.key) continue;          // 纯水不计入香气配比
        const v = Number(src[k]);
        if (Number.isFinite(v) && v > 0) total += v;
    }
    // 纯水态（香调全 0，或整瓶只有水）：瓶里没有任何香调，配方留空（封存卡显示「—」），
    // 不能凭空印 6 味香料 —— 名字按分数排序全为 0 时取的是库序前六，纯属幻觉。
    // 排除 SOLVENT 后，纯水整瓶在这里 total 也会是 0，与纯香调全 0 同样走空配方。
    if (total <= 0) return [];
    const ratio = {};
    for (const k in src) {
        if (k === SOLVENT.key) continue;
        const v = Number(src[k]);
        ratio[k] = (Number.isFinite(v) && v > 0) ? v / total : 0;
    }

    const scored = INGREDIENT_LIBRARY.map(ing => {
        let score = 0;
        for (const a in ing.accords) {
            if (ratio[a]) score += ing.accords[a] * ratio[a];
        }
        return { name: ing.name, score };
    });
    scored.sort((a, b) => b.score - a.score);
    // 重名自动归并：同味香料只输出一次（理论上一名一味，这里兜底防脏数据/未来改动）
    const seen = new Set();
    const out = [];
    for (const it of scored) {
        if (seen.has(it.name)) continue;
        seen.add(it.name);
        out.push(it.name);
        if (out.length >= 6) break;
    }
    return out;
}

// ---------- 前中后三调 ----------
// 自配方没有调香师的分层设计，但每味香料的主导香调自带「挥发速度」的暗示：
// 柑橘/绿意/水生这类小分子先冲出来归前调，花香/果香/馥奇撑起中段，
// 前中后调归层：PYRAMID_TIER（12 香调 → top/middle/base）唯一事实源在 data.js，
// 这里只引用不重抄。为什么按味归层而不是按权重拆分：
// 用户封存的是「配方里的这些香料」，不是抽象比例——所以 generatePyramid 把每味
// 香料按它的主导香调丢进某一层（名字进哪层由香料决定，香料跨层细节从简）。

// 反向派生：某一层收着哪些香调 key（按 ACCORDS 顺序）。层释义弹窗的「分类」用它，
// 与 PYRAMID_TIER 永远同源，不存在第二份映射可漂移。
export function tierAccords(tierKey) {
    return ACCORDS.filter((a) => PYRAMID_TIER[a.key] === tierKey).map((a) => a.key);
}

export function generatePyramid(names) {
    const pyr = { top: [], middle: [], base: [] };
    (names || []).forEach((n) => {
        const ing = INGREDIENT_LIBRARY.find((it) => it.name === n);
        if (!ing) return;
        const sorted = Object.entries(ing.accords).sort((a, b) => b[1] - a[1]);
        const main = sorted[0] ? sorted[0][0] : 'woody';
        pyr[PYRAMID_TIER[main] || 'base'].push(n);
    });
    return pyr;
}

// 前中后三层占比：把 12 香调按挥发层加总，摊成和为 100 的整数（最大余数法）。
// 与 generatePyramid 的分工不同——那边把「前 6 味香料」按主导香调归层列名字，
// 受榜单截断影响会整层消失（柑橘系香料常把前六包圆，木质 50% 也可能后调一个
// 名字都不给，层就空了）；这边直接读用户滑块，只要某层真有香调就必有读数，
// 层不再「人间蒸发」。工坊三调行加这组数，正好补上「这瓶前中后各占多少」的缺口。
// 口径：只看 12 香调（SOLVENT 纯水是稀释剂不是气味，不进结构）；
// 归一化到 100 描述「香气内部结构」，浓淡另由 strengthOf 描述。
// 纯水 / 香调全 0 返回 null，调用方据此隐藏整块。
export function tierRatio(accordValues) {
    const src = accordValues && typeof accordValues === 'object' ? accordValues : {};
    const raw = { top: 0, middle: 0, base: 0 };
    ACCORDS.forEach((a) => {
        const tier = PYRAMID_TIER[a.key];
        const v = Number(src[a.key]);
        if (tier && Number.isFinite(v) && v > 0) raw[tier] += v;
    });
    if (raw.top + raw.middle + raw.base <= 0) return null;
    return normalizeTo(raw, 100, ['top', 'middle', 'base']);
}

// 根据雷达最高维挑选古先生台词（random=true 时为随机灵感台词）
const DIM_KEYS = ['brightness', 'warmth', 'sweetness', 'crispness', 'depth', 'airiness'];
const RANDOM_QUOTES = [
    "有时候，最美的香气来自一次意外。这是风替我选的。",
    "我没有预设配方，只是让窗外的风替我选。你闻到了吗，那是偶然的诗。",
    "这支香不属于任何经典，它只属于此刻的你。",
    "命运比调香师更懂平衡。随机反而诞生了意想不到的和谐。",
    "今天风往南吹，我让香气跟着走。你闻到的，是风替你选的路。"
];

// 纯水态（12 轴全 0）：这时候谈「明亮温柔」是瞎说，台词先承认这是一杯水
const PURE_WATER_QUOTES = [
    "现在它只是一杯水。第一味落下去，故事才开始。",
    "清水反而装得下任何方向。你说了算。",
    "水在等它的第一味香。不急。"
];

export function getGuQuote(radarValues, opts = {}) {
    if (opts.random) {
        return RANDOM_QUOTES[Math.floor(Math.random() * RANDOM_QUOTES.length)];
    }
    // 防御：radarValues 非数组 / 空数组时 sorted[0] 为 undefined，会在 .index 上崩
    const arr = Array.isArray(radarValues) ? radarValues : [];
    // 纯水态：一根轴都没亮，读任何「气质」台词都是瞎说——先承认这是一杯水
    const total = arr.reduce((s, v) => s + (Number(v) || 0), 0);
    if (arr.length && total <= 0) return PURE_WATER_QUOTES[Math.floor(Math.random() * PURE_WATER_QUOTES.length)];
    const sorted = arr.map((v, i) => ({ index: i, value: v })).sort((a, b) => b.value - a.value);
    const primaryKey = (sorted[0] && DIM_KEYS[sorted[0].index]) || 'brightness';

    // voice 由 progress.js 的层级决定：调到第 5 瓶起，古先生从「评配方」转向「评你这个人」，
    // 第 20 瓶起当你是同行。同一份雷达数据，说话的层次不同 —— 这是阶梯递进，不新增素材。
    if (opts.voice === 'person' || opts.voice === 'peer') {
        const pool = (opts.voice === 'peer' ? PEER_QUOTES : PERSON_QUOTES)[primaryKey];
        if (pool && pool.length) return pool[Math.floor(Math.random() * pool.length)];
    }

    const quotes = GU_QUOTES[primaryKey] || GU_QUOTES.brightness;
    return quotes[Math.floor(Math.random() * quotes.length)];
}

// 日期键（每日挑战用）
export function getTodayKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

// 今日挑战。首页卡片与「我的」页共用这一处，避免两边各算一遍算出不同结果。
// 用日期的「日」取模挑选，同一天进来永远是同一题。
export function getDailyChallenge() {
    const key = getTodayKey();
    const day = parseInt(key.slice(-2), 10) || 1;
    return DAILY_CHALLENGES[day % DAILY_CHALLENGES.length];
}

// 每日挑战「接受」标记：写入完整挑战对象（含当天日期），供工坊读取后把目标配方铺到滑块。
// 与 setPendingBlend 同一思路（storage 暂存 + 取完即删），但只写不读也能让首页/社区卡片换「已完成」文案。
const KEY_DAILY_TARGET = 'isabella_daily_target';
export function setDailyChallengeTarget(d) {
    if (!d || !d.target) return;
    try {
        uni.setStorageSync(KEY_DAILY_TARGET, {
            theme: d.theme, hint: d.hint, target: d.target, date: getTodayKey()
        });
    } catch (e) { /* 忽略 */ }
}
// 取出即删；若日期不是今天（跨天后残留）则视为失效，避免昨天的挑战污染今天的工坊
export function takeDailyChallengeTarget() {
    try {
        const d = uni.getStorageSync(KEY_DAILY_TARGET);
        uni.removeStorageSync(KEY_DAILY_TARGET);
        if (!d || !d.target) return null;
        if (d.date !== getTodayKey()) return null;
        return d;
    } catch (e) { return null; }
}

// 六维雷达「气息特征」一句话（取最高的两维），给小白一个能读懂的标签，
// 而不是让六个抽象坐标轴自己猜。
// 入参必须是 computeRadarValues 的返回值（6 个数），不是 12 香调对象。
export function radarSummary(values) {
    if (!Array.isArray(values)) return [];
    return values
        .map((v, i) => ({ i, v }))
        .sort((a, b) => b.v - a.v)
        .filter((x) => x.v > 0)
        .slice(0, 2)
        .map((x) => RADAR_LABELS[x.i]);
}

// 今日挑战完成记录（封存时写入）：{ date, score }。
// 给首页/我的页卡片换「已完成」文案，并当天回显「今日 X 分」。
const KEY_CHALLENGE_DONE = 'isabella_challenge_done';
// 兼容旧版只存日期字符串的格式：读到字符串按 { date, score: null } 处理
function readChallengeDone() {
    try {
        const v = uni.getStorageSync(KEY_CHALLENGE_DONE);
        if (!v) return null;
        if (typeof v === 'string') return { date: v, score: null };
        return v && v.date ? v : null;
    } catch (e) {
        return null;
    }
}
export function isChallengeDone() {
    const v = readChallengeDone();
    return !!v && v.date === getTodayKey();
}
// 当天完成记录里的分数；未完成或旧格式（无分数）返回 null
export function getChallengeScore() {
    const v = readChallengeDone();
    return (v && v.date === getTodayKey() && typeof v.score === 'number') ? v.score : null;
}
export function markChallengeDone(score) {
    // 冲分语义：当天已记录更高的分就不回退——上午 88、下午失手 60，
    // 记录仍保持 88，首页「今日 X 分」不被低分刷低；拿到 90 才覆盖。
    // 新分为空（异常路径）也保留已有成绩，不让「已完成」降级成无分数。
    const prev = readChallengeDone();
    const s = typeof score === 'number' ? score : null;
    if (prev && prev.date === getTodayKey()) {
        if (s == null || (prev.score != null && s <= prev.score)) return;
    }
    try { uni.setStorageSync(KEY_CHALLENGE_DONE, { date: getTodayKey(), score: s }); } catch (e) { /* 忽略 */ }
}

// 每日挑战评分：用户配方与目标配方余弦相似度
const CHALLENGE_KEYS = ['citrus', 'floral', 'fruity', 'woody', 'oriental', 'fougere', 'green'];
// 「随手乱调」的参照向量：七味各来一点。用来给分数定 0 分位，见下面 baseline 的说明。
const NEUTRAL = {};
CHALLENGE_KEYS.forEach(k => { NEUTRAL[k] = 1 });

function challengeSimilarity(accordValues, target) {
    let dot = 0, normA = 0, normB = 0;
    CHALLENGE_KEYS.forEach(k => {
        // 目标里没提到的香调按 0 算，不按 10。
        // 写 10 的时候，「绿意与木质为主」这种主题会暗地里要求用户加果香和东方调——
        // 只按提示加绿意的人反而比七味各来一点的人分低，明显不合理。
        const tv = target[k] || 0;
        const av = accordValues[k] || 0;
        dot += tv * av;
        normA += tv * tv;
        normB += av * av;
    });
    return (normA > 0 && normB > 0) ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

export function scoreDailyChallenge(accordValues, dailyChallenge) {
    if (!dailyChallenge || !dailyChallenge.target) return null;
    const target = dailyChallenge.target;
    const similarity = challengeSimilarity(accordValues, target);
    // 余弦相似度对「每味都来一点」的向量天生偏心：即便什么都不像，
    // 七味均分对着任意主题也有 0.55~0.85。直接乘 100 当分数，
    // 用户一进页面就 68~84 分、提示语直接跳到「方向对了，继续调」。
    // 所以把「中性态」重标定成 0 分位（10 分），满分仍是 95：
    // 分数的含义从「有多像」变成「比随手乱调好多少」。
    const baseline = challengeSimilarity(NEUTRAL, target);
    const norm = baseline < 1 ? (similarity - baseline) / (1 - baseline) : 0;
    const score = Math.round(Math.min(95, Math.max(10, 10 + norm * 85)));
    return { score, theme: dailyChallenge.theme };
}

// 由香调 key→value 对象，生成"主调 + 排序香调列表"
export function summarizeAccords(accordValues) {
    const rows = ACCORDS
        .map(a => ({ key: a.key, label: a.label, val: accordValues[a.key] || 0 }))
        .filter(r => r.val > 0)
        .sort((a, b) => b.val - a.val);
    return {
        top: rows[0] || null,
        list: rows
    };
}

// 取数值最高的 n 个香调，拼成「柑橘调·木质调」式描述。
// 用于未起名香水的分享标题 / 分享图主标题兜底，避免印出「未命名香氛」。
export function topAccordDesc(accordValues, n = 2) {
    const rows = ACCORDS
        .map(a => ({ label: a.label, val: accordValues[a.key] || 0 }))
        .filter(r => r.val > 0)
        .sort((a, b) => b.val - a.val);
    const top = rows.slice(0, n).map(r => r.label + '调');
    return top.length ? top.join('·') : '调香';
}

// 随机香名生成器（封存时若未起名，自动起一个，让分享标题有钩子）
export function genPerfumeName() {
    const A = ['雨夜', '海盐', '雾中', '旧信', '山茶', '琥珀', '雪松', '月光', '清晨', '街角', '暮色', '远山', '潮汐', '青苔', '星光', '白昼', '纸鸢', '薄暮'];
    const B = ['图书馆', '独奏', '情人', '旅人', '告别', '舞会', '告白', '车站', '书桌', '窗台', '花园', '海岸', '微光', '回声', '信笺', '小夜曲', '理发店', '咖啡馆'];
    return A[Math.floor(Math.random() * A.length)] + B[Math.floor(Math.random() * B.length)];
}

// 归一化：最大余数法，保证 12 项都是整数、总和恰好 100。
// 直接 Math.round 会凑不满 100（99 或 101 都出过），滑块上方显示的总和就对不上。
export function normalizeAccords(rawObj) {
    return normalizeTo(rawObj, 100, ACCORDS.map(a => a.key));
}

// 归一化的一般形式：把指定 keys 按比例摊成整数，且总和恰好等于 total。
// 只在模块内用——randomAccords 要留纯水时，得把 12 香调按 (100 - 水) 重新摊一次。
// 抽出来而不是复制一份，是为了让两处的取整规则永远一致（都是最大余数法）。
function normalizeTo(rawObj, total, keys) {
    const sum = keys.reduce((s, k) => s + (Number(rawObj[k]) || 0), 0);
    const out = {};
    if (sum <= 0) {
        keys.forEach(k => { out[k] = 0; });
        out[keys[0]] = total;
        return out;
    }
    const exact = keys.map(k => (Number(rawObj[k]) || 0) / sum * total);
    const floors = exact.map(Math.floor);
    let remainder = total - floors.reduce((s, v) => s + v, 0);
    const order = exact
        .map((v, i) => ({ i, frac: v - Math.floor(v) }))
        .sort((a, b) => b.frac - a.frac);
    for (let j = 0; j < order.length && remainder > 0; j++, remainder--) {
        floors[order[j].i] += 1;
    }
    keys.forEach((k, i) => { out[k] = floors[i]; });
    return out;
}

// 空白起点：纯水占满 100%，12 个香调全为 0。
// 首次进工坊、点「重置」、接受每日挑战都用它。
//
// 历史上有两个错的版本：
// 1) 直接把挑战目标铺进滑块（applyRestore({ accords: c.target })），
//    等于把答案抄上去，16 个主题进页面一律 95%，挑战送分。
// 2) 平均基底（12 味各 8%）。不会再送分，但起始相似度仍有 68%~84%，
//    一进门就提示「方向对了」，而且 12 根滑块没有一根是干净的。
// 纯水起步两者都解决：香调确实全 0，雷达收缩在原点，
// 而总和仍是 100（水占着），所以拖动时是从水里置换，不是从别的香调里抢。
export function blankBlend() {
    const out = {};
    ACCORDS.forEach(a => { out[a.key] = 0; });
    out[SOLVENT.key] = 100;
    return out;
}

// 浓淡：纯水剩多少决定这瓶香闻起来有多重（香调占比 = 100 - 纯水）。
// 档位名刻意口语化——不出现香精/古龙水这类行业词，小白一眼能懂；
// 只影响纯水滑块下的一行提示，不参与雷达、评分等任何行为。
//
// 阈值是对着「滑块怎么用」定的，不是对着真实香水的香精占比定的。
// 旧表照搬了行业刻度（EDT 5-15% / EDP 15-20%），于是 25 就偏浓、40 就浓郁，
// 「浓郁」一个档吃掉整条轴的 60%——手动配个方子（主调 30 + 辅调 20）必然浓郁，
// 而摇一瓶/图鉴接力把纯水归 0 后 essence 恒为 100，档位对它们完全没区分度。
// 界面里纯水是「瓶子里的空位」，那浓郁就该接近水让光，所以按实际落点重划：
// 日常调香落在 35-59 这一段的「适中」，把水拖到只剩两成以下才算浓郁。
export function strengthOf(blend) {
    const essence = Math.max(0, Math.min(100, 100 - (Number(blend && blend[SOLVENT.key]) || 0)));
    const table = [
        { min: 80, name: '浓郁', desc: '水几乎让光了，一点味道就很饱满' },
        { min: 60, name: '偏浓', desc: '存在感强，靠近就能闻到全部' },
        { min: 35, name: '适中', desc: '日常刚刚好，最顺手的一档' },
        { min: 15, name: '清淡', desc: '清爽干净，适合白天和夏天' },
        { min: 1, name: '若有似无', desc: '很轻很轻，一两个小时就散了' }
    ];
    const hit = table.find(t => essence >= t.min);
    return {
        essence,
        name: hit ? hit.name : '还是清水',
        desc: hit ? hit.desc : '还没加任何香调，先拖一根试试'
    };
}

// 纯随机配比：每一瓶都是现摇的，不从图鉴里挑。
//
// 别写成「12 个键各随机 0-100 再归一化」——那样每项的数学期望都是 8.3，
// 实测抽两万次，最大单项中位数只有 15、12 项几乎全非零，
// 每瓶都是「十二味各来一点」的大杂烩，抽十次长得都差不多，按钮等于白做。
// 真实香水都有明确主调（图鉴里木质最高到 78、花香到 52），
// 所以这里先随机定 2~4 个主调吃掉 62%~85%，余量再分给 0~3 个辅调。
//
// solvent：留多少纯水（0~60）。默认 0 = 12 香调归一到 100、不含纯水键，
// 与改之前逐键一致。首页/工坊的「摇一瓶」传 15~25，让摇出来的瓶子留点水——
// 否则纯水恒为 0、essence 恒为 100，浓淡那行永远显示「浓郁」，等于没有信息。
// 图鉴接力、套模板、每日挑战都不走这里：它们的配比要和图鉴逐键相等，
// 掺一点水进去「调出这一瓶」的复刻彩蛋就再也调不出来了。
export function randomAccords(solvent = 0) {
    const keys = ACCORDS.map(a => a.key);
    const pool = keys.slice().sort(() => Math.random() - 0.5);
    const mainCount = 2 + Math.floor(Math.random() * 3);   // 2~4 个主调
    const mains = pool.slice(0, mainCount);
    const subCount = Math.floor(Math.random() * 4);        // 0~3 个辅调
    const subs = pool.slice(mainCount, mainCount + subCount);

    const raw = {};
    keys.forEach(k => { raw[k] = 0; });

    const mainTotal = 62 + Math.random() * 23;             // 主调合计 62%~85%
    const w = mains.map(() => 0.35 + Math.random());
    const wSum = w.reduce((s, v) => s + v, 0);
    mains.forEach((k, i) => { raw[k] = w[i] / wSum * mainTotal; });

    if (subs.length) {
        const subTotal = 100 - mainTotal;
        const w2 = subs.map(() => 0.35 + Math.random());
        const w2Sum = w2.reduce((s, v) => s + v, 0);
        subs.forEach((k, i) => { raw[k] = w2[i] / w2Sum * subTotal; });
    } else {
        raw[mains[0]] += 100 - mainTotal;   // 没有辅调时余量全归第一主调
    }
    const out = normalizeAccords(raw);
    const water = Math.max(0, Math.min(60, Math.round(Number(solvent) || 0)));
    if (water <= 0) return out;
    // 香调整体缩到 (100 - water)，余下的额度归纯水。
    // 主次结构不受影响——缩放是等比的，主调仍吃香调部分的 62%~85%。
    const scaled = normalizeTo(out, 100 - water, keys);
    scaled[SOLVENT.key] = water;
    return scaled;
}

// 「摇一瓶」留多少纯水：15~25，每次现摇。
// 放在这里而不是各页面各写一遍，是为了首页和工坊共用同一个口径——
// 否则两处各摇各的，从首页摇进工坊和直接在工坊摇，浓淡手感会不一样。
export function shakeSolvent() {
    return 15 + Math.floor(Math.random() * 11);
}

// 完全复刻检测：12 个香调的数值逐个相同，才算「调出了这一瓶」。
// 图鉴的 accords 和滑块都是整数、总和都是 100，逐键直接比即可。
//
// 这是彩蛋，不是常规反馈：随机撞上的概率实测为 200 万次 0 命中，
// 主要靠用户手动把滑块调成和某瓶一模一样。
// 调用方必须自己挡掉「系统铺好的配比」——初始化/重置用的是图鉴第一瓶，
// 还原图鉴接力时逐键也完全相等，不设闸的话一进工坊就会弹。
export function findExactMatch(accordValues, list) {
    if (!accordValues || !list || !list.length) return null;
    for (const p of list) {
        if (!p.accords) continue;
        let same = true;
        for (const a of ACCORDS) {
            if ((Number(accordValues[a.key]) || 0) !== (Number(p.accords[a.key]) || 0)) {
                same = false;
                break;
            }
        }
        if (same) return p;
    }
    return null;
}

// 文本显示宽度：汉字/全角算 1，ASCII 字母数字半角标点算 0.5（窄一半）。
// 一把尺三处用：香名/感言的长度限制（英文数字名公平限额）、
// iOS 拼音组合期间的字数虚高（拼音按半宽计）、封存卡画布的截断。
// 小程序没有 composition 事件，无法感知「正在打拼音」，只能从计量口径上绕。
export function textWidth(s) {
    let w = 0;
    const str = String(s || '');
    for (const ch of str) {
        w += ch.charCodeAt(0) < 128 ? 0.5 : 1;
    }
    return w;
}

// 按显示宽度截断文本，超宽补省略号（用于画布等不能换行的场景）。
// 宽度落在 0.5 步进上，最后一个 ASCII 字符恰好到限不截。
export function clipTextWidth(s, maxW) {
    const str = String(s || '');
    if (textWidth(str) <= maxW) return str;
    let w = 0;
    let out = '';
    for (const ch of str) {
        const cw = ch.charCodeAt(0) < 128 ? 0.5 : 1;
        if (w + cw > maxW) break;
        w += cw;
        out += ch;
    }
    return out + '…';
}
