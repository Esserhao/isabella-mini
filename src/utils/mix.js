// ============================================================
// 调香核心算法（从原 lab.js 抽出的纯函数，零 DOM 依赖）
// 阶段1 工坊组件直接 import 使用
// ============================================================
import { ACCORDS, RADAR_LABELS, INGREDIENT_LIBRARY, GU_QUOTES, PERSON_QUOTES, PEER_QUOTES, DAILY_CHALLENGES } from './data.js';

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
export function generateFormula(accordValues) {
    const src = accordValues && typeof accordValues === 'object' ? accordValues : {};
    let total = 0;
    for (const k in src) {
        const v = Number(src[k]);
        if (Number.isFinite(v) && v > 0) total += v;
    }
    if (total <= 0) total = 1;
    const ratio = {};
    for (const k in src) {
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
    return scored.slice(0, 6).map(i => i.name);
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

export function getGuQuote(radarValues, opts = {}) {
    if (opts.random) {
        return RANDOM_QUOTES[Math.floor(Math.random() * RANDOM_QUOTES.length)];
    }
    // 防御：radarValues 非数组 / 空数组时 sorted[0] 为 undefined，会在 .index 上崩
    const arr = Array.isArray(radarValues) ? radarValues : [];
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

// 配方编解码（用于分享参数 / 本地复刻）。优先用 btoa，小程序不支持时降级
export function encodeFormula(accordValues) {
    const parts = ACCORDS.map(a => accordValues[a.key] || 0);
    const str = parts.join(',');
    if (typeof btoa !== 'undefined') {
        try { return btoa(str); } catch (e) { /* fallthrough */ }
    }
    return encodeURIComponent(str);
}

export function decodeFormula(encoded) {
    let str;
    if (typeof atob !== 'undefined') {
        try { str = atob(encoded); } catch (e) { str = decodeURIComponent(encoded); }
    } else {
        str = decodeURIComponent(encoded);
    }
    const parts = str.split(',').map(Number);
    const result = {};
    ACCORDS.forEach((a, i) => { result[a.key] = parts[i] || 0; });
    return result;
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

// 今日挑战是否已完成（封存时写入）。给首页卡片换一套「已完成」文案用。
const KEY_CHALLENGE_DONE = 'isabella_challenge_done';
export function isChallengeDone() {
    try {
        return uni.getStorageSync(KEY_CHALLENGE_DONE) === getTodayKey();
    } catch (e) {
        return false;
    }
}
export function markChallengeDone() {
    try { uni.setStorageSync(KEY_CHALLENGE_DONE, getTodayKey()); } catch (e) { /* 忽略 */ }
}

// 每日挑战评分：用户配方与目标配方余弦相似度
export function scoreDailyChallenge(accordValues, dailyChallenge) {
    if (!dailyChallenge || !dailyChallenge.target) return null;
    const target = dailyChallenge.target;
    const keys = ['citrus', 'floral', 'fruity', 'woody', 'oriental', 'fougere', 'green'];
    let dot = 0, normA = 0, normB = 0;
    keys.forEach(k => {
        const tv = target[k] || 10;
        const av = accordValues[k] || 0;
        dot += tv * av;
        normA += tv * tv;
        normB += av * av;
    });
    const similarity = (normA > 0 && normB > 0) ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
    const score = Math.round(Math.min(95, Math.max(10, similarity * 100)));
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
