// ============================================================
// 彩蛋收藏：全项目彩蛋的总登记处。「我的 → 彩蛋收藏」页读本表渲染。
//
// 彩蛋哲学（与 scripts/audit-egg.mjs 头注一致）：
//   - 彩蛋不是常规反馈：触发靠用户的亲手行为，不靠概率抽卡
//   - 系统铺好的配比（初始化/重置/接力/模板/摇一瓶）绝不触发 —— 闸门在 lab.vue
//   - achieveEgg 幂等：同一彩蛋只记第一次达成时间，重复达成不算「新」
//
// 新增彩蛋三步：
//   1) 在 EGGS 登记表里加一行（key / name / desc=达成条件文案）
//   2) 在触发点调用 achieveEgg(key)，用返回值决定要不要弹「新彩蛋」提示
//   3) 在 scripts/audit-egg.mjs 补场景，别让彩蛋裸奔
// ============================================================

export const EGGS = [
    { key: 'replica',      name: '复刻名香', desc: '亲手把 12 个香调调到与图鉴某瓶逐键相同。随机撞上的概率实测 200 万次 0 命中，只能靠手。' },
    { key: 'self_replica', name: '旧作重现', desc: '亲手调出与自己历史里某瓶逐键相同的配方（刚封存的那瓶不算，隔天再调回来才算）。' },
    { key: 'pure_water',   name: '一瓶留白', desc: '12 个香调全 0 时点封存 —— 把一杯纯水郑重其事地封存进日记。' },
    { key: 'full_palette', name: '十二味全开', desc: '同一次进工坊，12 个香调都被亲手拉到过非 0（套模板、摇一瓶不算）。' },
    { key: 'streak7',      name: '七日不熄', desc: '连续第 7 天都有封存（中断了就从头再攒）。' },
    { key: 'midnight',     name: '深夜调香师', desc: '在凌晨 0 点到 5 点之间封存一瓶香。' },
    { key: 'namesake',     name: '撞名大胆', desc: '亲手给自己的香起一个与图鉴名香一模一样的名字。' },
    { key: 'perfect',      name: '主题正解', desc: '在挑战模式下，以 ≥95 分的契合度封存当日挑战。' }
];

const KEY = 'isabella_eggs';

function readRecord() {
    try {
        const raw = uni.getStorageSync(KEY);
        return (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
    } catch (e) {
        return {};
    }
}

// 达成。幂等：首次达成写入时间戳并返回 true；已达成过返回 false，不覆盖首次时间。
export function achieveEgg(key) {
    if (!EGGS.some((e) => e.key === key)) return false;
    const rec = readRecord();
    if (rec[key]) return false;
    rec[key] = Date.now();
    try { uni.setStorageSync(KEY, rec); } catch (e) { /* 存储异常不影响彩蛋本身 */ }
    return true;
}

// 渲染用：登记表合并达成状态。time 为 0 表示未点亮。
export function getEggs() {
    const rec = readRecord();
    const list = EGGS.map((e) => ({ ...e, time: rec[e.key] || 0 }));
    const achieved = list.filter((e) => e.time).length;
    return { list, achieved, total: list.length };
}

// 卡面「封存小字」（金线下那行）的状态优先级：留白 > 深夜 > 七日 > 层级称号。
// 纯函数：audit-egg.mjs 直接把各种组合跑一遍，改优先级先改这里再补场景。
// 注意「标签」只取一个展示，彩蛋登记在 lab.vue 里按各自条件独立判，
// 两个条件同时满足时两枚都算，只是卡面小字只能印一个。
export function sealLabelOf({ tierLabel, streak, hour, pureWater }) {
    if (pureWater) return '留白封存';
    if (hour < 5) return '深夜封存';
    if (streak >= 7) return '七日封存';
    return tierLabel;
}
