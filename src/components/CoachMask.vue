<template>
  <view v-if="show" class="coach-root">
    <!-- 暗色遮罩：靠大范围 box-shadow 在目标处「挖洞」，其余压暗，形成明暗对比 -->
    <view class="coach-dim" :style="dimStyle"></view>
    <!-- 透明捕获层：吃掉所有点击，避免误触底层页面 -->
    <view class="coach-capture" @tap="onCaptureTap"></view>
    <!-- 目标亮边：白光描边，让高亮对象从暗背景里「跳」出来 -->
    <view class="coach-ring" :style="ringStyle"></view>
    <!-- 侧边注解卡片 -->
    <view class="coach-card" :style="cardStyle">
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
import { onMounted, watch, computed, ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { tut, TUTORIAL_STEPS, nextStep, prevStep, finishTour, goToPage, stepTotal } from '@/utils/tutorial.js'

const props = defineProps({
  page: { type: String, required: true }
})

const step = computed(() => TUTORIAL_STEPS[tut.index])
const total = stepTotal()
const index1 = computed(() => tut.index + 1)
const isLast = computed(() => tut.index === TUTORIAL_STEPS.length - 1)

// 真正显示：教程激活 + 当前步骤属于本页 + 已取到目标包围盒
const rect = ref(null)
const ready = ref(false)
const show = computed(() => tut.active && step.value && step.value.page === props.page && ready.value)

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

// 注解卡片尺寸（估算），用于决定放在目标上方还是下方
const CARD_W_RPX = 600
const CARD_H_PX = 250

const dimStyle = computed(() => {
  const r = rect.value
  if (!r) return ''
  return `top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;`
})
const ringStyle = computed(() => {
  const r = rect.value
  if (!r) return ''
  return `top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;`
})
const cardStyle = computed(() => {
  const wpx = rpxToPx(CARD_W_RPX)
  let top = 16
  let left = (screen.w - wpx) / 2
  if (rect.value) {
    const r = rect.value
    // 下方放得下就放下方（紧贴目标），否则放上方；都放不下就贴顶
    const below = r.top + r.height + 18
    if (below + CARD_H_PX <= screen.h) top = below
    else {
      const above = r.top - CARD_H_PX - 18
      top = above > 8 ? above : 8
    }
    left = r.left + r.width / 2 - wpx / 2
    left = Math.max(12, Math.min(left, screen.w - wpx - 12))
  }
  return `top:${top}px;left:${left}px;width:${wpx}px;`
})

function tryQuery() {
  measureScreen()
  const s = TUTORIAL_STEPS[tut.index]
  if (!s || s.page !== props.page) {
    ready.value = false
    rect.value = null
    return
  }
  ready.value = false
  // 先滚到目标附近（page 级滚动），再测真实位置
  try { uni.pageScrollTo({ selector: s.target, duration: 160 }) } catch (e) { /* 忽略 */ }
  setTimeout(() => {
    uni.createSelectorQuery().select(s.target).boundingClientRect((r) => {
      if (r && r.width) {
        rect.value = r
        ready.value = true
      } else {
        // 元素还没渲染好（刚切页），稍后重试
        setTimeout(tryQuery, 220)
      }
    }).exec()
  }, 300)
}

function onNext() {
  if (isLast.value) { onFinish(); return }
  const nextPage = TUTORIAL_STEPS[tut.index + 1].page
  nextStep()
  if (nextPage !== props.page) goToPage(nextPage)
  // 同页时 watcher 会触发 tryQuery 重新取位
}
function onPrev() {
  if (tut.index === 0) return
  const prevPage = TUTORIAL_STEPS[tut.index - 1].page
  prevStep()
  if (prevPage !== props.page) goToPage(prevPage)
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
watch(() => tut.index, tryQuery)
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
/* 注解卡片 */
.coach-card {
  position: fixed;
  pointer-events: auto;
  background: #f6f3ea;
  border-radius: 20rpx;
  padding: 32rpx 30rpx 26rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.4);
  box-sizing: border-box;
}
.coach-card-head { display: flex; align-items: center; gap: 14rpx; margin-bottom: 14rpx; }
.coach-no {
  font-size: 22rpx; color: #fff; background: #a97826;
  border-radius: 20rpx; padding: 2rpx 14rpx; flex-shrink: 0;
}
.coach-card-title {
  font-size: 32rpx; font-weight: 700; color: #2e5c45;
  font-family: "Georgia", "Palatino", serif; line-height: 1.3;
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
