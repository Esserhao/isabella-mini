<template>
  <view class="page">
    <!-- 空态给行动出口：被分享图拉进来的新客没有历史可点♡，一句话是死胡同 -->
    <view class="empty" v-if="favorites.length === 0">
      <view>还没有收藏。在历史配方里点 ♡，把满意的那瓶留在这里。</view>
      <button class="empty-btn" @tap="goLab">去工坊调一瓶</button>
    </view>
    <view class="sum" v-if="summary">
      <view class="sum-row">
        <text class="sum-num">{{ summary.count }}</text>
        <text class="sum-unit">款</text>
        <text class="sum-meta">我的收藏 · {{ summary.span }}</text>
      </view>
      <view class="sum-pref" v-if="summary.pref">你偏爱的香调：{{ summary.pref }}</view>
    </view>
    <view class="row" v-for="f in visibleFavorites" :key="f.time" @tap="openCard(f)">
      <view class="row-main">
        <view class="row-name">{{ f.name }}</view>
        <view class="row-quote" v-if="f.quote">「{{ f.quote }}」</view>
        <view class="bars">
          <view class="bar" v-for="a in topOf(f.accords)" :key="a.k">
            <text class="bar-label">{{ accordLabel(a.k) }}</text>
            <view class="bar-track"><view class="bar-fill" :style="{ width: a.v + '%', background: a.c }"></view></view>
          </view>
        </view>
        <view class="row-time">{{ formatTime(f.time) }}</view>
      </view>
      <view class="row-actions">
        <view class="row-fav on" @tap.stop="unfav(f)">♥</view>
        <view class="row-del" @tap.stop="del(f)">✕</view>
      </view>
    </view>
    <!-- 审计 P2-5：收藏上限 100，全量渲染低端机首屏卡；分批 20/次，
         触底自动加载 + 底部按钮兜底（内容不满一屏时 onReachBottom 不触发） -->
    <view class="list-more" v-if="favHasMore" @tap="loadMoreFav">
      还有 {{ favRemain }} 条 · 点开更多
    </view>
    <!-- 中13：取消收藏给 5 秒反悔期，底栏一个「撤销」——误触不用去历史里重新找那瓶 -->
    <view class="undo-bar" v-if="undoVisible">
      <text class="undo-text">已取消收藏</text>
      <text class="undo-btn" @tap="undoRemove">撤销</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onReachBottom } from '@dcloudio/uni-app'
import { ACCORDS, SOLVENT } from '@/utils/data.js'
import { accordColor } from '@/utils/theme.js'
import { getFavorites, removeFav, toggleFav, isSealedTime } from '@/utils/favorites.js'
import { track } from '@/utils/analytics.js'

const favorites = ref([])

// 审计 P2-5：列表分批渲染（上限 100，全量 setData 低端机卡）。
// onShow 重置到首屏 20 条，触底/点按钮再 +20；单条增删不重置，保留展开位置。
const FAV_STEP = 20
const favVisible = ref(FAV_STEP)
const visibleFavorites = computed(() => favorites.value.slice(0, favVisible.value))
const favHasMore = computed(() => favVisible.value < favorites.value.length)
const favRemain = computed(() => favorites.value.length - favVisible.value)
function loadMoreFav() {
  favVisible.value = Math.min(favVisible.value + FAV_STEP, favorites.value.length)
}
onReachBottom(() => { if (favHasMore.value) loadMoreFav() })

const accordLabelMap = {}
ACCORDS.forEach((a) => { accordLabelMap[a.key] = a.label })
function accordLabel(k) { return accordLabelMap[k] || k }

// 列表顶部汇总：款数 + 时间跨度 + 偏爱的香调（与历史页同套口径，topOf 已滤纯水）
const summary = computed(() => {
  const arr = favorites.value || []
  if (!arr.length) return null
  // 时间跨度只统计真实封存时间戳：扫码得来的收藏主键是哈希，
  // 混进去会出现「始于 1970.01.01」
  const times = arr.map((x) => x.time).filter(isSealedTime).sort((a, b) => a - b)
  const freq = {}
  arr.forEach((x) => {
    const t = topOf(x.accords)[0]
    if (t) freq[t.k] = (freq[t.k] || 0) + 1
  })
  const topKey = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0]
  return {
    count: arr.length,
    span: times.length
      ? `始于 ${fmtDate(times[0])} · 最近 ${fmtDate(times[times.length - 1])}`
      : '扫码收入 · 还没有自己封存的记录',
    pref: topKey ? accordLabel(topKey) : ''
  }
})
function fmtDate(t) {
  if (!t) return ''
  const d = new Date(t)
  const p = (n) => ('' + n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}

// 取占比最高的 3 个香调做条形预览。两个坑，缺一不可：
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
  // 哈希主键（扫码/分享收藏）不是日期，别拿去 new Date() 弄出 1970/NaN
  if (!isSealedTime(t)) return '扫码得来'
  const d = new Date(t)
  const p = (n) => ('' + n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 空态 CTA：工坊是 tabBar 页，必须 switchTab 而非 navigateTo
function goLab() {
  track('empty_go_lab')
  uni.switchTab({ url: '/pages/lab/lab' })
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
      // 与历史页 openCard 同一遇：三调/雷达模式能带就带（老收藏条目没有则回退，
      // card 页对空 pyramid 自带跳过分支）
      pyramid: item.pyramid,
      radarMode: item.radarMode,
      note: item.note
    })
  } catch (e) { /* 忽略 */ }
  uni.navigateTo({ url: '/pages/card/card?from=seal' })
}

function unfav(f) {
  // removeFav 现在返回写入成败：存储写失败时列表实际没变，
  // 不能弹「已取消」也不能给撤销栏——此时点「撤销」会走一次真删除流程
  if (!removeFav(f.time)) {
    uni.showToast({ title: '没存上，请重试', icon: 'none' })
    return
  }
  favorites.value = getFavorites()
  track('fav_remove')
  // 中13：不直接一句「已取消收藏」完事——记下这条，底部弹 5 秒撤销栏，
  // 点「撤销」原样放回（回到列表最前）。误触代价从「去历史里重新找」降到「点一下」
  lastRemoved = f
  undoVisible.value = true
  if (undoTimer) clearTimeout(undoTimer)
  undoTimer = setTimeout(() => { undoVisible.value = false; lastRemoved = null }, 5000)
}
let lastRemoved = null
let undoTimer = null
const undoVisible = ref(false)
function undoRemove() {
  if (!lastRemoved) return
  const r = toggleFav(lastRemoved)
  if (r === null) {
    // 存储写失败：撤销栏留着，用户可以再点一次
    uni.showToast({ title: '没存上，请重试', icon: 'none' })
    return
  }
  favorites.value = getFavorites()
  undoVisible.value = false
  if (undoTimer) { clearTimeout(undoTimer); undoTimer = null }
  lastRemoved = null
  uni.showToast({ title: '已恢复收藏', icon: 'none' })
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
      if (!removeFav(f.time)) {
        uni.showToast({ title: '没存上，请重试', icon: 'none' })
        return
      }
      favorites.value = getFavorites()
      track('fav_remove')
      uni.showToast({ title: '已删除', icon: 'none' })
    }
  })
}

onShow(() => {
  favorites.value = getFavorites()
  // 重新进页从首屏开始分批展开（新数据长度未知，重置最稳）
  favVisible.value = FAV_STEP
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f0eee5; padding: 24rpx 28rpx 60rpx; box-sizing: border-box; }
/* 空态：整块垂直居中，正文 + 一个行动按钮，别让一句话悬在顶部 */
.empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 36rpx; min-height: 60vh; padding: 40rpx;
  font-size: 24rpx; color: #6b6a6a; text-align: center; line-height: 1.7;
}
.empty-btn {
  margin: 0; font-size: 26rpx; color: #fff; background: #2e5c45;
  border-radius: 12rpx; padding: 14rpx 44rpx; line-height: 1.6;
}
.empty-btn::after { border: none; }
.empty-btn:active { opacity: 0.85; }
.list-more {
  text-align: center; font-size: 22rpx; color: #8a5f18;
  padding: 18rpx 0 6rpx; background: transparent;
}
.list-more:active { opacity: 0.6; }

/* 中13：撤销栏——固定底部，深色底金币字，5 秒后自动消失 */
.undo-bar { position: fixed; left: 28rpx; right: 28rpx; bottom: 48rpx; background: #2b2b2e; color: #fff; border-radius: 14rpx; padding: 20rpx 28rpx; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.18); z-index: 50; }
.undo-text { font-size: 26rpx; }
.undo-btn { font-size: 26rpx; color: #e8c887; font-weight: 600; padding: 4rpx 8rpx; }

/* 列表顶部汇总条：与历史页同款 */
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
