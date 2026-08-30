<template>
  <view class="home">
    <!-- 调查弹层：开屏自动弹出。
         采用 data-role 属性区分遮罩与卡片区域，避免小程序端 @tap.stop 冒泡失效。 -->
    <view v-if="onboardOpen" class="onb-overlay" data-role="overlay" @tap="onOverlayTap">
      <view class="onb-card" data-role="card">
        <view class="onb-head">
          <text class="onb-kicker">调香日记</text>
          <text class="onb-title">{{ onboardTitle }}</text>
          <view class="onb-dots" v-if="onboardStep < 3">
            <view class="onb-dot" :class="{ on: onboardStep >= i - 1 }" v-for="i in 3" :key="i"></view>
          </view>
        </view>

        <view v-if="onboardStep < 3" class="onb-opts">
          <view class="onb-opt" v-for="o in onboardOptions" :key="o.key" @tap.stop="chooseOnboard(o)">
            <text class="onb-opt-label">{{ o.label }}</text>
          </view>
        </view>

        <view v-else class="onb-result">
          <view class="onb-reco" v-for="p in onboardReco" :key="p.id" @tap.stop="onboardUseThis(p)">
            <image class="onb-reco-img" :src="imgSrc(p.id)" mode="aspectFill"
                   style="background:#dfe7e0" @error="onImgError(p.id)"></image>
            <view class="onb-reco-info">
              <text class="onb-reco-name">{{ p.name }}</text>
              <text class="onb-reco-sub">{{ p.brand }} · {{ p.hook }}</text>
            </view>
            <text class="onb-reco-go">用这款</text>
          </view>
          <view class="onb-result-tip">这几款最接近你的偏好，点任意一款设为你的首页香。</view>
          <view class="onb-result-actions">
            <button class="onb-btn ghost" @tap.stop="goTutorial">怎么做</button>
            <button class="onb-btn" @tap.stop="closeOnboard">先逛逛</button>
          </view>
        </view>
      </view>
    </view>

    <!-- 雷达图卡片（主要内容） -->
    <view class="hero">
      <!-- ① 信任前置：原来的底部小灰字提到标题位，先解除顾虑再给承诺 -->
      <view class="hero-top">
        <text class="hero-title">30 秒，调一瓶只属于你的香</text>
      </view>

      <!-- ② Hook：一张已经调好的成品封存卡，不是空雷达。
           做完小调查后这张卡会换成最贴合使用者的那一款（matched=true 时给出标记） -->
      <view class="card">
        <view class="card-head">
          <text class="card-no">{{ matched ? '为你匹配 · 已封存' : 'NO.001 · 已封存' }}</text>
          <text class="card-name">{{ demo.name }}</text>
          <view class="card-rule"></view>
        </view>

        <!-- 雷达：0.15s 后从中心生长出来。
             注意：type="2d" canvas 是微信原生组件，会浮在普通视图层之上，
             z-index 盖不住它。开屏引导 / 教程遮罩弹出时把它隐藏（内联 display:none，
             优先级高于 class，确保真正隐藏），遮罩才能干净变暗覆盖整屏，
             避免雷达和绿线"穿透"弹窗。 -->
        <canvas type="2d" id="heroRadarCanvas" class="card-radar" :style="radarHidden ? 'display:none' : ''"></canvas>

        <!-- 信息区：0.75s 掀开（rotateX 翻转，不含 canvas） -->
        <view class="card-info">
          <view v-for="a in topAccords" :key="a.key" class="bar-row">
            <text class="bar-label">{{ a.label }}{{ a.main ? ' · 主调' : '' }}</text>
            <view class="bar-track">
              <view
                class="bar-fill"
                :style="{ width: barsIn ? a.value + '%' : '0%', background: a.color }"
              ></view>
            </view>
            <text class="bar-value">{{ a.value }}%</text>
          </view>
          <text class="card-formula">配方：{{ formulaText }}</text>
        </view>

        <!-- 台词：1.3s 淡入，收尾 -->
        <text class="card-quote">「{{ demo.hook }}」</text>
      </view>

      <!-- ③ CTA：陈述结果，不问问题 -->
      <button class="hero-btn" id="coachHeroBtn" @tap="goLab">去调一瓶你的香 →</button>
      <button class="hero-btn-sub" id="coachRandomBtn" @tap="randomPick">懒人福音 · 随便来一瓶 →</button>
      <view class="hero-guide" @tap="goTutorial">使用指南 · 不会调香也能上手</view>

      <!-- ④ 留存钩子：每日挑战（右上角火苗角标显示连续天数） -->
      <view class="hooks">
        <view class="daily-card" @tap="goChallenge">
          <!-- 火苗角标：1天小火🔥，2-5天中火🔥🔥，10天+大火🔥🔥🔥 -->
          <view class="daily-streak-badge" v-if="streak > 0">
            <text class="streak-flames">{{ streakFlames }}</text>
            <text class="streak-days">{{ streak }}</text>
          </view>
          <view class="daily-tag">每日挑战</view>
          <view class="daily-theme">{{ daily.theme }}</view>
          <view class="daily-hint">根据标题推测香调，来试试</view>
          <view class="daily-cta">{{ dailyDone ? '✓ 已完成' : '接受挑战 →' }}</view>
        </view>
      </view>
    </view>

    <!-- 手把手教程：暗色聚光灯，逐一高亮首页重点 -->
    <CoachMask page="home" />
  </view>
</template>

<script setup>
import { ref, computed, reactive, watch, nextTick } from 'vue'
import { onReady, onShow } from '@dcloudio/uni-app'
import { drawRadar, drawRadarGrow } from '@/utils/canvas-draw.js'
import { galleryPerfumes, ACCORDS, RADAR_LABELS } from '@/utils/data.js'
import { computeRadarValues, generateFormula, getDailyChallenge, isChallengeDone, setDailyChallengeTarget, randomAccords, genPerfumeName } from '@/utils/mix.js'
import { THEME, ACCORD_COLORS } from '@/utils/theme.js'
import { track } from '@/utils/analytics.js'
import { getStreak } from '@/utils/streak.js'
import { setPendingBlend } from '@/utils/wxacode.js'
import { startTour, tut } from '@/utils/tutorial.js'

// 首页封存卡展示的成品。默认图鉴第一瓶（尼罗河花园），与 gallery 页同源。
// 做过小调查后换成匹配结果 —— 首页要照见使用者本人，而不是永远一张样板卡。
// 结果落 storage，下次冷启动直接命中，不用再答一遍题。
const KEY_MATCH = 'isabella_match_perfume'
const demo = ref(galleryPerfumes[0])
const matched = ref(false)

// 香调条：取占比最高的 3 个，第一个标「主调」
const topAccords = computed(() =>
  Object.entries(demo.value.accords)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, value], i) => ({
      key,
      value,
      main: i === 0,
      label: (ACCORDS.find((a) => a.key === key) || {}).label || key,
      color: ACCORD_COLORS[key] || THEME.primary
    }))
)

const formulaText = computed(() => generateFormula(demo.value.accords).slice(0, 4).join('、'))

// 把匹配结果落到封存卡上，并立刻重绘雷达（问卷是弹层，canvas 一直在，无需重新 init）
function applyMatch(p, persist) {
  if (!p) return
  demo.value = p
  matched.value = true
  if (persist) {
    try { uni.setStorageSync(KEY_MATCH, p.id) } catch (e) { /* 忽略 */ }
  }
  // 香调条重播一次增长动画，让"卡片换了"这件事看得见
  barsIn.value = false
  setTimeout(() => { barsIn.value = true }, 60)
  drawStatic()
}

function restoreMatch() {
  try {
    const id = uni.getStorageSync(KEY_MATCH)
    if (!id) return
    const hit = galleryPerfumes.find((p) => p.id === id)
    if (hit) { demo.value = hit; matched.value = true }
  } catch (e) { /* 忽略 */ }
}

// 首页雷达初始随机一瓶：每次冷启动（未做过匹配）都看到不一样的香，
// 而不是永远样板 NO.001；开屏小调查答完后会按流程换成最贴合使用者的那一款。
function randomPerfume() {
  const i = Math.floor(Math.random() * galleryPerfumes.length)
  return galleryPerfumes[i]
}

// 香调条宽度由 0 过渡到目标值，与信息区翻转同时发生
const barsIn = ref(false)

function initCanvas(sel) {
  // 关键：这个 Promise 必须「永远 resolve」，否则 async onReady 里的 await 会永久挂起，
  // 导致后续的开屏弹窗定时器、雷达绘制全部不执行（弹窗不弹 + 雷达空白同时出现）。
  return new Promise((resolve) => {
    let done = false
    const finish = (val) => { if (!done) { done = true; resolve(val) } }
    try {
      uni.createSelectorQuery().select(sel).fields({ node: true, size: true }).exec((res) => {
        try {
          // 首页雷达曾因 canvas 未挂载 / 尺寸为 0 崩过：node、ctx、尺寸三道都要兜
          if (!res || !res[0] || !res[0].node) return finish(null)
          const cvs = res[0].node
          const ctx = cvs.getContext('2d')
          if (!ctx) return finish(null)
          // dpr 取像素比：uni.getWindowInfo 在部分旧基础库/开发者工具里不存在，
          // 必须回退 uni.getSystemInfoSync，否则 GetWindowInfo is not a function 会抛错、
          // 让 exec 回调崩在 resolve 之前 → Promise 永不 resolve → onReady 挂死。
          let dpr = 1
          try {
            dpr = (uni.getWindowInfo && uni.getWindowInfo().pixelRatio) ||
                  (uni.getSystemInfoSync && uni.getSystemInfoSync().pixelRatio) || 1
          } catch (e) { dpr = 1 }
          const w = res[0].width || 300
          const h = res[0].height || 300
          cvs.width = Math.max(1, Math.round(w * dpr))
          cvs.height = Math.max(1, Math.round(h * dpr))
          ctx.scale(dpr, dpr)
          finish({ canvas: cvs, ctx, w, h })
        } catch (e) { finish(null) }
      })
    } catch (e) { finish(null) }
  })
}

let radar = null
let introPlayed = false

// 留存钩子数据
const streak = ref(0)
const daily = computed(() => getDailyChallenge())
const dailyDone = ref(false)

// 火苗等级：1天小火🔥，2-5天中火🔥🔥，10天+大火🔥🔥🔥
const streakFlames = computed(() => {
  if (streak.value >= 10) return '🔥🔥🔥'
  if (streak.value >= 2) return '🔥🔥'
  return '🔥'
})

function refreshHooks() {
  streak.value = getStreak()
  dailyDone.value = isChallengeDone()
}

// 静态重绘（从 tabBar 切回首页时用）：直接呈现最终形态，不重播 3 秒入场
function drawStatic() {
  if (!radar) return
  drawRadar(radar.ctx, {
    cx: radar.w / 2,
    cy: radar.h / 2,
    radius: Math.min(radar.w, radar.h) * 0.34,
    values: computeRadarValues(demo.value.accords),
    labels: RADAR_LABELS,
    theme: THEME
  })
}

onReady(async () => {
  track('home_view')
  refreshHooks()
  // 有历史匹配结果先铺上；没有（首启/未答过）就随机一瓶先亮着，
  // 小调查答完再按流程换成最贴合使用者的那一款
  restoreMatch()
  if (!matched.value) demo.value = randomPerfume()

  // 首开引导：没答过题就自动弹出小调查。
  // 刻意放在 canvas 初始化（await）之前，与雷达初始化解耦——
  // 即便 canvas 初始化异常卡住，开屏弹窗也照常弹出，不会连带不弹。
  try {
    // 三题问卷应在开屏自动跳出。仅当「完整答完三题」后才不再弹，
    // 中途关掉的（点遮罩）下次冷启动仍会再问，避免一次误关就永久消失。
    if (!uni.getStorageSync('gu_onboard_done')) {
      setTimeout(() => { if (!onboardOpen.value) openOnboard() }, 700)
    }
  } catch (e) { /* 忽略 */ }

  radar = await initCanvas('#heroRadarCanvas')

  // 信息区翻转是纯 CSS（animation-delay 0.75s），这里只驱动香调条宽度对齐它
  setTimeout(() => { barsIn.value = true }, 750)

  if (!radar) return
  // 雷达从中心生长：骨架先现，多边形 0.6s 长满
  setTimeout(() => {
    drawRadarGrow(radar.ctx, {
      cx: radar.w / 2,
      cy: radar.h / 2,
      radius: Math.min(radar.w, radar.h) * 0.34,
      values: computeRadarValues(demo.value.accords),
      labels: RADAR_LABELS,
      theme: THEME,
      duration: 600,
      canvas: radar.canvas
    })
    introPlayed = true
  }, 150)
})

// 首页现在是 tabBar 页，会被反复切回。Canvas2D 在切走再回来时偶发空白，
// 补一次静态重绘；入场动画只在首次进入播，避免每次切 tab 都等 3 秒。
// 同时刷新 streak / 挑战状态 —— 用户在工坊封存完切回来，首页应该立即反映最新进度。
onShow(() => {
  // 教程页「重做小调查」回来时触发
  try {
    if (uni.getStorageSync('gu_redo_survey')) {
      uni.removeStorageSync('gu_redo_survey')
      openOnboard()
    }
  } catch (e) { /* 忽略 */ }
  refreshHooks()
  if (!radar || !introPlayed) return
  barsIn.value = true
  drawStatic()
})

function goLab() {
  track('home_cta')
  // 原「开始调香」的行为绑到这里：进入工坊即播雷达生长动画，漏斗埋点不断
  track('start_blend')
  try { uni.setStorageSync('isabella_pending_grow', 1) } catch (e) { /* 忽略 */ }
  uni.switchTab({ url: '/pages/lab/lab' })
}

// 懒人福音：现场摇一瓶全新的配比载入工坊，让选择困难户直接上手。
// 与工坊的「摇一瓶」共用 randomAccords，两处行为一致。
// 旧逻辑是从图鉴挑一瓶，配比就那固定的 11 种；现在是每次都现摇，
// 且配比带主次结构（见 mix.js 的说明），不然摇出来的都是「十二味各来一点」。
function randomPick() {
  const accords = randomAccords()
  const nm = genPerfumeName()
  setPendingBlend(accords, nm)
  track('home_random')
  // showToast 必须在 switchTab 之前调用，否则页面被卸载后 toast 会被拒绝
  uni.showToast({ title: '给你摇了「' + nm + '」，去工坊微调', icon: 'none' })
  uni.switchTab({ url: '/pages/lab/lab' })
}

// 每日挑战卡片：点一下直接跳工坊，并预置目标配方
function goChallenge() {
  const d = daily.value
  if (!d) return
  const accept = () => {
    setDailyChallengeTarget(d)
    track('home_challenge_accept')
    // showToast 必须在 switchTab 之前调用
    uni.showToast({ title: '去工坊调出这个主题', icon: 'none' })
    uni.switchTab({ url: '/pages/lab/lab' })
  }
  // 当天已完成过：再接受 = 从纯水重新来一遍（且不再弹完成提示），先确认再重置
  if (isChallengeDone()) {
    uni.showModal({
      title: '今日已完成',
      content: '今天的挑战已经完成，再接受会从头再调一次。要重来吗？',
      confirmText: '再来一次',
      cancelText: '先不了',
      success: (m) => { if (m.confirm) accept() }
    })
    return
  }
  accept()
}

// ---------- 首开引导：小白香气小调查 ----------
const ONBOARD_Q = [
  {
    title: '你更喜欢哪种味道？',
    options: [
      { key: 'green', label: '清新草木' },
      { key: 'woody', label: '温暖木质' },
      { key: 'floral', label: '甜美花果' },
      { key: 'aquatic', label: '清冽水感' }
    ]
  },
  {
    title: '你希望这瓶香给你什么感觉？',
    options: [
      { key: 'fresh', label: '清爽提神' },
      { key: 'warm', label: '温暖安心' },
      { key: 'sweet', label: '甜美愉悦' },
      { key: 'special', label: '低调特别' }
    ]
  },
  {
    title: '你平时会在什么场合用香？',
    options: [
      { key: 'daily', label: '日常通勤' },
      { key: 'date', label: '约会聚会' },
      { key: 'alone', label: '独处放松' },
      { key: 'any', label: '都行' }
    ]
  }
]

const onboardOpen = ref(false)
const onboardStep = ref(0)
const onboardReco = ref([])
const onboardAnswers = reactive({ q1: '', q2: '', q3: '' })

// 雷达 canvas 是原生组件，浮在视图层之上、z-index 盖不住。
// 开屏引导弹窗（onboardOpen）或聚光灯教程（tut.active）打开时，把它隐藏，
// 让遮罩层能正常变暗、完整覆盖底层内容；关闭后补绘一次确保雷达在位。
// 注意：必须放在 onboardOpen 定义之后，否则 computed 访问 undefined.value 会报错。
const radarHidden = computed(() => onboardOpen.value || tut.active)
watch(radarHidden, (hidden) => {
  if (!hidden && radar) nextTick(() => drawStatic())
})

const onboardOptions = computed(() =>
  onboardStep.value < 3 ? ONBOARD_Q[onboardStep.value].options : []
)
const onboardTitle = computed(() =>
  onboardStep.value < 3 ? ONBOARD_Q[onboardStep.value].title : '为你挑了几款'
)

function topAccordKey(acc) {
  let best = '', bv = -1
  Object.keys(acc).forEach((k) => { if ((acc[k] || 0) > bv) { bv = acc[k]; best = k } })
  return best
}
function computeReco(ans) {
  const catMap = {
    green: ['green', 'citrus', 'fougere'],
    woody: ['woody', 'oriental'],
    floral: ['floral', 'fruity'],
    aquatic: ['aquatic', 'musk']
  }
  // 期望的六维权重（顺序与 RADAR_LABELS 一致：明亮度 / 温暖度 / 甜美度 / 清冽感 / 深邃度 / 轻盈感）
  // q1 决定「家族池」，q2(感觉) / q3(场合) 在池内按气味轮廓精排，三题都参与，不白答
  const want = [1, 1, 1, 1, 1, 1]
  const bump = (i, n) => { want[i] += n }
  if (ans.q2 === 'fresh') { bump(0, 1.2); bump(3, 1.2) }
  else if (ans.q2 === 'warm') { bump(1, 1.2); bump(4, 1.2) }
  else if (ans.q2 === 'sweet') { bump(2, 1.2) }
  else if (ans.q2 === 'special') { bump(4, 1.0); bump(1, 0.4) }
  if (ans.q3 === 'daily') { bump(0, 1.0); bump(5, 1.0) }
  else if (ans.q3 === 'date') { bump(2, 1.0); bump(3, 0.8) }
  else if (ans.q3 === 'alone') { bump(4, 1.0); bump(1, 0.6) }

  const cats = catMap[ans.q1] || []
  let pool = galleryPerfumes.filter((p) => cats.includes(topAccordKey(p.accords)))
  if (pool.length < 2) pool = galleryPerfumes.slice()
  return pool
    .map((p) => {
      const r = computeRadarValues(p.accords)
      let dot = 0, wsum = 0
      for (let i = 0; i < 6; i++) { dot += r[i] * want[i]; wsum += want[i] }
      return { p, s: dot / wsum }
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, 2)
    .map((x) => x.p)
}

function chooseOnboard(o) {
  if (onboardStep.value === 0) onboardAnswers.q1 = o.key
  else if (onboardStep.value === 1) onboardAnswers.q2 = o.key
  else if (onboardStep.value === 2) {
    onboardAnswers.q3 = o.key
    onboardReco.value = computeReco(onboardAnswers)
    onboardStep.value = 3
    // 这里不立刻换卡：把"换卡"留到弹窗真正关闭时（选择结束后按流程更换），
    // 用户在结果页停留/浏览期间，首页仍是那瓶随机样香，关掉弹窗才切到匹配款
    return
  }
  onboardStep.value++
}

// 遮罩层点击：仅当确实点到了遮罩（而非卡片内部）才关闭
function onOverlayTap(e) {
  const role = e.target.dataset && e.target.dataset.role
  if (role === 'overlay') closeOnboard()
}
function openOnboard() {
  onboardReco.value = []
  onboardStep.value = 0
  onboardAnswers.q1 = onboardAnswers.q2 = onboardAnswers.q3 = ''
  onboardOpen.value = true
}
function closeOnboard() {
  // 三题都答完后、弹窗真正关闭的此刻，才把首页雷达/封存卡换成最贴合的那款
  // （"选择结束后按流程更换"）；中途点遮罩关掉的（没答完）则保持随机样香。
  if (onboardStep.value >= 3 && !matched.value && onboardReco.value[0]) {
    applyMatch(onboardReco.value[0], true)
  }
  // 仅「完成三题」后才永久关闭引导；中途点遮罩关掉的，下次冷启动仍会再问
  if (onboardStep.value >= 3) {
    try { uni.setStorageSync('gu_onboard_done', 1) } catch (e) { /* 忽略 */ }
  }
  onboardOpen.value = false
}
function onboardUseThis(p) {
  // 答完三题后：把选中的那款设为首页香，停留在首页。
  // 取消「答完直接进工坊」的逻辑——想微调再去工坊，由首页「看看我是什么香」进入。
  applyMatch(p, true)
  track('onboard_use')
  closeOnboard()
  uni.showToast({ title: '已设为你的首页香：' + p.name, icon: 'none' })
}
function goTutorial() {
  // 「怎么做」：关掉小调查弹层后，启动暗色聚光灯教程（首页起，逐步走到工坊）
  try { uni.setStorageSync('gu_onboard_done', 1) } catch (e) { /* 忽略 */ }
  onboardOpen.value = false
  startTour()
}
// 与 gallery.vue 保持一致：走本地资源，不依赖境外域名
function imgSrc(id) { return '/static/gallery/p' + id + '.jpg' }
// 本地图理论上不会失败，但万一打包漏图，至少不露白洞，并留一条 warn 方便排查
function onImgError(id) { console.warn('[home] 推荐图加载失败:', id) }
</script>

<style scoped>
/* 字体：统一跟随系统默认（Georgia 衬线栈已移除——各机型 serif 兜底不一致，
   有的 ROM 落楷体、有的落默认黑体，跨设备必然长得不一样，真机反馈定案） */
.home {
  min-height: 100vh;
  background: #f0eee5;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
}
.hero {
  width: 100%;
  max-width: 640rpx;
  /* 首页进了 tabBar，底部留出安全区，别让 CTA 贴着 tab 条 */
  padding: 48rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ---------- 标题区 ---------- */
.hero-top {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hero-title {
  font-size: 46rpx;
  font-weight: 700;
  color: #2e5c45;
  line-height: 1.35;
  text-align: center;
  letter-spacing: 1rpx;
  font-family: inherit;
}

/* ---------- 成品封存卡 ---------- */
.card {
  margin-top: 40rpx;
  width: 100%;
  box-sizing: border-box;
  padding: 32rpx 30rpx 30rpx;
  background: #f6f3ea;
  border: 2rpx solid #2e5c45;
  border-radius: 8rpx;
  box-shadow: 0 16rpx 40rpx rgba(46, 92, 69, 0.14);
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 卡片本体轻微浮入，不用 transform 以外的属性影响 canvas 布局 */
  animation: cardIn 0.5s ease-out both;
}
.card-head {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.card-no {
  font-size: 20rpx;
  color: #a97826;
  letter-spacing: 3rpx;
  font-family: inherit;
}
.card-name {
  margin-top: 10rpx;
  font-size: 38rpx;
  font-weight: 700;
  color: #2e5c45;
  letter-spacing: 2rpx;
  font-family: inherit;
}
.card-rule {
  margin-top: 16rpx;
  width: 72%;
  height: 1rpx;
  background: #a97826;
  opacity: 0.6;
}

/* canvas 保持静态布局：微信里原生组件不参与 CSS transform */
.card-radar {
  width: 420rpx;
  height: 420rpx;
  display: block;
  margin-top: 8rpx;
}

/* 信息区：0.75s 时沿 X 轴掀开 */
.card-info {
  width: 100%;
  margin-top: 4rpx;
  transform-origin: top center;
  animation: flipOpen 0.5s ease-out 0.75s both;
}
.bar-row {
  display: flex;
  align-items: center;
  margin-bottom: 14rpx;
}
.bar-label {
  width: 150rpx;
  font-size: 22rpx;
  color: #2b2b2e;
}
.bar-track {
  flex: 1;
  height: 8rpx;
  border-radius: 4rpx;
  background: rgba(26, 26, 30, 0.1);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 4rpx;
  transition: width 0.6s ease-out;
}
.bar-value {
  width: 66rpx;
  text-align: right;
  font-size: 22rpx;
  color: #6b6a6a;
}
.card-formula {
  display: block;
  margin-top: 6rpx;
  font-size: 21rpx;
  color: #6b6a6a;
  line-height: 1.6;
}

/* 台词：1.3s 淡入收尾 */
.card-quote {
  margin-top: 22rpx;
  font-size: 26rpx;
  color: #6b6a6a;
  line-height: 1.7;
  text-align: center;
  letter-spacing: 1rpx;
  animation: quoteIn 0.5s ease-out 1.3s both;
  font-family: inherit;
 
}

/* ---------- CTA ---------- */
.hero-btn {
  margin-top: 44rpx;
  width: 100%;
  font-size: 34rpx;
  font-weight: 600;
  letter-spacing: 3rpx;
  border-radius: 16rpx;
  padding: 28rpx 0;
  background: #2e5c45;
  color: #fff;
  line-height: 1.4;
  box-shadow: 0 12rpx 30rpx rgba(46, 92, 69, 0.22);
  /* 动画结束后开始呼吸，把视线从卡片引到按钮 */
  animation: btnPulse 2.4s ease-in-out 2s infinite;
}
.hero-btn::after {
  border: none;
}
.hero-btn:active {
  transform: scale(0.98);
}

/* 次级按钮：随便来一瓶（懒人福音） */
.hero-btn-sub {
  margin-top: 18rpx;
  width: 100%;
  font-size: 28rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
  border-radius: 16rpx;
  padding: 22rpx 0;
  background: #fff;
  color: #2e5c45;
  border: 2rpx solid rgba(46, 92, 69, 0.35);
  line-height: 1.4;
}
.hero-btn-sub::after {
  border: none;
}
.hero-btn-sub:active {
  background: #e7ede9;
}

@keyframes cardIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes flipOpen {
  from { opacity: 0; transform: rotateX(-72deg); }
  to   { opacity: 1; transform: rotateX(0deg); }
}
@keyframes quoteIn {
  from { opacity: 0; transform: translateY(12rpx); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes btnPulse {
  0%, 100% { box-shadow: 0 12rpx 30rpx rgba(46, 92, 69, 0.22); }
  50%      { box-shadow: 0 12rpx 44rpx rgba(46, 92, 69, 0.42); }
}

/* ---------- 留存钩子（首页第一屏 CTA 下方） ---------- */
.hooks {
  margin-top: 36rpx;
  width: 100%;
}

/* 每日挑战卡片（含火苗角标） */
.daily-card {
  position: relative;
  background: linear-gradient(135deg, #f6f3ea 0%, #ece7d8 100%);
  border: 2rpx solid #2e5c45;
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.daily-streak-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  background: #c45c5c;
  border-radius: 20rpx;
  padding: 6rpx 14rpx 6rpx 10rpx;
  box-shadow: 0 4rpx 12rpx rgba(196, 92, 92, 0.3);
}
.streak-flames { font-size: 20rpx; line-height: 1; }
.streak-days { font-size: 22rpx; font-weight: 700; color: #fff; line-height: 1; }
.daily-tag {
  font-size: 22rpx;
  color: #a97826;
  letter-spacing: 4rpx;
  text-transform: uppercase;
}
.daily-theme {
  font-size: 32rpx;
  font-weight: 700;
  color: #2e5c45;
  line-height: 1.35;
  font-family: inherit;
}
.daily-hint {
  font-size: 24rpx;
  color: #6b6a6a;
  line-height: 1.5;
}
.daily-cta {
  margin-top: 6rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #a97826;
  align-self: flex-end;
}
/* 使用指南入口 */
.hero-guide {
  margin-top: 22rpx;
  font-size: 24rpx;
  color: #a97826;
  letter-spacing: 1rpx;
  text-decoration: underline;
}

/* ---------- 首开引导：小白香气小调查 ---------- */
/* 调查弹层：必须置顶（z-index 拉满），覆盖在首页雷达卡之上。
   首页雷达 canvas（type="2d"）处于正常中间层，不抢层级，弹窗永远在其上方。 */
.onb-overlay {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(26, 26, 30, 0.5);
  z-index: 1000; display: flex; align-items: center; justify-content: center;
  padding: 0 48rpx;
}
.onb-card {
  width: 100%; max-width: 620rpx; background: #f6f3ea;
  border-radius: 24rpx; padding: 44rpx 40rpx 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(46, 92, 69, 0.25);
}
.onb-head { text-align: center; margin-bottom: 30rpx; }
.onb-kicker { font-size: 22rpx; color: #a97826; letter-spacing: 4rpx; display: block; font-family: inherit; }
.onb-title { font-size: 34rpx; font-weight: 700; color: #2e5c45; display: block; margin-top: 10rpx; line-height: 1.4; font-family: inherit; }
.onb-dots { display: flex; justify-content: center; gap: 12rpx; margin-top: 20rpx; }
.onb-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: rgba(46, 92, 69, 0.2); }
.onb-dot.on { background: #2e5c45; }

.onb-opts { display: flex; flex-wrap: wrap; gap: 18rpx; justify-content: center; }
.onb-opt {
  width: calc(50% - 9rpx); box-sizing: border-box;
  display: flex; flex-direction: column; align-items: center; gap: 12rpx;
  background: #fff; border: 2rpx solid rgba(46, 92, 69, 0.12);
  border-radius: 16rpx; padding: 30rpx 0;
}
.onb-opt:active { background: #eef3ef; border-color: #2e5c45; }
.onb-opt-label { font-size: 26rpx; color: #2b2b2e; font-weight: 600; }

.onb-result { display: flex; flex-direction: column; gap: 18rpx; }
.onb-reco {
  display: flex; align-items: center; gap: 18rpx;
  background: #fff; border-radius: 16rpx; padding: 18rpx 20rpx;
}
.onb-reco:active { background: #eef3ef; }
.onb-reco-img { width: 96rpx; height: 120rpx; border-radius: 10rpx; flex-shrink: 0; }
.onb-reco-info { flex: 1; min-width: 0; }
.onb-reco-name { font-size: 28rpx; font-weight: 700; color: #2b2b2e; display: block; }
.onb-reco-sub { font-size: 22rpx; color: #9b9b8f; display: block; margin-top: 6rpx; }
.onb-reco-go { font-size: 24rpx; color: #a97826; font-weight: 600; flex-shrink: 0; }
.onb-result-tip { font-size: 22rpx; color: #6b6a6a; line-height: 1.7; margin-top: 6rpx; }
.onb-result-actions { display: flex; gap: 16rpx; margin-top: 8rpx; }
.onb-btn {
  flex: 1; font-size: 26rpx; border-radius: 14rpx; padding: 20rpx 0;
  background: #2e5c45; color: #fff; margin: 0;
}
.onb-btn::after { border: none; }
.onb-btn.ghost { background: #fff; color: #2e5c45; border: 2rpx solid rgba(46, 92, 69, 0.35); }
</style>
