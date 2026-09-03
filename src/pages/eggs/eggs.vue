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
          <text class="egg-time" v-if="isSealedTime(e.time)">{{ fmt(e.time) }} 达成</text>
        </view>
        <!-- 收藏细节只在点亮后揭晓：未点亮的连条件都不给，保持撞见时的惊喜 -->
        <view class="egg-desc" v-if="e.time">{{ e.desc }}</view>
        <view class="egg-desc egg-locked" v-else>达成后揭晓</view>
        <!-- 只给要集齐 N 项的彩蛋挂进度。不给数字的话用户不知道还差多少，
             翻到一半就放弃了；这里只报数量，不点破是哪几项，保留撞见的惊喜。 -->
        <view class="egg-prog" v-if="e.progress">已翻 {{ e.progress.count }} / {{ e.progress.total }}</view>
      </view>
    </view>

    <view class="foot">已点亮的会讲出自己的来历；没点亮的，只留下名字。—— 调香台见。</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getEggs } from '@/utils/eggs.js'
import { getSeenProgress, SEEN_EGG } from '@/utils/seen.js'
import { isSealedTime } from '@/utils/favorites.js'
import { track } from '@/utils/analytics.js'

const list = ref([])
const achieved = ref(0)
const total = ref(0)

function fmt(t) {
  // 审计 P2-6：损坏/旧版时间戳（字符串、NaN、扫码哈希）会 new Date 出
  // NaN.NaN.NaN；只有真实毫秒时间戳（>1e12）才展示日期。模板层 v-if
  // 同用 isSealedTime 整行隐藏，这里再兜一层防手滑。
  if (!isSealedTime(t)) return ''
  const d = new Date(t)
  const p = (n) => ('' + n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}

onShow(() => {
  track('view_eggs')
  const g = getEggs()
  const sp = getSeenProgress()
  // 进度只挂在「卷末余香」上（唯一一枚集齐型彩蛋）；其余彩蛋不给 progress 字段。
  list.value = g.list.map((e) => (e.key === SEEN_EGG ? { ...e, progress: sp } : e))
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
.head-sub { font-size: 22rpx; color: #6b6a6a; margin-top: 8rpx; display: block; line-height: 1.6; }
.head-progress { margin-top: 18rpx; }
.prog-on { font-size: 44rpx; font-weight: 700; color: #8a5f18; font-family: inherit; }
.prog-total { font-size: 26rpx; color: #6b6a6a; font-family: inherit; }

.egg {
  display: flex; align-items: flex-start; gap: 18rpx;
  background: #f6f3ea; border-radius: 16rpx; padding: 26rpx 24rpx;
  margin-bottom: 18rpx;
  border: 2rpx solid transparent;
}
.egg.on { border-color: rgba(169, 120, 38, 0.35); }
.egg-star { font-size: 36rpx; color: #c9c5b4; line-height: 1.2; flex-shrink: 0; }
.egg.on .egg-star { color: #8a5f18; }
.egg-body { flex: 1; min-width: 0; }
.egg-name-row { display: flex; align-items: baseline; gap: 14rpx; }
.egg-name { font-size: 30rpx; font-weight: 700; color: #b0ae9f; }
.egg.on .egg-name { color: #2e5c45; }
.egg-time { font-size: 20rpx; color: #8a5f18; flex-shrink: 0; }
.egg-desc { font-size: 22rpx; color: #6b6a6a; line-height: 1.7; margin-top: 6rpx; }
.egg.on .egg-desc { color: #6b6a6a; }
.egg-locked { color: #c9c5b4; }
.egg-prog { font-size: 20rpx; color: #a08b6a; margin-top: 10rpx; letter-spacing: 1rpx; }
.egg.on .egg-prog { color: #8a5f18; }

.foot { font-size: 22rpx; color: #b0ae9f; text-align: center; padding: 24rpx 0 6rpx; line-height: 1.7; }
</style>
