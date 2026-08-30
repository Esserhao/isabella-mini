// ============================================================
// 香调（从原 config.js 零改造迁移，ES Module 导出）
// ============================================================
export const ACCORDS = [
    { key: 'citrus', label: '柑橘', description: '酸、甜、明亮。像早晨剥开一颗橙子的第一口气。', image: 'https://images.unsplash.com/photo-1610397962076-02407a169a5b?w=400&h=500&fit=crop' , typicalIngredients: ['佛手柑', '柠檬', '青柠', '葡萄柚', '橙花', '苦橙', '橘子', '香柠檬', '柚子', '血橙'] },
    { key: 'floral', label: '花香', description: '花园的、柔软的。所有与花有关的联想，约会、葬礼、或者只是路过。', image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=500&fit=crop' , typicalIngredients: ['玫瑰', '茉莉', '晚香玉', '依兰依兰', '紫罗兰', '铃兰', '栀子花', '小苍兰', '桂花', '百合'] },
    { key: 'fruity', label: '果香', description: '不一定是甜的。有时候是酸的，有时候是酸的你还想吃。', image: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&h=500&fit=crop' , typicalIngredients: ['桃子', '黑醋栗', '覆盆子', '草莓', '苹果', '梨', '杏', '芒果', '菠萝', '无花果'] },
    { key: 'woody', label: '木质', description: '像一间老木屋。沉稳、有故事、不急着被理解。', image: 'https://images.unsplash.com/photo-1543092580-7a3ae1e4b36d?w=400&h=500&fit=crop' , typicalIngredients: ['檀木', '雪松', '广藿香', '沉香木', '黑檀木', '柏木', '松木', '橡木', '桦木', '冷杉'] },
    { key: 'oriental', label: '东方', description: '温暖的、带异情的。香料市场上空飘着的那些东西。', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=500&fit=crop' , typicalIngredients: ['香草', '琥珀', '肉桂', '丁香', '乳香', '没药', '可可', '咖啡', '姜', '胡椒'] },
    { key: 'fougere', label: '馥奇', description: '薰衣草的 cousin。古典、干净、有点老派但不过时。', image: 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=400&h=500&fit=crop' , typicalIngredients: ['薰衣草', '橡木苔', '天竺葵', '鼠尾草', '迷迭香', '百里香', '薄荷', '罗勒'] },
    { key: 'green', label: '绿意', description: '草叶、树汁、雨后的植物。比花香更清醒，比木质更年轻。', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=500&fit=crop' , typicalIngredients: ['无花果叶', '紫罗兰叶', '青草', '常青藤', '松针', '茶树', '竹叶', '黄瓜'] },
    { key: 'musk', label: '麝香', description: '皮肤的味道。隐约的、暧昧的、喷了让人想靠近。', image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400&h=500&fit=crop' , typicalIngredients: ['白麝香', '鹿麝香', '合成麝香', '粉香麝香', '灵猫香', '龙涎香'] },
    { key: 'amber', label: '琥珀', description: '暖的、树脂感的。像冬天的壁炉，不一定有火，但你知道暖。', image: 'https://images.unsplash.com/photo-1518481612222-68bbe828ecd1?w=400&h=500&fit=crop' , typicalIngredients: ['安息香', '秘鲁香脂', '苏合香', '劳丹脂', '肉桂皮'] },
    { key: 'vanilla', label: '香草', description: '甜但不腻的那种。像做蛋糕时打开烤箱的那一秒。', image: 'https://images.unsplash.com/photo-1573575155376-b5010099301b?w=400&h=500&fit=crop' , typicalIngredients: ['马达加斯加香草', '大溪地香草', '香豆素', '零陵香豆', '焦糖', '蜂蜜'] },
    { key: 'tobacco', label: '烟草', description: '成熟、微苦、带点烟熏感。像你爸的夹克，如果他不抽烟的话。', image: 'https://images.unsplash.com/photo-1521305916504-4a1121188589?w=400&h=500&fit=crop' , typicalIngredients: ['弗吉尼亚烟草', '土耳其烟草', '干草', '零陵香豆烟草', '蜂蜜烟草', '可可烟草'] },
    { key: 'aquatic', label: '水生', description: '水的味道。不是游泳池，是海、是湖、是下过雨的河。', image: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=400&h=500&fit=crop',
    typicalIngredients: ['海藻', '海水', '西瓜酮', '莲花', '荷花'],
    },
];

// 六维雷达释义：小白向，解释每个抽象维度代表什么（按 RADAR_LABELS 的中文标签索引）
export const RADAR_DIM_DESC = {
  '明亮度': '一鼻子上去就「亮」起来的感觉，像柑橘、清晨阳光，让人精神。',
  '温暖度': '贴着皮肤的暖意，像东方调、香草、木质，抱团的安全感。',
  '甜美度': '好吃又愉悦的甜，来自果香、花香、香草，约会与好心情。',
  '清冽感': '凉凉的、清醒的，像绿意、水生、薄荷，夏天的一阵风。',
  '深邃度': '沉得下去、有层次，像木质、麝香、烟草，越闻越有故事。',
  // 键名必须与 RADAR_LABELS 里的第 6 项逐字一致。
  // 曾写成「轻盈度」，查表落空、弹窗里这一维只剩标题没有说明——改标签名时记得同步改这里。
  '轻盈感': '没有负担的轻，像薄纱、皂感、白麝香，像一阵微风拂过。'
};

// ============================================================
// 香料库（65种）， 按需加载结构
// ============================================================
export var _ingredientLibCache = null;
export function getIngredientLibrary() {
    if (_ingredientLibCache) return _ingredientLibCache;
    try {
        _ingredientLibCache = INGREDIENT_LIBRARY;
    } catch(e) { _ingredientLibCache = []; }
    return _ingredientLibCache;
}
// 按香调筛选香料
export function getIngredientsByAccord(accordKey) {
    var lib = getIngredientLibrary();
    return lib.filter(function(ing) { return ing.accords[accordKey]; });
}
// ============================================================
export const INGREDIENT_LIBRARY = [
    // 柑橘 (12)
    { name: '佛手柑', accords: { citrus: 0.92, green: 0.08 } },
    { name: '柠檬', accords: { citrus: 0.95 } },
    { name: '青柠', accords: { citrus: 0.90, green: 0.10 } },
    { name: '葡萄柚', accords: { citrus: 0.85, fruity: 0.15 } },
    { name: '橙花', accords: { citrus: 0.70, floral: 0.30 } },
    { name: '苦橙', accords: { citrus: 0.88, woody: 0.12 } },
    { name: '橘子', accords: { citrus: 0.90, fruity: 0.10 } },
    { name: '香柠檬', accords: { citrus: 0.93, green: 0.07 } },
    { name: '柚子', accords: { citrus: 0.82, green: 0.18 } },
    { name: '血橙', accords: { citrus: 0.78, fruity: 0.22 } },
    { name: '香橼', accords: { citrus: 0.88, woody: 0.12 } },
    { name: '莱姆', accords: { citrus: 0.92, green: 0.08 } },
    // 花香 (14)
    { name: '玫瑰', accords: { floral: 0.90, fruity: 0.10 } },
    { name: '茉莉', accords: { floral: 0.85, green: 0.15 } },
    { name: '晚香玉', accords: { floral: 0.88, oriental: 0.12 } },
    { name: '依兰依兰', accords: { floral: 0.80, fruity: 0.20 } },
    { name: '紫罗兰', accords: { floral: 0.75, green: 0.25 } },
    { name: '铃兰', accords: { floral: 0.82, green: 0.18 } },
    { name: '栀子花', accords: { floral: 0.86, fruity: 0.14 } },
    { name: '风信子', accords: { floral: 0.70, green: 0.30 } },
    { name: '小苍兰', accords: { floral: 0.80, fruity: 0.20 } },
    { name: '桂花', accords: { floral: 0.72, fruity: 0.28 } },
    { name: '百合', accords: { floral: 0.85, green: 0.15 } },
    { name: '洋甘菊', accords: { floral: 0.70, green: 0.30 } },
    { name: '水仙', accords: { floral: 0.78, green: 0.22 } },
    { name: '忍冬', accords: { floral: 0.82, fruity: 0.18 } },
    // 果香 (12)
    { name: '桃子', accords: { fruity: 0.85, floral: 0.15 } },
    { name: '黑醋栗', accords: { fruity: 0.80, green: 0.20 } },
    { name: '覆盆子', accords: { fruity: 0.88, floral: 0.12 } },
    { name: '草莓', accords: { fruity: 0.90, floral: 0.10 } },
    { name: '苹果', accords: { fruity: 0.82, green: 0.18 } },
    { name: '梨', accords: { fruity: 0.85, green: 0.15 } },
    { name: '杏', accords: { fruity: 0.80, floral: 0.20 } },
    { name: '芒果', accords: { fruity: 0.78, citrus: 0.22 } },
    { name: '菠萝', accords: { fruity: 0.84, citrus: 0.16 } },
    { name: '无花果', accords: { fruity: 0.70, green: 0.30 } },
    { name: '蜜瓜', accords: { fruity: 0.82, green: 0.18 } },
    { name: '李子', accords: { fruity: 0.86, floral: 0.14 } },
    // 木质 (12)
    { name: '檀木', accords: { woody: 0.90, oriental: 0.10 } },
    { name: '雪松', accords: { woody: 0.85, green: 0.15 } },
    { name: '广藿香', accords: { woody: 0.60, oriental: 0.40 } },
    { name: '沉香木', accords: { woody: 0.70, oriental: 0.30 } },
    { name: '黑檀木', accords: { woody: 0.88, oriental: 0.12 } },
    { name: '柏木', accords: { woody: 0.82, green: 0.18 } },
    { name: '松木', accords: { woody: 0.80, green: 0.20 } },
    { name: '橡木', accords: { woody: 0.78, fougere: 0.22 } },
    { name: '桦木', accords: { woody: 0.75, oriental: 0.25 } },
    { name: '冷杉', accords: { woody: 0.76, green: 0.24 } },
    { name: '枫木', accords: { woody: 0.84, fruity: 0.16 } },
    { name: '乌木', accords: { woody: 0.72, oriental: 0.28 } },
    // 东方 (10)
    { name: '香草', accords: { oriental: 0.80, fruity: 0.20 } },
    { name: '琥珀', accords: { oriental: 0.90, woody: 0.10 } },
    { name: '肉桂', accords: { oriental: 0.85, woody: 0.15 } },
    { name: '丁香', accords: { oriental: 0.82, floral: 0.18 } },
    { name: '乳香', accords: { oriental: 0.88, woody: 0.12 } },
    { name: '没药', accords: { oriental: 0.85, woody: 0.15 } },
    { name: '可可', accords: { oriental: 0.78, fruity: 0.22 } },
    { name: '咖啡', accords: { oriental: 0.80, woody: 0.20 } },
    { name: '姜', accords: { oriental: 0.72, citrus: 0.28 } },
    { name: '胡椒', accords: { oriental: 0.76, woody: 0.24 } },
    // 馥奇 (8)
    { name: '薰衣草', accords: { fougere: 0.85, floral: 0.15 } },
    { name: '橡木苔', accords: { fougere: 0.80, woody: 0.20 } },
    { name: '天竺葵', accords: { fougere: 0.75, floral: 0.25 } },
    { name: '鼠尾草', accords: { fougere: 0.78, green: 0.22 } },
    { name: '迷迭香', accords: { fougere: 0.80, citrus: 0.20 } },
    { name: '百里香', accords: { fougere: 0.76, green: 0.24 } },
    { name: '薄荷', accords: { fougere: 0.70, green: 0.30 } },
    { name: '罗勒', accords: { fougere: 0.72, green: 0.28 } },
    // 绿意 (8)
    { name: '无花果叶', accords: { green: 0.85, fruity: 0.15 } },
    { name: '紫罗兰叶', accords: { green: 0.80, floral: 0.20 } },
    { name: '青草', accords: { green: 0.90, fougere: 0.10 } },
    { name: '常青藤', accords: { green: 0.88, woody: 0.12 } },
    { name: '松针', accords: { green: 0.82, woody: 0.18 } },
    { name: '茶树', accords: { green: 0.78, citrus: 0.22 } },
    { name: '竹叶', accords: { green: 0.86, woody: 0.14 } },
    { name: '黄瓜', accords: { green: 0.84, fruity: 0.16 } },
    // 麝香 (6)
    { name: '白麝香', accords: { musk: 0.92, floral: 0.08 } },
    { name: '鹿麝香', accords: { musk: 0.88, woody: 0.12 } },
    { name: '合成麝香', accords: { musk: 0.95 } },
    { name: '粉香麝香', accords: { musk: 0.85, floral: 0.15 } },
    { name: '灵猫香', accords: { musk: 0.80, oriental: 0.20 } },
    { name: '龙涎香', accords: { musk: 0.70, amber: 0.30 } },
    // 琥珀 (5)
    { name: '安息香', accords: { amber: 0.88, oriental: 0.12 } },
    { name: '秘鲁香脂', accords: { amber: 0.85, woody: 0.15 } },
    { name: '苏合香', accords: { amber: 0.90, vanilla: 0.10 } },
    { name: '劳丹脂', accords: { amber: 0.82, musk: 0.18 } },
    { name: '肉桂皮', accords: { amber: 0.75, oriental: 0.25 } },
    // 香草 (6)
    { name: '马达加斯加香草', accords: { vanilla: 0.92, oriental: 0.08 } },
    { name: '大溪地香草', accords: { vanilla: 0.88, fruity: 0.12 } },
    { name: '香豆素', accords: { vanilla: 0.85, woody: 0.15 } },
    { name: '零陵香豆', accords: { vanilla: 0.90, amber: 0.10 } },
    { name: '焦糖', accords: { vanilla: 0.70, fruity: 0.30 } },
    { name: '蜂蜜', accords: { vanilla: 0.75, fruity: 0.25 } },
    // 烟草 (6)
    { name: '弗吉尼亚烟草', accords: { tobacco: 0.90, woody: 0.10 } },
    { name: '土耳其烟草', accords: { tobacco: 0.88, oriental: 0.12 } },
    { name: '干草', accords: { tobacco: 0.75, green: 0.25 } },
    { name: '零陵香豆烟草', accords: { tobacco: 0.82, vanilla: 0.18 } },
    { name: '蜂蜜烟草', accords: { tobacco: 0.78, fruity: 0.22 } },
    { name: '可可烟草', accords: { tobacco: 0.85, oriental: 0.15 } },
    // 水生 (5)
    { name: '海藻', accords: { aquatic: 0.88, green: 0.12 } },
    { name: '海水', accords: { aquatic: 0.92 } },
    { name: '西瓜酮', accords: { aquatic: 0.90, fruity: 0.10 } },
    { name: '莲花', accords: { aquatic: 0.70, floral: 0.30 } },
    { name: '荷花', accords: { aquatic: 0.78, green: 0.22 } }
];

// ============================================================
// 核心香料（工坊香料模式：12 种，每种对应一个香调）
// ============================================================
export const CORE_INGREDIENTS = [
    { key: 'bergamot', label: '佛手柑', accord: 'citrus', desc: '清新微苦，柑橘调的灵魂' },
    { key: 'rose', label: '玫瑰', accord: 'floral', desc: '浪漫温柔，香水之王' },
    { key: 'peach', label: '桃子', accord: 'fruity', desc: '甜美多汁，少女感满满' },
    { key: 'sandalwood', label: '檀木', accord: 'woody', desc: '温暖木质，沉稳内敛' },
    { key: 'vanilla', label: '香草', accord: 'oriental', desc: '甜蜜温暖，东方调基石' },
    { key: 'lavender', label: '薰衣草', accord: 'fougere', desc: '干净舒缓，经典馥奇' },
    { key: 'grass', label: '青草', accord: 'green', desc: '清新自然，雨后气息' },
    { key: 'white_musk', label: '白麝香', accord: 'musk', desc: '柔软贴肤，若有似无' },
    { key: 'benzoin', label: '安息香', accord: 'amber', desc: '树脂暖香，冬日氛围' },
    { key: 'madagascar_vanilla', label: '马达加斯加香草', accord: 'vanilla', desc: '顶级香草，甜而不腻' },
    { key: 'virginia_tobacco', label: '弗吉尼亚烟草', accord: 'tobacco', desc: '成熟微苦，烟熏质感' },
    { key: 'seaweed', label: '海藻', accord: 'aquatic', desc: '海洋气息，清爽水生' }
];

// ============================================================
// 雷达维度
// ============================================================
export const RADAR_LABELS = ['明亮度', '温暖度', '甜美度', '清冽感', '深邃度', '轻盈感'];

// 六维释义自检：键名和标签对不上时，弹窗里那一维会静默变成「只有标题」。
// 这类错字不会报错、肉眼也容易漏，所以在这里留一条 warn 兜住。
RADAR_LABELS.forEach((lab) => {
  if (!RADAR_DIM_DESC[lab]) console.warn('[data] 六维释义缺失：', lab)
})

// ============================================================
// 古先生台词（真人写的，带偏见、带情绪、带不完美的比喻）
// ============================================================
export const GU_QUOTES = {
    brightness: [
        "说实话第一次闻到的时候我以为是芒果沙冰。但多闻几下才发现，它比芒果聪明，它知道自己不该太甜。",
        "有人说这支香像阳光。我觉得不对。阳光太正派了，这支香是那种躲在窗帘后面偷看你的光。",
        "柑橘调最怕的就是廉价洗洁精味。你这个不一样，它酸得很高傲，像有人在你面前捏碎了一颗青柠然后转身走了。",
        "我试过很多柑橘调的香水，大部分像给房子消毒。你这支不是，它像有人在你桌上放了一碗刚剥开的橙子，然后什么都没说就走了。",
        "明亮但不刺眼，这个分寸感很少有调香师能拿捏。你做到了，而且你好像没太费力。",
        "开头有点冲，但不是那种让人皱眉的冲。是那种让你愣一下然后忍不住再闻一次的冲。",
        "我朋友说这支香像她奶奶家的柠檬树。我不知道她奶奶家什么样，但我觉得这是很高的评价。",
        "如果你非要我用一句话形容：这支香是那种会在凌晨四点叫醒你然后带你去山顶看日出的香水。",
        "它不是闪闪发光的那种明亮，它是那种柔和到你几乎忘了它存在的光。然后你突然意识到，你已经依赖它了。",
        "我在格拉斯晒过很多太阳，但从来没有哪一次像这支香这样，让我觉得太阳是有味道的。"
    ],
    warmth: [
        "这支香让我想起前任的毛衣。不是那种怀念的想起，是那种'原来温暖也可以这么具体'的想起。",
        "说实话我以为檀木会很老气。但你配了香草之后，它突然变得很……懂事？像那种不会说废话但会在你难过时坐在你旁边的人。",
        "琥珀这种东西，用好了是壁炉，用砸了是药房。你用的是壁炉那一款，而且壁炉里还烧着果木。",
        "第一次喷的时候我皱了皱眉，太暖了，暖得有点侵略性。但过了十分钟它软下来了，像个倔强的人终于放下了防备。",
        "我有个很挑的朋友从来不夸香水。但这支他闻了之后说'嗯'。就一个字。但那是他给过的最高的评价。",
        "温暖调太容易做成甜腻的奶油蛋糕了。你这支是烤过的面包，有焦香，有层次，你知道它是粮食不是甜点。",
        "它的暖不是那种你穿了很多衣服的暖，是那种你只穿了一件衬衫但刚好有阳光晒在后背上的暖。",
        "我在冬天写这支香的笔记，写到一半把窗户关上了。不是因为它冷，是因为我想让这股暖多在房间里待一会儿。",
        "有人说温暖是安全感。我觉得不对，温暖是那种明明知道外面很冷但还是愿意把外套脱下来给你的冲动。这支香就是这种冲动。",
        "香草和广藿香在一起通常会很沉。你调得很轻，像是它们两个商量好了今天要温柔一点。"
    ],
    sweetness: [
        "甜，但甜得有点心不在焉。像是一个人在切桃子的时候在想别的事情，切得不太整齐，但反而更真实。",
        "果香香水最怕的就是假甜。你这个不假，它是那种'我知道我很甜，但我无所谓你喜不喜欢'的甜。",
        "我一开始觉得它太甜了。但后来发现不是它太甜，是我太久没有闻过不设防的味道了。",
        "说它像果酱太俗了。它更像是一颗还挂在树上的无花果，你要用手捏一下才知道里面是软的那种。",
        "你有没有那种体验：吃到一个特别好的水果，然后你忍不住闭了一下眼睛？这支香就是那个闭眼的瞬间。",
        "甜调做不好就是少女风，做得好就是让人想靠近。你这个是后者，而且你好像也不是故意要让人靠近的，就是不小心变得好闻了。",
        "我不太喜欢甜香水。但这支我用了三天，不是因为甜，是因为它甜完之后留下了一点苦。那个苦让我觉得它很诚实。",
        "它的甜是那种先让你觉得'哦就这'然后过五分钟你发现你还在想它的甜。后知后觉的那种。",
        "像是一口咬下去才发现已经熟透了的梨。意外的甜，但也是最好的甜。",
        "如果你把它比作一个人的话，它是在人群中不怎么说话、但你一靠近就觉得'这人挺好闻'的那种。"
    ],
    crispness: [
        "清冽，这个词太干净了，这支香其实不太干净。它像是溪水里混了一点点泥，但刚好让你记得这是真的水。",
        "我有个朋友是调香师，她说清冽的秘诀是'少就是多'。我觉得你懂这个道理，但你故意多放了一点，因为你觉得'少'太无聊了。",
        "喷上去的第一秒我缩了一下鼻子。不是被吓到，是被冷到了。那种冷像小时候冬天舔了一下铁栏杆，有点疼，但你记住了。",
        "绿意和冷感很难平衡。你这个平衡得像是有人在认真生活，不是那种精致的认真，是那种'把袖子卷起来干活'的认真。",
        "它像你没喝完的冰水放了两个小时，但冰块还在。你知道它没那么冰了，但你还是觉得它很清醒。",
        "我用过很多青草调的香水，大部分像割草机刚走过的味道。你这个是草被踩过之后，过了半个小时再闻的那种味道，更真实。",
        "清冽但有点凶。不是那种会咬你的凶，是那种站在你面前不说话但你知道他有底气的凶。",
        "它让我想起我十七岁那年去山上露营，凌晨四点被冷醒，走出帐篷看到满山的雾。就是那种感觉。",
        "薄荷在这里不是主角，它是一种提醒，'你还活着，你还能感觉到冷'。我觉得这个设计很好。",
        "不是每个人都喜欢这种冷感。但喜欢的那些人会很喜欢。它挑人，我觉得这是它的优点。"
    ],
    depth: [
        "木质调最怕的就是像家具店。你这个不像家具店，像有人把一整棵树的回忆都榨成了汁。",
        "一开始我以为是檀木。后来发现还有别的，可能是木头在说话，但说得不太清楚，所以你要仔细听。",
        "这支香有一种'我来过这里'的感觉。不是真的来过，是一种关于永恒的错觉。",
        "我调香二十多年，闻过无数种木质调。你这个让我停了一下，不是因为多厉害，是因为它没有讨好我。",
        "它很重。但不是那种压死人的重，是那种你愿意把它扛在肩膀上的重，因为你知道它有分量才有意义。",
        "沉香木和广藿香在一起通常会很闷。你这支不闷，它在最下面留了一丝空气，像地下室有一扇没关紧的窗户。",
        "有人说深就是复杂。我不太同意。深更像是简单的东西说了很久的话。你这个就是这样。",
        "我第一次没太懂它。第二次开始有感觉。第三次觉得它有话要说。第四次的时候我发现自己已经在听它说了。",
        "它不是那种会告诉你'我很深'的香水。它是那种你用了很久之后突然发现'原来你还藏着这个'的香水。",
        "像一本你翻到中间才开始读的书。读完了再翻回开头，发现前面早就告诉你了，只是你没注意。"
    ],
    airiness: [
        "轻盈，但又不是那种你觉得它会飞走的那种轻盈。它是你知道它不会走、但它就是站在风口上的那种轻盈。",
        "这支香存在感很低。低到你觉得它可有可无。然后你有一天忘了喷，你开始到处找，原来你早就习惯它在身边了。",
        "花香做到这么轻是很难的。大部分花香的思路是'让我来占领你的鼻子'，你这个思路是'我来这里坐一下就走'。",
        "很多人把轻盈理解为'淡'。不对。轻盈是知道怎么不打扰你，但你还是会想起它。",
        "它像我认识的一个朋友，话不多，每次见面都只是点头笑笑，但每次走的时候你都觉得'他在真好'。",
        "茉莉和铃兰在一起通常会抢戏。你这支不会，它们像是在等对方先说话，结果谁都没说，但气氛反而刚刚好。",
        "我第一次喷的时候没感觉到它。以为是自己鼻子坏了。后来发现不是，是它在躲我。等我放松了它才出来。",
        "轻盈到可以穿过一整条街的油烟而不会沾上任何东西。这是我对它最高的评价。",
        "它不是那种你能清晰描绘出形状的味道。它是那种你闭上眼睛才会感觉到的东西，像风吹过耳边的温度。",
        "我有时候会故意喷在手腕上然后不看它。过几个小时再闻，它还在，像个守承诺的人。"
    ]
};

// ============================================================
// 灵感配方（按季节/心情推荐起始配方）
// ============================================================
export const PERSON_QUOTES = {
    brightness: [
        "调到第五瓶，我可以说点真的了：你不是喜欢明亮，你是怕别人觉得你难相处。",
        "你每次都往亮的那头拉。我猜你在生活里也是先笑的那个人。",
        "这个亮度不是天生的，是练出来的。练出来的东西也算你的。"
    ],
    warmth: [
        "你调的温度偏高。会这样调的人，通常是自己那份暖没人接住过。",
        "你在给别人递温度。第五瓶了，也该有人给你递一次。",
        "暖是你的默认设置。但默认设置也会累。"
    ],
    sweetness: [
        "你把甜压在一个很克制的位置。你不是不想甜，你是怕被当成幼稚。",
        "调到这里我发现，你的甜是给自己的，不是给别人看的。",
        "甜这件事你一直在讨价还价。今天让你赢一次。"
    ],
    crispness: [
        "你反复往清冽走。你讨厌黏腻，也讨厌把话说得太满。",
        "这个冷不是冷淡，是干净。你分得很清楚，我也分得清。",
        "你在香气里留距离。留距离的人，是有过靠太近的经验的。"
    ],
    depth: [
        "你往深处走得比大多数人都远。你不太急着让人懂你。",
        "深邃是你调出来的默认底色。有些事你只肯放在底调里。",
        "这瓶后调比前调重。你也是，见面第三次才开始有意思。"
    ],
    airiness: [
        "你调得很轻。轻不是没有分量，是你不想给人负担。",
        "你总留着可以走的余地。这不是缺点，只是你习惯了。",
        "轻盈到这个程度，是刻意的。你不喜欢被人抓住。"
    ]
};

export const PEER_QUOTES = {
    brightness: [
        "二十瓶了。我不解释明亮怎么做了 —— 你比我知道哪一格该停。",
        "这个前调的收法很干净。我不改。"
    ],
    warmth: [
        "你这个暖是叠出来的，不是加出来的。同行才看得出区别。",
        "温度控在这儿，是有意的。我认。"
    ],
    sweetness: [
        "甜压在这个位置需要克制。我以前做不到这么早收手。",
        "这个甜有骨头。不是糖，是果肉。"
    ],
    crispness: [
        "清冽做到不寡淡，这一步卡住过很多人。你过了。",
        "这个冷有形状。我们该聊聊你怎么调的。"
    ],
    depth: [
        "底调压得住。二十瓶下来你有自己的手法了，不是我的。",
        "这个深度不是堆材料堆出来的。你懂减法了。"
    ],
    airiness: [
        "轻而不散，这是手艺。第二十瓶，你可以自称调香师了。",
        "留白留在对的地方。这我教不了，只能自己撞出来。"
    ]
};

export const INSPIRATIONS = [
    { name: '春日踏青', filter: 'spring', accords: { citrus: 50, floral: 60, green: 40, fruity: 20, woody: 10, fougere: 15 }, hint: '花香与绿意，像刚下过雨的草地' },
    { name: '樱花树下', filter: 'spring', accords: { floral: 70, fruity: 30, citrus: 20, musk: 15, woody: 5 }, hint: '粉色的、柔软的、让人想恋爱' },
    { name: '夏日海滩', filter: 'summer', accords: { aquatic: 60, citrus: 45, green: 20, fruity: 25, woody: 10 }, hint: '海风、椰子、防晒霜和西瓜' },
    { name: '仲夏夜之梦', filter: 'summer', accords: { floral: 55, fruity: 40, citrus: 30, musk: 20, oriental: 10 }, hint: '夜晚的花园，萤火虫和茉莉' },
    { name: '秋日果园', filter: 'autumn', accords: { fruity: 55, woody: 35, oriental: 25, citrus: 20, floral: 15 }, hint: '熟透的苹果、肉桂和落叶' },
    { name: '深秋森林', filter: 'autumn', accords: { woody: 60, oriental: 35, green: 25, fougere: 20, musk: 15 }, hint: '苔藓、松针和远处篝火' },
    { name: '冬日壁炉', filter: 'winter', accords: { oriental: 65, woody: 50, amber: 30, vanilla: 25, musk: 20 }, hint: '柴火、热红酒和旧毛衣' },
    { name: '雪后清晨', filter: 'winter', accords: { citrus: 40, green: 30, musk: 35, woody: 25, aquatic: 20 }, hint: '冷冽的空气、松果和白麝香' },
    { name: '独处时刻', filter: 'mood', accords: { woody: 45, musk: 40, oriental: 20, floral: 15, green: 10 }, hint: '不需要被理解的时候' },
    { name: '约会之夜', filter: 'mood', accords: { floral: 50, oriental: 35, fruity: 30, musk: 25, amber: 20 }, hint: '想被记住的那个晚上' },
    { name: '通勤日常', filter: 'mood', accords: { citrus: 35, fougere: 30, woody: 20, floral: 15, green: 15 }, hint: '得体、不冒犯、让人想靠近' },
    { name: '周末微醺', filter: 'mood', accords: { fruity: 40, oriental: 30, vanilla: 25, woody: 20, citrus: 15 }, hint: '周六下午，阳光和鸡尾酒' }
];
// ============================================================
export const DAILY_CHALLENGES = [
    { theme: '雨后森林的泥土气息', hint: '绿意与木质为主，一点花香', target: { green: 70, woody: 55, floral: 20, citrus: 10, fougere: 15 } },
    { theme: '冬日壁炉边的温暖', hint: '东方与木质，温暖包裹', target: { oriental: 75, woody: 50, floral: 10, citrus: 5 } },
    { theme: '春日花园的第一缕阳光', hint: '花香与柑橘明亮开场', target: { floral: 65, citrus: 45, green: 25, fruity: 15 } },
    { theme: '旧书店里的午后时光', hint: '木质与东方，略带花香', target: { woody: 70, oriental: 40, floral: 15 } },
    { theme: '海边日落的咸湿微风', hint: '柑橘清新，绿意与木质支撑', target: { citrus: 60, green: 40, woody: 25, floral: 10 } },
    { theme: '夏夜花园的约会', hint: '花香与果香，轻盈不厚重', target: { floral: 70, fruity: 50, citrus: 20, green: 15 } },
    { theme: '晨间第一杯伯爵茶', hint: '柑橘清亮，馥奇优雅', target: { citrus: 55, fougere: 35, woody: 30, floral: 15 } },
    { theme: '图书馆深处的独处时光', hint: '木质深沉，东方温暖', target: { woody: 65, oriental: 50, floral: 10 } },
    { theme: '白衬衫上的清新香气', hint: '柑橘与绿意，干净利落', target: { citrus: 70, green: 35, floral: 15, fougere: 10 } },
    { theme: '玫瑰园中的冥想', hint: '花香主导，木质与绿意衬托', target: { floral: 80, woody: 20, green: 20, citrus: 10 } },
    { theme: '秋日果园的丰收', hint: '果香丰盈，木质与东方收尾', target: { fruity: 65, woody: 30, oriental: 25, floral: 15 } },
    { theme: '山间清晨的薄雾', hint: '绿意凛冽，木质清冷', target: { green: 70, woody: 35, floral: 15, citrus: 10 } },
    { theme: '热可可旁的慵懒周末', hint: '东方温暖，果香甜美', target: { oriental: 60, fruity: 35, woody: 25, floral: 10 } },
    { theme: '星空下的篝火晚会', hint: '木质烟熏，东方温暖', target: { woody: 60, oriental: 45, green: 20, fougere: 10 } },
    { theme: '旅行箱里的异国记忆', hint: '东方神秘，柑橘明亮', target: { oriental: 55, citrus: 40, fruity: 30, woody: 15 } },
    { theme: '祖母的梳妆台', hint: '花香温柔，东方古典', target: { floral: 55, oriental: 45, woody: 30, fruity: 10 } }
];

// ============================================================
// 示例配方（开屏展示）
// ============================================================
export const HERO_EXAMPLE = {
    name: "雨林晨曦",
    accords: {
        citrus: 55,
        floral: 20,
        fruity: 15,
        woody: 30,
        oriental: 5,
        fougere: 10,
        green: 50
    },
    quote: "绿意与柑橘的清晨，像雨林里第一缕光穿过叶隙。"
};

// ============================================================
// 图鉴（配真实香氛图片）
// ============================================================
export const galleryPerfumes = [
    {
        id: 1,
        name: "尼罗河花园",
        brand: "爱马仕",
        year: 2005,
        perfumer: "Jean-Claude Ellena",
        // 青芒果(果/绿)、莲花(水/花)、无花果叶(绿)、胡萝卜籽(绿)、葡萄柚(柑橘)、麝香、雪松(木质)
        accords: { citrus: 25, floral: 14, fruity: 14, woody: 8, oriental: 0, fougere: 3, green: 22, musk: 5, amber: 0, vanilla: 0, tobacco: 0, aquatic: 9 },
        description: "一座想象中的尼罗河畔花园，青芒果、莲花与无花果叶的诗意融合。爱马仕的调香师 Jean-Claude Ellena 说它的灵感来自尼罗河畔的芒果林，但我更愿意把它想象成一个人在河边坐着，什么都没想，只是闻着。",
        wiki: "https://baike.baidu.com/item/尼罗河花园",
        hook: "她在尼罗河畔种了一整片芒果林",
        image: "https://upload.wikimedia.org/wikipedia/commons/6/6d/Herm%C3%A8s_Jardin_sur_le_Nil.jpg"
    },
    {
        id: 2,
        name: "檀道",
        brand: "蒂普提克",
        year: 2003,
        perfumer: "Yves Coueslant",
        // 纯粹檀木与雪松，尾段一点点绿意与麝香托底
        accords: { citrus: 2, floral: 3, fruity: 0, woody: 78, oriental: 8, fougere: 0, green: 6, musk: 3, amber: 0, vanilla: 0, tobacco: 0, aquatic: 0 },
        description: "纯粹的檀木与雪松，像雨后古庙的沉静，木质调爱好者的朝圣之香。蒂普提克做它的时候没打算讨好任何人，它只是把一棵老树的灵魂蒸馏出来，然后装进瓶里。你喷它的时候不会觉得'我今天很美'，你会觉得'我今天很安静'。",
        wiki: "https://baike.baidu.com/item/檀道",
        hook: "雨后古庙的檀香，一闻即是归处",
        image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.49104.jpg"
    },
    {
        id: 3,
        name: "蝴蝶夫人",
        brand: "娇兰",
        year: 1919,
        perfumer: "Jacques Guerlain",
        // 蜜桃(果)、橡木苔(木质/馥奇)、佛手柑(柑橘)、玫瑰(花)、广藿香(木质/东方)、麝香、琥珀、香草、烟草
        accords: { citrus: 4, floral: 15, fruity: 25, woody: 12, oriental: 15, fougere: 8, green: 4, musk: 3, amber: 7, vanilla: 5, tobacco: 2, aquatic: 0 },
        description: "果香西普调的史诗，蜜桃与橡木苔的缠绵，百年不朽的温柔叹息。1919 年诞生的时候，它是一首写给战争年代的情书，你闻到的不是桃子，是一个人对另一个人说'你还在吗'的那种小心翼翼。",
        wiki: "https://baike.baidu.com/item/蝴蝶夫人",
        hook: "蜜桃与橡木苔的百年叹息",
        image: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Mitsouko.jpg"
    },
    {
        id: 4,
        name: "孤女",
        brand: "芦丹氏",
        year: 2006,
        perfumer: "Christopher Sheldrake",
        // 焚香(东方/木质)、麝香、檀木、雪松、一缕玫瑰
        accords: { citrus: 0, floral: 5, fruity: 0, woody: 45, oriental: 35, fougere: 0, green: 3, musk: 12, amber: 0, vanilla: 0, tobacco: 0, aquatic: 0 },
        description: "焚香、麝香与檀木，像是教堂里最后一个人走后留下的气味。芦丹氏从来不做快乐的香水，它做的都是那些你在深夜里才会想起的东西。孤女不是给你喷给别人闻的，是给你自己闻的，像一个拥抱，但不用碰到任何人。",
        wiki: "https://baike.baidu.com/item/孤女",
        hook: "教堂最后一排，只有灰烬和光",
        image: "https://fimgs.net/mdimg/perfume-thumbs/375x500.26214.jpg"
    },
    {
        id: 5,
        name: "大吉岭茶",
        brand: "宝格丽",
        year: 1996,
        perfumer: "Jean-Claude Ellena",
        // 茶(绿/木质)、佛手柑(柑橘)、雪松(木质)、麝香、玫瑰、纸莎草(绿)
        accords: { citrus: 28, floral: 10, fruity: 0, woody: 26, oriental: 1, fougere: 4, green: 26, musk: 5, amber: 0, vanilla: 0, tobacco: 0, aquatic: 0 },
        description: "像是白衬衫上残留的茶香，干净得让人想靠近又不忍打扰。Jean-Claude Ellena 调的这支香，是所有'伪体香'香水的爷爷，你闻起来好像没喷香水，但所有人都会偷偷想知道你用的什么。它最好的地方在于它的分寸感：知道什么时候该出现，什么时候该闭嘴。",
        wiki: "https://baike.baidu.com/item/大吉岭茶",
        hook: "白衬衫上的茶香，穿了一整天还舍不得洗",
        image: "https://upload.wikimedia.org/wikipedia/commons/d/d3/BulgariPerfume.jpg"
    },
    {
        id: 6,
        name: "黑色圆舞曲",
        brand: "阿蒂仙",
        year: 2009,
        perfumer: "Bertrand Duchaufour",
        // 无花果(果/绿)、檀木(木质)、琥珀(东方)、麝香、广藿香(木质/东方)、咖啡(东方)、香草
        accords: { citrus: 0, floral: 0, fruity: 12, woody: 35, oriental: 30, fougere: 0, green: 8, musk: 8, amber: 5, vanilla: 2, tobacco: 0, aquatic: 0 },
        description: "无花果、檀木与琥珀，像是夏夜花园里的一场秘密舞会。阿蒂仙做它的时候大概在想：如果黄昏有味道，应该就是这样，不亮也不暗，暧昧但体面，像一个你不知道该不该吻别的告别。",
        wiki: "https://baike.baidu.com/item/黑色圆舞曲",
        hook: "夏夜花园的舞会，没人知道谁来了",
        image: "https://images.unsplash.com/photo-1545243424-0ce743321e11?w=400&h=500&fit=crop&crop=center"
    },
    // ---- 以下 5 款为名香补录：真图 p7-p11.jpg ----
    {
        id: 7,
        name: "香奈儿 5号",
        brand: "香奈儿",
        year: 1921,
        perfumer: "Ernest Beaux",
        accords: { citrus: 8, floral: 40, fruity: 0, woody: 12, oriental: 8, fougere: 2, green: 2, musk: 12, amber: 8, vanilla: 8, tobacco: 0, aquatic: 0 },
        description: "第一瓶『不像花香的花香』，醛把茉莉和玫瑰擦得发亮，一百年了依然没人能绕开它。它不讨好你，它只是站在那儿，像一件剪裁完美的黑裙——你得长到一定年纪，才听得懂它在说什么。",
        wiki: "https://baike.baidu.com/item/香奈儿5号",
        hook: "一百年了，还是那瓶你妈妈梳妆台上的香水"
    },
    {
        id: 8,
        name: "大地",
        brand: "爱马仕",
        year: 2006,
        perfumer: "Jean-Claude Ellena",
        accords: { citrus: 30, floral: 5, fruity: 0, woody: 38, oriental: 12, fougere: 0, green: 5, musk: 4, amber: 4, vanilla: 0, tobacco: 0, aquatic: 2 },
        description: "葡萄柚撞上火石与香根草，像一个男人站在旷野里，脚下是滚烫的土。它常被叫『成功人士的味道』，但其实它更像『知道自己要去哪的人』的味道——不吵，但你记得住。",
        wiki: "https://baike.baidu.com/item/爱马仕大地",
        hook: "脚下是滚烫的土，眼里是整片旷野"
    },
    {
        id: 9,
        name: "真我",
        brand: "迪奥",
        year: 1999,
        perfumer: "Calice Becker",
        accords: { citrus: 6, floral: 52, fruity: 8, woody: 10, oriental: 8, fougere: 0, green: 4, musk: 8, amber: 2, vanilla: 2, tobacco: 0, aquatic: 0 },
        description: "一大束被阳光晒暖的白花，依兰、茉莉、晚香玉全都开到最盛。它是那种『重要场合』才会请出来的香，穿上它你会不自觉地把背挺直——有些香水是用来讨好自己的，这瓶是用来告诉你值得被认真对待的。",
        wiki: "https://baike.baidu.com/item/迪奥真我",
        hook: "一大束被阳光晒暖的白花，为谁而开"
    },
    {
        id: 10,
        name: "英国梨与小苍兰",
        brand: "祖玛珑",
        year: 2010,
        perfumer: "Christine Nagel",
        accords: { citrus: 10, floral: 30, fruity: 30, woody: 10, oriental: 4, fougere: 0, green: 6, musk: 6, amber: 4, vanilla: 0, tobacco: 0, aquatic: 0 },
        description: "咬一口刚摘的梨，汁水还没咽下去，小苍兰就在旁边开了。它干净、清淡、几乎不会出错，是很多人人生的第一瓶香水——像白球鞋，配什么都行，怎么穿都不会唐突。",
        wiki: "https://baike.baidu.com/item/英国梨与小苍兰",
        hook: "刚摘的梨，和小苍兰撞了个满怀"
    },
    {
        id: 11,
        name: "柏林少女",
        brand: "芦丹氏",
        year: 2013,
        perfumer: "Christopher Sheldrake",
        accords: { citrus: 2, floral: 42, fruity: 4, woody: 16, oriental: 18, fougere: 0, green: 3, musk: 10, amber: 3, vanilla: 2, tobacco: 0, aquatic: 0 },
        description: "一支带刺的红玫瑰，胡椒的辛让花香不敢撒娇，底下是蜂蜜的暗甜。它不是那种『温柔小姐姐』的玫瑰，是『我美但别惹我』的玫瑰——像雪地里的血，冷，但让人移不开眼。",
        wiki: "https://baike.baidu.com/item/柏林少女",
        hook: "带刺的红玫瑰，雪地里的那滴血"
    }
];

// ============================================================
// 一键气味模板（工坊 T1）：小白从「成品」改起，而非面对默认那瓶。
// 12 键 accords，总和 100；desc 用于按钮下的小字说明。
// ============================================================
export const SCENT_TEMPLATES = [
    { key: 'fresh', label: '清新草木', desc: '像雨后的草地与柑橘',
      accords: { citrus: 30, floral: 8, fruity: 2, woody: 6, oriental: 0, fougere: 4, green: 30, musk: 5, amber: 0, vanilla: 0, tobacco: 0, aquatic: 15 } },
    { key: 'woody', label: '温暖木质', desc: '像壁炉边的老木屋',
      accords: { citrus: 6, floral: 4, fruity: 0, woody: 35, oriental: 15, fougere: 3, green: 3, musk: 8, amber: 12, vanilla: 8, tobacco: 6, aquatic: 0 } },
    { key: 'sweet', label: '甜美花果', desc: '像刚切开的蜜桃与玫瑰',
      accords: { citrus: 10, floral: 28, fruity: 25, woody: 0, oriental: 8, fougere: 0, green: 4, musk: 8, amber: 5, vanilla: 12, tobacco: 0, aquatic: 0 } },
    { key: 'aqua', label: '清冽水感', desc: '像海边吹来的一阵风',
      accords: { citrus: 22, floral: 8, fruity: 0, woody: 4, oriental: 0, fougere: 6, green: 22, musk: 8, amber: 0, vanilla: 0, tobacco: 0, aquatic: 30 } }
];

// ============================================================
// 笔记数据
// ============================================================
export const notesData = [
    {
        title: "尼罗河花园：它不是什么高深的东西，它就是一颗有野心的芒果",
        lead: "一颗有野心的芒果，和一段不肯安静的绿。",
        dateRange: { from: "2025.08", to: "2026.03", location: "格拉斯 · 八个月" },

        date: "2026.03.17，格拉斯，雨停之后",
        sections: [
            { heading: "先说瓶子", text: "磨砂的，绿色从上面往下沉。拿在手里有点凉，不是我讨厌的那种凉，是那种你不太确定它是不是在出汗的凉。我对瓶子的要求不高，别丑得让我不想喷就行。这个瓶子不算惊艳，但放在桌上看久了，你会觉得它在看回来。" },
            { heading: "喷上去的第一秒，我差点以为买错了", text: "太绿了。绿得像有人在我面前把一整颗青芒果砸了。那种绿不是温柔的绿，是带攻击性的，你知道它熟了，但它偏要在最生的时候让你闻到。胡萝卜籽的味道也是扑面而来的，我一开始觉得这什么鬼东西。但等了大概两分钟，它变了。" },
            { heading: "两分钟之后，它开始哄你", text: "莲花出来了。不是那种你在公园里闻到的莲花（那种通常带着死水的味道），是那种你想象中的莲花，干净的，水汽很重的，像是刚洗过澡的味道。风信子也跑出来凑热闹。它们两个在一起的时候，有点像两个不太熟的人被迫合租，结果发现还挺合拍。" },
            { heading: "最后的收尾是我最喜欢的部分", text: "无花果叶的那种奶绿色，不是甜，是绿得很体面。麝香在底下托着，很轻，像是有人在你后面站着但不说话。雪松有一点，但我得凑很近才能闻到。整体来说，这支香的结尾比开头聪明太多了，它知道自己前面太吵了，后面就学会了闭嘴。" },
            { heading: "什么时候喷它", text: "春天的雨后，夏天的早上，或者你心情不太好想出门走一走的时候。它不会给你答案，但它会告诉你：'你闻到的这些，都是真实的。'我就喜欢它这点诚实。" },
            { heading: "一些不怎么客观的牢骚", text: "很多人说这是杰作。我觉得不至于，它有一些小毛病，开头太吵了，中调有点犹豫，不知道自己是水还是花。但就是这些小毛病让它像个人，不像那些完美的、但你记不住脸的东西。" }
        ],
        wiki: "https://baike.baidu.com/item/Un_Jardin_sur_le_Nil",
        pyramid: { top: ['葡萄柚', '青芒果', '胡萝卜籽'], middle: ['莲花', '风信子', '纸莎草'], base: ['无花果叶', '麝香', '雪松'] }
    },
    {
        title: "檀道：一闻即是归处",
        lead: "木头给一个人最好的礼物，是让他安静下来。",
        dateRange: { from: "2025.12", to: "2025.12", location: "京都" },

        date: "2025.12.08，京都，清晨的寺庙",
        sections: [
            { heading: "第一口", text: "檀木，纯粹的檀木。没有前调，没有中调，它一上来就是檀木。像有人在你面前锯开了一根百年老树，木屑飞舞，你不想躲。" },
            { heading: "雪松来了", text: "大约二十分钟后，雪松从底下升起来。不是替代檀木，是给它搭了一个架子，让檀木没那么孤零零。我觉得它们两个应该认识很久了。" },
            { heading: "留香", text: "六个小时。不夸张。喷在毛衣领口上，第二天早上还能闻到。那种感觉像是有人在你睡着的时候把寺庙搬到了你卧室。" },
            { heading: "不挑人", text: "很多木质调香水挑人。檀道不挑，它平等地给每个人一个拥抱。唯一的问题是，用了它之后再用别的香水，总觉得别的不够诚心。" }
        ],
        wiki: "https://baike.baidu.com/item/Tam_Dao",
        pyramid: { top: ['檀木', '雪松'], middle: ['檀木', '雪松'], base: ['檀木', '麝香'] }
    },
    {
        title: "No.5：那瓶你妈妈梳妆台上的香水，现在轮到你懂它了",
        lead: "它不讨好任何人，而这一点，就是它的魅力。",
        dateRange: { from: "2026.01", to: "2026.02", location: "巴黎 · 两个月" },

        date: "2026.02.22，巴黎，老公寓的浴室镜子前",
        sections: [
            { heading: "先说一句可能会被喷的话", text: "我一开始是不懂No.5的。我觉得它'老派'，觉得它'妈妈的味道'，觉得它是一款'应该喜欢但喜欢不起来'的香水。后来我喷了一次，站在镜子前，发现它根本没有在讨好我。那年冬天我在巴黎见一个老朋友，她的梳妆台上就摆着一瓶。我说'你还用这个'，她看了我一眼，说'你试试'。就是那个眼神让我决定试。" },
            { heading: "它不讨好任何人", text: "醛香一出来就是大摇大摆的。它不是那种'你来闻闻我'的香水，而是那种'我在这里，你爱闻不闻'的态度。依兰依兰在里面有点野，玫瑰和茉莉反而是端庄的，这个搭配很有意思，像是两个性格相反的姐妹被迫一起出席晚宴。" },
            { heading: "中调才是它的真本事", text: "醛香退场之后，茉莉慢慢升上来。不是新鲜的茉莉花，是那种被碾碎了的、浓郁的、几乎有点攻击性的茉莉。檀木和香草在后面兜着，让这支香不至于飘走。整体闻起来像一个穿着旧丝绒的女人走进房间，所有人都会看她，但她不在乎。" },
            { heading: "什么时候喷", text: "任何你想'在场'的时候。开会、约会、或者你只是想在超市里感觉自己是个重要人物。它不挑场合，但它挑人，喷它的人最好有点自己的主意。" },
            { heading: "一个私人建议", text: "别买浓香版。淡香版反而更勇敢，因为它知道自己的边界在哪里。" }
        ],
        wiki: "https://baike.baidu.com/item/Chanel_No._5",
        pyramid: { top: ['醛香', '依兰依兰', '柠檬'], middle: ['玫瑰', '茉莉', '鸢尾根'], base: ['檀木', '香草', '琥珀'] }
    },
    {
        title: "Baccarat Rouge 540：金色的、甜的、而且有点烦人",
        lead: "它不是一款'好'香水，但它是一款'对'的香水。",
        dateRange: { from: "2026.05", to: "2026.07", location: "朋友婚礼前后" },

        date: "2026.07.14，朋友婚礼后的夜宵摊",
        sections: [
            { heading: "它太有名了", text: "我知道。每个人都在说它。你可能在地铁上、电梯里、甚至你前任的身上闻到过它。但我要说一句公道话：它确实有它出名的道理，即使这个道理让我有点累。事情是这样的，我朋友婚礼那天，新郎喷了它。敬酒的时候他凑过来抱我，我整个人被裹在一股甜腻的香气里，像是被塞进了一个镀金的糖罐子。说实话，那一刻我理解了他为什么选它。也理解了为什么我在接下来的一整个月都不想再闻到它。" },
            { heading: "第一鼻子", text: "甜的。非常甜。但不是那种小女孩的甜，是那种你知道蜂蜜滴在大理石上的感觉吗？就是那种甜。茉莉在里面，但被糖渍过了，失去了它原本清冷的样子。" },
            { heading: "中调有点打架", text: "琥珀和龙涎香同时往上冲，谁也不让谁。结果就是闻起来很'满'，像一个同时播放三首古典乐的广播电台。但奇怪的是，它居然没有崩盘。可能是因为底下的雪松足够稳，像一个脾气好的保姆在收拾两个小祖宗的烂摊子。" },
            { heading: "留香和扩散", text: "喷一次，你整个楼层都知道你来了。这是优点也是缺点。优点是你可以少喷一点，缺点是，你根本没有选择低调的自由。我有一次喷了它去开会，对面的同事问我是不是刚从糖果厂下班。" },
            { heading: "我的结论", text: "它不是一款'好'香水，但它是一款'对'的香水。对的场合、对的人、对的心情。你只需要知道什么时候不该喷它，比如夏天挤地铁，或者任何你想被忘记的时候。" }
        ],
        wiki: "https://baike.baidu.com/item/Baccarat_Rouge_540",
        pyramid: { top: ['藏红花', '茉莉'], middle: ['琥珀', '龙涎香'], base: ['雪松', '树脂', '麝香'] }
    },
    {
        title: "Aventus：一瓶闻起来像'赢了'的香水",
        lead: "它闻起来不是'到来'，是'到了'。",
        dateRange: { from: "2025.09", to: "2025.10", location: "伦敦 · 六周" },

        date: "2025.10.30，伦敦，面试前的出租车后座",
        sections: [
            { heading: "名字就告诉你一切了", text: "Aventus，来自拉丁语的'到来'。但它闻起来不是'到来'，是'到了'。是那种你走进房间，所有人都会回头看你的味道。" },
            { heading: "前调：菠萝和烟熏的奇怪组合", text: "一开始是菠萝。甜的，明亮的，热带水果那种让人开心的味道。但几乎同时，烟熏味就上来了，桦木皮革的感觉，像是有人在沙滩上烧了一堆轮胎。这两个东西放在一起，你可能会觉得'什么鬼'，但它居然赢了。" },
            { heading: "中调开始变得严肃", text: "茉莉和玫瑰在这里不是主角，它们是来给烟熏味当翻译的，让它听起来没那么像火灾现场。广藿香也来凑热闹，给整体加了一层泥土感。这支香在这个阶段闻起来像一个刚打完胜诉官司的律师，领带还有点歪。" },
            { heading: "底调：橡木苔和香草的和解", text: "到最后，一切都平静下来了。橡木苔是那种老派的、潮湿的、像森林地面一样的味道。香草让它没那么冷酷。整体闻起来像一个刚刚完成了一项了不起的工作、现在坐在办公室里喝一杯威士忌的人。" },
            { heading: "什么时候喷", text: "任何你想感觉'我今天不会输'的时候。面试、谈判、或者你只是想在超市里挑选一块肉的时候感觉自己是个重要人物。" }
        ],
        wiki: "https://baike.baidu.com/item/Aventus",
        pyramid: { top: ['菠萝', '黑加仑', '桦木'], middle: ['茉莉', '玫瑰', '广藿香'], base: ['橡木苔', '香草', '麝香'] }
    },
    {
        title: "大地：闻起来像我爸，但我并不讨厌",
        lead: "它不会让你变得有趣，但会让你变得可信。",
        dateRange: { from: "2026.03", to: "2026.04", location: "办公室" },

        date: "2026.04.05，办公室，周一早上",
        sections: [
            { heading: "它和'创新'没有关系", text: "如果你在找一款让你'哇'出来的香水，大地不是它。它闻起来就是你想象中那种'好闻的、稳重的、不会出错'的味道。像你爸穿过的毛衣，像你大学时暗恋的那个人的外套。" },
            { heading: "前调：胡椒和葡萄柚的奇怪组合", text: "胡椒是先冲出来的，带攻击性的，像一个不善言辞的人突然开口说话。葡萄柚在后面拖着，给它一点体面。这两个东西在一起，像是两个不太熟的人被迫拼车，但居然聊得还行。" },
            { heading: "中调：天竺葵唱独角戏", text: "天竺葵在这里是绝对主角。不是那种花园里的天竺葵，是那种被碾碎了的、带点玫瑰味的天竺葵。有人说它像薄荷，有人说它像玫瑰，我觉得它像天竺葵。有些东西不需要被类比，它就是它自己。" },
            { heading: "底调：龙涎香和香草的安稳", text: "龙涎香是那种你一开始闻不到、但半小时后突然意识到'哦，原来你在这里'的味道。香草让整体没那么冷峻。整体闻起来像是一个很可靠的人，你可能不会暗恋他，但你会在困难时刻给他打电话。" },
            { heading: "我的真实想法", text: "这是一款'喷给别人'的香水。你喷它，不是为了自己闻，是为了让别人在你经过的时候想：'这个人还行。'它不会让你变得有趣，但会让你变得可信。" }
        ],
        wiki: "https://baike.baidu.com/item/Terre_d%27Herm%C3%A8s",
        pyramid: { top: ['胡椒', '葡萄柚', '橙子'], middle: ['天竺葵', '玫瑰', '胡椒'], base: ['龙涎香', '香草', '雪松'] }
    },
    {
        title: "冥府之路：闻起来像去了一个你不想去的地方",
        lead: "通往地狱的路上，其实点着蜡烛。",
        dateRange: { from: "2025.11", to: "2025.11", location: "巴黎左岸" },

        date: "2025.11.28，巴黎左岸，一座空教堂的下午",
        sections: [
            { heading: "名字先吓你一跳", text: "Passage d'Enfer，通往地狱的路。喷它之前你可能会犹豫：我真的想闻起来像地狱吗？答案是：你不想，但你想闻起来像地狱旁边那个卖蜡烛的商店。" },
            { heading: "前调：百合和焚香的仪式感", text: "百合一出来就是那种葬礼上的百合，白的，重的，带点脂粉味。焚香在旁边烧着，但不是寺庙里的那种，是教堂里的那种，冷的石头、旧的蜡烛、还有你不太想承认的敬畏感。" },
            { heading: "中调：玫瑰和藏红花的反差", text: "玫瑰在这里不是新鲜的，是那种被压扁了的、失去了水分的、像干花一样的玫瑰。藏红花给它加了一点药感，让它闻起来有点像你外婆的抽屉，你不知道里面有什么，但你觉得很安全。" },
            { heading: "底调：檀木和麝香的终点", text: "檀木和麝香在最后汇合，像两个走了很久的路人终于到了同一个地方。它们不争不抢，就是站在那里，让你知道：结束了。这支香的结尾是安静的，像一个人在空教堂里坐着，不祈祷，只是坐着。" },
            { heading: "什么时候喷", text: "冬天、雨天、或者你想让自己听起来比实际上更有故事的时候。它不适合夏天，不适合快乐的日子，不适合你只是想'好闻'的时候。它适合你想'在场'的时候。" }
        ],
        wiki: "https://baike.baidu.com/item/Passage_d%27Enfer",
        pyramid: { top: ['百合', '焚香'], middle: ['玫瑰', '藏红花'], base: ['檀木', '麝香', '雪松'] }
    },
    {
        title: "旷野：闻起来像你想成为的那个人",
        lead: "它是白米饭，你不会讨厌它，但你也不会特意点它。",
        date: "2026.08.09，高速公路，想你前任的那个晚上",
        sections: [
            { heading: "它和'迪奥'没有关系", text: "旷野 Sauvage。名字听起来很自由、很旷野、很原始。但实际上它闻起来像一个在电梯里对你微笑的陌生人，友好、得体、但你记不住。我是在一段很长的驾驶途中第一次认真闻到它。副驾驶的人留下的。车开了一个小时，我才发现空调出风口挂着一支试香管。标签已经磨没了，但我一闻就知道了，是旷野。" },
            { heading: "前调：卡拉布里亚佛多卡柑的盛大登场", text: "佛多卡柑是这支香的绝对主角。从第一秒到最后一秒，它都在。明亮的、柑橘味的、带一点点皂感的。它闻起来像你刚剥开一颗橘子，但橘子皮是洗过手的。" },
            { heading: "中调：胡椒和薰衣草的奇怪搭配", text: "胡椒是辣的，薰衣草是平静的。这两个东西在一起，像一个脾气暴躁的瑜伽老师。但奇怪的是，它居然不违和。可能是因为它们都被佛多卡柑压着，谁也不敢太放肆。" },
            { heading: "底调：龙涎香和香草的收尾", text: "龙涎香是那种矿物质的、像被海浪冲刷过的石头一样的味道。香草让整体没那么冷。整体闻起来像一个穿着白T恤的男人站在海边，你可能不会爱上他，但你会在Instagram上关注他。" },
            { heading: "我的真实评价", text: "这是一款'不会出错'的香水。它适合所有场合、所有季节、所有人。但正因为如此，它没有任何一个时刻是'特别'的。它是白米饭，你不会讨厌它，但你也不会特意点它。那管试香管我后来没有扔。就让它挂在出风口，偶尔提醒我一段我已经记不清细节的路。" }
        ],
        wiki: "https://baike.baidu.com/item/Sauvage",
        pyramid: { top: ['佛多卡柑', '胡椒'], middle: ['薰衣草', '胡椒', '天竺葵'], base: ['龙涎香', '香草', '雪松'] }
    },
    {
        title: "乌木沉香：闻起来像你负担不起的人生",
        lead: "闻一闻又不用钱，但你会记得它的价钱。",
        date: "2025.09.18，迪拜，酒店大堂的某个角落",
        sections: [
            { heading: "先说一个让我自卑的场合", text: "去年在迪拜转机，贵宾室里坐在我对面的男人喷了它。我一开始没在意，我对香的容忍度很高，毕竟这行干久了。但二十分钟后我发现自己在偷偷看他。不是因为他长得多好看，是因为他闻起来像一个我这辈子都进不去的世界。" },
            { heading: "前调：乌木和香料的压迫感", text: "乌木一出来就是沉的。不是那种'我今天心情不好'的沉，是那种'我家族三代都很有钱'的沉。胡椒和豆蔻在里面点缀，但它们的作用不是增添趣味，是给乌木当保镖，让你知道这不是你能随便评价的东西。" },
            { heading: "中调：玫瑰和麝香的奇怪妥协", text: "玫瑰在这里不是主角，它是来给乌木当翻译的，让它听起来没那么像在威胁你。麝香让整体柔和了一点，但只是一点。整体闻起来像一个穿着定制西装的男人对你说'我很好相处'，但你心里清楚他不是。" },
            { heading: "底调：檀木和皮革的终点", text: "到了最后，一切归于皮革和檀木的组合，那种老的、被时间打磨过的、像古董家具一样的味道。整体闻起来像一个你不想得罪的人。" },
            { heading: "什么时候喷", text: "任何你想让别人觉得'这个人有点东西'的时候。但说实话，它更挑人，喷它的人最好真的有底气，不然穿帮了比不喷还尴尬。那个贵宾室里的男人，后来我看见他翻了个名牌，上面写着一个我从没听说过的瑞士手表品牌。难怪他闻起来那么贵。" }
        ],
        wiki: "https://baike.baidu.com/item/Oud_Wood",
        pyramid: { top: ['乌木', '胡椒', '豆蔻'], middle: ['玫瑰', '麝香', '乳香'], base: ['檀木', '皮革', '琥珀'] }
    }
];
