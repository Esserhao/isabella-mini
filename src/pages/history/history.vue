<template>
  <view class="page">
    <view class="empty" v-if="history.length === 0">
      架子还空着。去工坊调一瓶，留下你的气味签名。
    </view>
    <view class="row" v-for="h in history" :key="h.time" @tap="openCard(h)">
      <view class="row-main">
        <view class="row-name">{{ h.name }}</view>
        <view class="row-quote" v-if="h.quote">「{{ h.quote }}」</view>
        <view class="row-note" v-if="h.note">感言：{{ h.note }}</view>
        <view class="bars">
          <view class="bar" v-for="a in topOf(h.accords)" :key="a.k">
            <text class="bar-label">{{ accordLabel(a.k) }}</text>
            <view class="bar-track"><view class="bar-fill" :style="{ width: a.v + '%' }"></view></view>
          </view>
        </view>
        <view class="row-time">{{ formatTime(h.time) }}</view>
      </view>
      <view class="row-actions">
        <view class="row-fav" :class="{ on: favedMap[h.time] }" @tap.stop="fav(h)">
          {{ favedMap[h.time] ? '♥' : '♡' }}
        </view>
        <view class="row-del" @tap.stop="del(h)">🗑</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ACCORDS } from '@/utils/data.js'
import { getFavorites, toggleFav } from '@/utils/favorites.js'
import { track } from '@/utils/analytics.js'

const history = ref([])
const favorites = ref([])

const accordLabelMap = {}
ACCORDS.forEach((a) => { accordLabelMap[a.key] = a.label })
function accordLabel(k) { return accordLabelMap[k] || k }

// 心形状态按 time 建索引，避免每行遍历收藏列表
const favedMap = computed(() => {
  const m = {}
  favorites.value.forEach((f) => { m[f.time] = true })
  return m
})

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

// 走 Storage 传递而非 URL query：调香感言（note）可能上百字，
// JSON+encodeURIComponent 后极易把 url 顶到长度上限，被截断后 card 页 JSON.parse 失败，
// 结果是点开变空卡。封存路径本来就是 storage，这里统一成同一条。
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

function fav(h) {
  const nowFaved = toggleFav(h)
  favorites.value = getFavorites()
  track(nowFaved ? 'fav_add' : 'fav_remove')
  uni.showToast({ title: nowFaved ? '已收藏' : '已取消收藏', icon: 'none' })
}

// 删除单条历史：以封存时间戳（唯一键）filter 移除，不动收藏。
// 删除不可逆，先弹确认；storage 里若被写坏成非数组，filter 前先兜成 []，
// 不能把脏结构原样写回去。
function del(h) {
  uni.showModal({
    title: '删除这条配方？',
    content: `「${h.name || '未命名香氛'}」将从历史中移除，收藏不受影响。`,
    confirmText: '删除',
    confirmColor: '#c45c5c',
    success: (m) => {
      if (!m.confirm) return
      try {
        const list = uni.getStorageSync('isabella_history')
        const arr = Array.isArray(list) ? list : []
        uni.setStorageSync('isabella_history', arr.filter((x) => x.time !== h.time))
      } catch (e) { /* 忽略 */ }
      history.value = history.value.filter((x) => x.time !== h.time)
      track('history_delete')
      uni.showToast({ title: '已删除', icon: 'none' })
    }
  })
}

onShow(() => {
  // storage 可能被外部写坏成非数组，直接赋给 v-for 会渲染异常
  try {
    const list = uni.getStorageSync('isabella_history')
    history.value = Array.isArray(list) ? list : []
  } catch (e) {
    history.value = []
  }
  favorites.value = getFavorites()
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f0eee5; padding: 24rpx 28rpx 60rpx; box-sizing: border-box; }
.empty { font-size: 25rpx; color: #9b9b8f; text-align: center; padding: 120rpx 40rpx; line-height: 1.7; }

.row {
  display: flex; align-items: flex-start; gap: 16rpx;
  background: #f6f3ea; border-radius: 16rpx; padding: 22rpx; margin-bottom: 18rpx;
}
.row:active { background: #efeadd; }
.row-main { flex: 1; min-width: 0; }
.row-name { font-size: 30rpx; font-weight: 700; color: #2b2b2e; }
.row-quote { font-size: 24rpx; color: #6b6a6a; font-style: italic; line-height: 1.6; margin: 8rpx 0 4rpx; }
.row-note { font-size: 23rpx; color: #a97826; line-height: 1.6; margin-bottom: 10rpx; }
.bars { display: flex; flex-direction: column; gap: 6rpx; margin-top: 8rpx; }
.bar { display: flex; align-items: center; gap: 10rpx; }
.bar-label { font-size: 20rpx; color: #6b6a6a; width: 60rpx; flex-shrink: 0; }
.bar-track { flex: 1; height: 8rpx; background: rgba(26,26,30,0.08); border-radius: 4rpx; overflow: hidden; }
.bar-fill { height: 100%; background: #2e5c45; border-radius: 4rpx; }
.row-time { font-size: 21rpx; color: #9b9b8f; margin-top: 12rpx; }

.row-fav {
  flex-shrink: 0; width: 64rpx; height: 64rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 34rpx; color: #b0ae9f; background: #fff;
  border: 2rpx solid rgba(169,120,38,0.20);
}
.row-fav.on { color: #a97826; border-color: rgba(169,120,38,0.55); }
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
  font-size: 30rpx; color: #c45c5c; background: #fff;
  border: 2rpx solid rgba(196, 92, 92, 0.25);
}
.row-del:active { background: #f7e9e9; }
</style>
