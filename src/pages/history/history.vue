<template>
  <view class="page">
    <view class="empty" v-if="history.length === 0">
      架子还空着。去工坊调一瓶，留下你的气味签名。
    </view>
    <view class="sum" v-if="summary">
      <view class="sum-row">
        <text class="sum-num">{{ summary.count }}</text>
        <text class="sum-unit">款</text>
        <text class="sum-meta">历史配方 · 始于 {{ summary.first }} · 最近 {{ summary.last }}</text>
      </view>
      <view class="sum-pref" v-if="summary.pref">你偏爱的香调：{{ summary.pref }}</view>
    </view>
    <view class="row" v-for="h in visibleHistory" :key="h.time" @tap="openCard(h)">
      <view class="row-main">
        <view class="row-name">{{ h.name }}</view>
        <view class="row-quote" v-if="h.quote">「{{ h.quote }}」</view>
        <view class="bars">
          <view class="bar" v-for="a in topOf(h.accords)" :key="a.k">
            <text class="bar-label">{{ accordLabel(a.k) }}</text>
            <view class="bar-track"><view class="bar-fill" :style="{ width: a.v + '%', background: a.c }"></view></view>
          </view>
        </view>
        <view class="row-time">{{ formatTime(h.time) }}</view>
      </view>
      <view class="row-actions">
        <view class="row-fav" :class="{ on: favedMap[h.time] }" @tap.stop="fav(h)">
          {{ favedMap[h.time] ? '♥' : '♡' }}
        </view>
        <view class="row-del" @tap.stop="del(h)">✕</view>
      </view>
    </view>
    <!-- 审计 P2-5：历史最多 50 条，同样分批渲染；触底自动加载 + 按钮兜底 -->
    <view class="list-more" v-if="histHasMore" @tap="loadMoreHist">
      还有 {{ histRemain }} 条 · 点开更多
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onReachBottom } from '@dcloudio/uni-app'
import { ACCORDS, SOLVENT } from '@/utils/data.js'
import { accordColor } from '@/utils/theme.js'
import { getFavorites, toggleFav, isSealedTime } from '@/utils/favorites.js'
import { track } from '@/utils/analytics.js'

const history = ref([])
const favorites = ref([])

// 审计 P2-5：列表分批渲染（上限 50）。onShow 重置首屏 20 条，
// 触底/点按钮 +20；单条删除不重置（slice 自动收窄），保留展开位置。
const HIST_STEP = 20
const histVisible = ref(HIST_STEP)
const visibleHistory = computed(() => history.value.slice(0, histVisible.value))
const histHasMore = computed(() => histVisible.value < history.value.length)
const histRemain = computed(() => history.value.length - histVisible.value)
function loadMoreHist() {
  histVisible.value = Math.min(histVisible.value + HIST_STEP, history.value.length)
}
onReachBottom(() => { if (histHasMore.value) loadMoreHist() })

const accordLabelMap = {}
ACCORDS.forEach((a) => { accordLabelMap[a.key] = a.label })
function accordLabel(k) { return accordLabelMap[k] || k }

// 心形状态按 time 建索引，避免每行遍历收藏列表
const favedMap = computed(() => {
  const m = {}
  favorites.value.forEach((f) => { m[f.time] = true })
  return m
})

// 列表顶部汇总：款数 + 时间跨度 + 收藏者偏爱的香调。让两页不再是「裸列表」，
// 进页先给一个锚点；偏好取各瓶 topOf 第一香调的众数（纯水已滤，见 topOf）。
const summary = computed(() => {
  const arr = history.value || []
  if (!arr.length) return null
  const times = arr.map((x) => x.time).filter(isSealedTime).sort((a, b) => a - b)
  const freq = {}
  arr.forEach((x) => {
    const t = topOf(x.accords)[0]
    if (t) freq[t.k] = (freq[t.k] || 0) + 1
  })
  const topKey = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0]
  return {
    count: arr.length,
    first: fmtDate(times[0]),
    last: fmtDate(times[times.length - 1]),
    pref: topKey ? accordLabel(topKey) : ''
  }
})
function fmtDate(t) {
  // 审计 P2-6：非真实毫秒时间戳（损坏/旧版/哈希）不展示日期
  if (!isSealedTime(t)) return ''
  const d = new Date(t)
  const p = (n) => ('' + n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}

// 取占比最高的 3 个香调做条形预览。两个坑，缺一不可（与收藏页同一套逻辑）：
// ① 必须滤掉纯水 —— 存的是含溶剂的完整配比（BLEND_KEYS = ACCORDS + SOLVENT），
//    不滤的话「水 80%」会稳占第一，而水既没气味也没颜色（只能 fallback 成主绿）。
// ② 滤掉后按剩余香调重新归一到 100 —— 条宽表达的是「香调之间的主次」，
//    不是「占整瓶的百分比」，否则一瓶淡香的三条都只剩一根头发丝。
function topOf(acc) {
  const scented = Object.keys(acc || {})
    .map((k) => ({ k, v: Number(acc[k]) || 0 }))
    .filter((x) => x.v > 0 && x.k !== SOLVENT.key)
  const total = scented.reduce((s, x) => s + x.v, 0)
  if (!total) return []
  return scented
    .map((x) => ({ k: x.k, v: Math.round((x.v / total) * 100), c: accordColor(x.k) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
}

function formatTime(t) {
  // 审计 P2-6：与 fmtDate 同一闸——旧数据里混入的异常时间戳不 new Date
  if (!isSealedTime(t)) return ''
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
      // 三调与雷达模式随记录带上：否则封存卡页重算时回退 relative，
      // 且卡面永远缺「前中后调」区块（与 lab 预览卡不一致）
      pyramid: item.pyramid,
      radarMode: item.radarMode,
      note: item.note
    })
  } catch (e) { /* 忽略 */ }
  uni.navigateTo({ url: '/pages/card/card?from=seal' })
}

function fav(h) {
  const nowFaved = toggleFav(h)
  if (nowFaved === null) {
    // 存储写失败：状态没变，明确要用户重试，不能弹「已取消收藏」假反馈
    uni.showToast({ title: '收藏没存上，请重试', icon: 'none' })
    return
  }
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
  // 重新进页从首屏开始分批展开
  histVisible.value = HIST_STEP
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f0eee5; padding: 24rpx 28rpx 60rpx; box-sizing: border-box; }
.empty { font-size: 24rpx; color: #6b6a6a; text-align: center; padding: 120rpx 40rpx; line-height: 1.7; }
.list-more {
  text-align: center; font-size: 22rpx; color: #8a5f18;
  padding: 18rpx 0 6rpx; background: transparent;
}
.list-more:active { opacity: 0.6; }
.empty { font-size: 24rpx; color: #6b6a6a; text-align: center; padding: 120rpx 40rpx; line-height: 1.7; }

/* 列表顶部汇总条：款数 + 时间跨度 + 偏好香调，给裸列表一个锚点 */
.sum {
  background: #f6f3ea; border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 18rpx;
  border: 1rpx solid rgba(46, 92, 69, 0.10);
}
.sum-row { display: flex; align-items: baseline; gap: 10rpx; }
.sum-num { font-size: 40rpx; font-weight: 700; color: #2e5c45; font-family: inherit; line-height: 1; }
.sum-unit { font-size: 22rpx; color: #6b6a6a; }
.sum-meta { font-size: 22rpx; color: #6b6a6a; margin-left: 6rpx; }
.sum-pref { font-size: 22rpx; color: #8a5f18; margin-top: 8rpx; letter-spacing: 1rpx; }

/* 拍立得小卡：小圆角 + 一道细边，像贴在本子上的一张照片，与封存卡、图鉴拍立得呼应。
   大圆角无描边的色块读起来是「列表项」，不是「一张卡」。 */
.row {
  display: flex; align-items: flex-start; gap: 16rpx;
  background: #f6f3ea; border-radius: 8rpx;
  border: 1rpx solid rgba(26,26,30,0.07);
  padding: 26rpx 24rpx; margin-bottom: 18rpx;
}
.row:active { background: #efeadd; }
.row-main { flex: 1; min-width: 0; }
.row-name { font-size: 30rpx; font-weight: 700; color: #2b2b2e; }
/* 感言用楷体：与封存卡、图鉴拍立得上的手写感文字同一套（App.vue 的 --font-hand） */
.row-quote {
  font-family: var(--font-hand);
  font-size: 24rpx; color: #6b6a6a; line-height: 1.6; margin: 8rpx 0 4rpx;
}
.bars { display: flex; flex-direction: column; gap: 6rpx; margin-top: 8rpx; }
.bar { display: flex; align-items: center; gap: 10rpx; }
.bar-label { font-size: 20rpx; color: #6b6a6a; width: 60rpx; flex-shrink: 0; }
/* 不要灰底轨道：三条上下并列时，靠彼此的长短就能读出主次，不需要刻度槽。
   灰底胶囊 + 纯色填充是表单控件的标准长相，是这一页 AI 感最重的元素。 */
.bar-track { flex: 1; height: 6rpx; border-radius: 3rpx; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 3rpx; }
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
