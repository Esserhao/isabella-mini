<template>
  <view class="page">
    <view class="empty" v-if="favorites.length === 0">
      还没有收藏。在历史配方里点♡，把你满意的那瓶留在这里。
    </view>
    <view class="row" v-for="f in favorites" :key="f.time" @tap="openCard(f)">
      <view class="row-main">
        <view class="row-name">{{ f.name }}</view>
        <view class="row-quote" v-if="f.quote">「{{ f.quote }}」</view>
        <view class="bars">
          <view class="bar" v-for="a in topOf(f.accords)" :key="a.k">
            <text class="bar-label">{{ accordLabel(a.k) }}</text>
            <view class="bar-track"><view class="bar-fill" :style="{ width: a.v + '%' }"></view></view>
          </view>
        </view>
        <view class="row-time">{{ formatTime(f.time) }}</view>
      </view>
      <view class="row-actions">
        <view class="row-fav on" @tap.stop="unfav(f)">♥</view>
        <view class="row-del" @tap.stop="del(f)">✕</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ACCORDS } from '@/utils/data.js'
import { getFavorites, removeFav } from '@/utils/favorites.js'
import { track } from '@/utils/analytics.js'

const favorites = ref([])

const accordLabelMap = {}
ACCORDS.forEach((a) => { accordLabelMap[a.key] = a.label })
function accordLabel(k) { return accordLabelMap[k] || k }

// 取占比最高的 3 个香调做条形预览
function topOf(acc) {
  return Object.keys(acc || {})
    .map((k) => ({ k, v: acc[k] || 0 }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const p = (n) => ('' + n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 点整行进封存卡页。与历史配方页同一条路：走 Storage 不走 URL query，
// note 可能上百字，塞进 url 会被截断，card 页 JSON.parse 失败就成空卡。
function openCard(item) {
  try {
    uni.setStorageSync('isabella_card_data', {
      time: item.time,
      name: item.name,
      accords: item.accords,
      quote: item.quote,
      formula: item.formula,
      note: item.note
    })
  } catch (e) { /* 忽略 */ }
  uni.navigateTo({ url: '/pages/card/card?from=seal' })
}

function unfav(f) {
  removeFav(f.time)
  favorites.value = getFavorites()
  track('fav_remove')
  uni.showToast({ title: '已取消收藏', icon: 'none' })
}

// 删除收藏：与右侧 ♥ 同一存储操作，但走确认弹窗——
// ♥ 是「顺手取消」，✕ 是「明确删掉」，语义分开，误触代价不同。
function del(f) {
  uni.showModal({
    title: '删除这条收藏？',
    content: `「${f.name || '未命名香氛'}」将从收藏中移除，历史记录不受影响。`,
    confirmText: '删除',
    confirmColor: '#c45c5c',
    success: (m) => {
      if (!m.confirm) return
      removeFav(f.time)
      favorites.value = getFavorites()
      track('fav_remove')
      uni.showToast({ title: '已删除', icon: 'none' })
    }
  })
}

onShow(() => {
  favorites.value = getFavorites()
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f0eee5; padding: 24rpx 28rpx 60rpx; box-sizing: border-box; }
.empty { font-size: 24rpx; color: #6b6a6a; text-align: center; padding: 120rpx 40rpx; line-height: 1.7; }

.row {
  display: flex; align-items: flex-start; gap: 16rpx;
  background: #f6f3ea; border-radius: 16rpx; padding: 22rpx; margin-bottom: 18rpx;
}
.row:active { background: #efeadd; }
.row-main { flex: 1; min-width: 0; }
.row-name { font-size: 30rpx; font-weight: 700; color: #2b2b2e; }
.row-quote { font-size: 24rpx; color: #6b6a6a; line-height: 1.6; margin: 8rpx 0 4rpx; }
.bars { display: flex; flex-direction: column; gap: 6rpx; margin-top: 8rpx; }
.bar { display: flex; align-items: center; gap: 10rpx; }
.bar-label { font-size: 20rpx; color: #6b6a6a; width: 60rpx; flex-shrink: 0; }
.bar-track { flex: 1; height: 8rpx; background: rgba(26,26,30,0.08); border-radius: 4rpx; overflow: hidden; }
.bar-fill { height: 100%; background: #2e5c45; border-radius: 4rpx; }
.row-time { font-size: 20rpx; color: #6b6a6a; margin-top: 12rpx; }

.row-fav {
  flex-shrink: 0; width: 64rpx; height: 64rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 34rpx; color: #b0ae9f; background: #fff;
  border: 2rpx solid rgba(169,120,38,0.20);
}
.row-fav.on { color: #8a5f18; border-color: rgba(169,120,38,0.55); }
.row-fav:active { background: #f0eee5; }

/* 收藏 + 删除纵向并排 */
.row-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.row-del {
  width: 64rpx; height: 64rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 34rpx; font-weight: 700; color: #c45c5c; background: #fff;
  border: 2rpx solid rgba(196, 92, 92, 0.25);
}
.row-del:active { background: #f7e9e9; }
</style>
