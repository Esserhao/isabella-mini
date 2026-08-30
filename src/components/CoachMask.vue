<template>
  <view v-if="cardShown" class="coach-root">
    <!-- 遮罩 / 亮框必须等取到目标包围盒才画，否则会先在一个错误位置闪一下 -->
    <template v-if="show">
      <!-- 暗色遮罩：靠大范围 box-shadow 在目标处「挖洞」，其余压暗，形成明暗对比 -->
      <view class="coach-dim" :style="dimStyle"></view>
      <!-- 透明捕获层：吃掉所有点击，避免误触底层页面 -->
      <view class="coach-capture" @tap="onCaptureTap"></view>
      <!-- 目标亮边：白光描边，让高亮对象从暗背景里「跳」出来 -->
      <view class="coach-ring" :style="ringStyle"></view>
    </template>
    <!-- 侧边注解卡片。
         取位期间也保持渲染（透明、不挡点击）：先量到真实高度，再决定放上方还是下方。
         以前靠 250px 的拍脑袋估算，实际卡片只有 145px 上下，
         估算偏大会把本该放下方（紧贴目标）的卡片顶到上方去，中间空一大块。 -->
    <view class="coach-card coach-annot" :class="{ 'is-ready': ready }" :style="cardStyle">
      <view class="coach-card-head">
        <text class="coach-no">{{ index1 }}/{{ total }}</text>
        <text class="coach-card-title">{{ step.title }}</text>
      </view>
      <text class="coach-card-text">{{ step.text }}</text>

      <view v-if="isLast" class="coach-detail" @tap="onDetail">查看详细图文指南 ›</view>

      <view class="coach-actions">
        <text class="coach-skip" @tap="onSkip">跳过</text>
        <view class="coach-nav">
          <button v-if="tut.index > 0" class="coach-btn ghost" @tap="onPrev">上一步</button>
          <button v-if="!isLast" class="coach-btn" @tap="onNext">下一步</button>
          <button v-else class="coach-btn" @tap="onFinish">完成</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onMounted, watch, computed, ref, reactive, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { tut, TUTORIAL_STEPS, nextStep, prevStep, finishTour, goToPage, stepTotal } from '@/utils/tutorial.js'
import { placeCard, paddedHole, desiredScrollTop } from '@/utils/coach-layout.js'

const props = defineProps({
  page: { type: String, required: true }
})

const step = computed(() => TUTORIAL_STEPS[tut.index])
const total = stepTotal()
const index1 = computed(() => tut.index + 1)
const isLast = computed(() => tut.index === TUTORIAL_STEPS.length - 1)

// 本页是否轮到：这决定注解卡片要不要渲染（取位期间也渲染，只是透明）
const cardShown = computed(() => tut.active && !!step.value && step.value.page === props.page)
// 真正显示：教程激活 + 当前步骤属于本页 + 已取到目标包围盒
const rect = ref(null)
const ready = ref(false)
const show = computed(() => cardShown.value && ready.value)

const screen = reactive({ w: 375, h: 667 })
function measureScreen() {
  try {
    const info = (uni.getWindowInfo && uni.getWindowInfo()) || uni.getSystemInfoSync()
    screen.w = info.windowWidth || info.screenWidth || 375
    screen.h = info.windowHeight || info.screenHeight || 667
  } catch (e) { /* 忽略 */ }
}

// rpx→px：750rpx 约等于屏幕宽
function rpxToPx(v) { return screen.w * (v / 750) }

const CARD_W_RPX = 600
// 卡片高度的兜底估算：只在还没量到真实高度时用（首帧）。
// 取「偏小」而不是「偏大」——偏大会让卡片被顶到目标上方、中间空一大块；
// 偏小最坏只是贴底，下面还有夹紧兜着。最后一步多一行「查看详细图文指南」。
const CARD_H_FALLBACK = 170
// 量到的真实高度（px）。卡片在取位期间是渲染着的（透明），所以量得到。
const cardH = ref(0)
function measureCard() {
  if (!cardShown.value) return
  nextTick(() => {
    // 注意不能只写 .coach-card：工坊页自己也有一张 .coach-card（首次进工坊的蒙层），
    // select 取的是文档顺序里的第一个，会量错。coach-annot 是本组件独有的。
    uni.createSelectorQuery().select('.coach-annot').boundingClientRect((r) => {
      if (r && r.height) cardH.value = r.height
    }).exec()
  })
}
watch([cardShown, () => tut.index], measureCard)

// 卡片高度：量到实测值就用实测值，否则用兜底估算
function cardHeight() {
  return cardH.value || (isLast.value ? CARD_H_FALLBACK + 30 : CARD_H_FALLBACK)
}

// 几何计算放在 coach-layout.js 里（纯函数），便于脚本在没有 DOM 的环境下验证
const hole = computed(() => paddedHole(rect.value))

const dimStyle = computed(() => {
  const h = hole.value
  if (!h) return ''
  return `top:${h.top}px;left:${h.left}px;width:${h.width}px;height:${h.height}px;`
})
const ringStyle = dimStyle
const cardStyle = computed(() => {
  const wpx = rpxToPx(CARD_W_RPX)
  if (!rect.value) {
    return `top:16px;left:${Math.round((screen.w - wpx) / 2)}px;width:${wpx}px;`
  }
  const plan = placeCard({
    screenW: screen.w,
    screenH: screen.h,
    rect: rect.value,
    cardW: wpx,
    cardH: cardHeight()
  })
  return `top:${plan.top}px;left:${plan.left}px;width:${wpx}px;`
})

// 目标始终量不到时给个兜底框（屏幕中段）。宁可高亮位置不精确，
// 也不能像以前那样无限重试、把整个引导流程卡死在半路。
function fallbackRect() {
  const w = Math.min(screen.w - 48, 300)
  return {
    top: Math.round(screen.h * 0.32),
    left: Math.round((screen.w - w) / 2),
    width: w,
    height: 120
  }
}

// 一次定位最多重试 6 次（约 1.3s），量不到就走兜底
const MAX_TRY = 6
// 每轮定位一个令牌：上一轮残留的重试回调带着旧令牌会被直接丢弃，
// 否则快速连点「下一步」时，旧步骤的位置会盖掉新步骤的位置。
let queryToken = 0

function tryQuery() {
  const token = ++queryToken
  measureScreen()
  const s = TUTORIAL_STEPS[tut.index]
  // 教程没开、或这一步不属于本页：立刻收起，别留着上一页的旧亮框
  if (!tut.active || !s || s.page !== props.page) {
    ready.value = false
    rect.value = null
    return
  }
  ready.value = false
  // 必须等一帧再测：教程一激活，首页/工坊的雷达 canvas 会被 display:none，
  // 页面整体上移。早测一帧拿到的就是移动前的旧坐标，亮框直接错位。
  nextTick(() => {
    if (token !== queryToken) return
    scrollIntoView(s, () => measure(s, 0, token))
  })
}

// 只把「贴顶 / 沉底」的目标挪到舒服的位置。
// boundingClientRect 返回的就是视口坐标，不用自己减 scrollTop。
// 先量再决定要不要滚：目标本来就看得见就别动页面，免得每换一步都白跳一次。
function scrollIntoView(s, done) {
  uni.createSelectorQuery()
    .selectViewport().scrollOffset()
    .select(s.target).boundingClientRect()
    .exec((res) => {
      const so = res && res[0]
      const r = res && res[1]
      // 量不到（还没渲染 / 被 v-show 藏了）就交给 measure 去重试
      if (!r || !r.width) { setTimeout(done, 60); return }
      // 先用当前位置试摆一次：只有「卡片会压住目标」时才滚。
      // 以前是只要目标贴顶/沉底就滚，首页第 1 步→第 2 步这种相邻目标会白跳一下。
      const want = desiredScrollTop({
        screenH: screen.h,
        rectTop: r.top,
        rectHeight: r.height,
        scrollTop: (so && typeof so.scrollTop === 'number') ? so.scrollTop : 0,
        cardH: cardHeight()
      })
      if (want === null) { setTimeout(done, 60); return }
      // 图鉴页是 scroll-view，pageScrollTo 对它会静默失败——不致命，量得到就行
      try { uni.pageScrollTo({ scrollTop: want, duration: 0 }) } catch (e) { /* 忽略 */ }
      setTimeout(done, 160)
    })
}

// 至少得有一部分落在视口里。量到了但整块在屏幕外（列表还没滚到位）时，
// 聚光灯就照了个寂寞，不如重试等它滚过来。
function inView(r) {
  return r.top + r.height > 40 && r.top < screen.h - 40
}

function measure(s, attempt, token) {
  uni.createSelectorQuery().select(s.target).boundingClientRect((r) => {
    if (token !== queryToken) return
    // v-show 隐藏的元素会返回宽高为 0，不能只判 width
    if (r && r.width > 0 && r.height > 0 && inView(r)) {
      rect.value = r
      ready.value = true
      // 复测一次：图片加载完、或 canvas 隐藏引起的二次回流，会把目标再顶一下
      setTimeout(() => { if (token === queryToken) correct(s, token) }, 200)
      return
    }
    if (attempt < MAX_TRY) {
      setTimeout(() => measure(s, attempt + 1, token), 220)
      return
    }
    console.warn('[CoachMask] 教程目标不可见，已兜底定位：', s.target)
    rect.value = fallbackRect()
    ready.value = true
  }).exec()
}

function correct(s, token) {
  uni.createSelectorQuery().select(s.target).boundingClientRect((r) => {
    if (token !== queryToken || !r || !r.width || !inView(r)) return
    const old = rect.value
    if (!old || Math.abs(old.top - r.top) > 2 || Math.abs(old.left - r.left) > 2) rect.value = r
  }).exec()
}

function onNext() {
  if (isLast.value) { onFinish(); return }
  // 先取「下一步落在哪一页」，再递增——顺序反了就会跳错页
  const next = TUTORIAL_STEPS[tut.index + 1]
  if (!next) { onFinish(); return }
  nextStep()
  // 跨页：switchTab 会触发目标页的 onShow，由那一页的 CoachMask 接手定位。
  // 同页：tut.index 变化触发 watcher，本组件自行重新取位。
  if (next.page !== props.page) goToPage(next.page)
}
function onPrev() {
  if (tut.index === 0) return
  const prev = TUTORIAL_STEPS[tut.index - 1]
  if (!prev) return
  prevStep()
  if (prev.page !== props.page) goToPage(prev.page)
}
function onSkip() { finishTour() }
function onFinish() {
  finishTour()
  uni.showToast({ title: '教程完成，去调一瓶吧！', icon: 'none' })
}
function onDetail() {
  finishTour()
  uni.navigateTo({ url: '/pages/tutorial/tutorial' })
}
function onCaptureTap() { /* 点暗处不动作，避免误跳过 */ }

onMounted(tryQuery)
onShow(tryQuery)
// 两个都要听：startTour() 时 index 可能本来就是 0（没变），
// 只听 index 的话教程开了也不会重新取位，亮框就停在上次那个旧坐标上。
watch([() => tut.active, () => tut.index], () => { tryQuery() })
</script>

<style scoped>
.coach-root {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0;
  z-index: 2000;
}
/* 暗色遮罩：透明本体 + 超大扩散阴影，把除目标外的区域压暗 */
.coach-dim {
  position: fixed;
  pointer-events: none;
  box-sizing: border-box;
  border-radius: 16rpx;
  box-shadow: 0 0 0 9999px rgba(18, 18, 22, 0.74);
}
/* 透明捕获层：吃掉所有点击 */
.coach-capture {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0;
  pointer-events: auto;
}
/* 目标亮边：白光描边，从暗背景里突出对象 */
.coach-ring {
  position: fixed;
  pointer-events: none;
  box-sizing: border-box;
  border-radius: 16rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 16rpx 4rpx rgba(255, 255, 255, 0.5);
}
/* 注解卡片。
   取位期间（ready=false）保持渲染但透明：既能量到真实高度，又不会先闪在错误位置。 */
.coach-card {
  position: fixed;
  pointer-events: none;
  opacity: 0;
  background: #f6f3ea;
  border-radius: 20rpx;
  padding: 32rpx 30rpx 26rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.4);
  box-sizing: border-box;
}
.coach-card.is-ready {
  pointer-events: auto;
  opacity: 1;
}
.coach-card-head { display: flex; align-items: center; gap: 14rpx; margin-bottom: 14rpx; }
.coach-no {
  font-size: 22rpx; color: #fff; background: #a97826;
  border-radius: 20rpx; padding: 2rpx 14rpx; flex-shrink: 0;
}
.coach-card-title {
  font-size: 32rpx; font-weight: 700; color: #2e5c45;
  font-family: inherit; line-height: 1.3;
}
.coach-card-text {
  display: block; font-size: 26rpx; color: #3a3a38; line-height: 1.75;
}
.coach-detail {
  display: inline-block; margin-top: 16rpx;
  font-size: 24rpx; color: #a97826; font-weight: 600;
}
.coach-actions {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 22rpx;
}
.coach-skip { font-size: 24rpx; color: #9b9b8f; }
.coach-nav { display: flex; gap: 14rpx; }
.coach-btn {
  font-size: 26rpx; border-radius: 14rpx; padding: 14rpx 28rpx; margin: 0;
  line-height: 1.3; background: #2e5c45; color: #fff;
}
.coach-btn::after { border: none; }
.coach-btn.ghost { background: #fff; color: #2e5c45; border: 2rpx solid rgba(46, 92, 69, 0.35); }
</style>
