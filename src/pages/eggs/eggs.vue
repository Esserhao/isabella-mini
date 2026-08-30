<template>
  <view class="page">
    <view class="head">
      <text class="head-title">彩蛋收藏</text>
      <text class="head-sub">藏在这间调香室里的小惊喜。靠手调出来，不靠运气。</text>
      <view class="head-progress">
        <text class="prog-on">{{ achieved }}</text>
        <text class="prog-total"> / {{ total }}</text>
      </view>
    </view>

    <view class="egg" v-for="e in list" :key="e.key" :class="{ on: e.time }">
      <view class="egg-star">{{ e.time ? '✦' : '✧' }}</view>
      <view class="egg-body">
        <view class="egg-name-row">
          <text class="egg-name">{{ e.name }}</text>
          <text class="egg-time" v-if="e.time">{{ fmt(e.time) }} 达成</text>
        </view>
        <view class="egg-desc">{{ e.desc }}</view>
      </view>
    </view>

    <view class="foot">未点亮的只给条件，不给答案。调香台见。</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getEggs } from '@/utils/eggs.js'
import { track } from '@/utils/analytics.js'

const list = ref([])
const achieved = ref(0)
const total = ref(0)

function fmt(t) {
  const d = new Date(t)
  const p = (n) => ('' + n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}

onShow(() => {
  track('view_eggs')
  const g = getEggs()
  list.value = g.list
  achieved.value = g.achieved
  total.value = g.total
})
</script>

<style scoped>
.page {
  min-height: 100vh; background: #f0eee5;
  padding: 40rpx 32rpx calc(60rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.head { text-align: center; margin-bottom: 32rpx; }
.head-title {
  font-size: 40rpx; font-weight: 700; color: #2e5c45;
  font-family: inherit; letter-spacing: 2rpx; display: block;
}
.head-sub { font-size: 23rpx; color: #9b9b8f; margin-top: 8rpx; display: block; line-height: 1.6; }
.head-progress { margin-top: 18rpx; }
.prog-on { font-size: 44rpx; font-weight: 700; color: #a97826; font-family: inherit; }
.prog-total { font-size: 26rpx; color: #9b9b8f; font-family: inherit; }

.egg {
  display: flex; align-items: flex-start; gap: 18rpx;
  background: #f6f3ea; border-radius: 16rpx; padding: 26rpx 24rpx;
  margin-bottom: 18rpx;
  border: 2rpx solid transparent;
}
.egg.on { border-color: rgba(169, 120, 38, 0.35); }
.egg-star { font-size: 36rpx; color: #c9c5b4; line-height: 1.2; flex-shrink: 0; }
.egg.on .egg-star { color: #a97826; }
.egg-body { flex: 1; min-width: 0; }
.egg-name-row { display: flex; align-items: baseline; gap: 14rpx; }
.egg-name { font-size: 30rpx; font-weight: 700; color: #b0ae9f; }
.egg.on .egg-name { color: #2e5c45; }
.egg-time { font-size: 21rpx; color: #a97826; flex-shrink: 0; }
.egg-desc { font-size: 23rpx; color: #9b9b8f; line-height: 1.7; margin-top: 6rpx; }
.egg.on .egg-desc { color: #6b6a6a; }

.foot { font-size: 22rpx; color: #b0ae9f; text-align: center; padding: 24rpx 0 6rpx; line-height: 1.7; }
</style>
