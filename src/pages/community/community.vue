<template>
  <view class="mine">
    <!-- 我的调香数据（含连续天数） -->
    <view class="stats">
      <view class="stat streak-stat">
        <text class="stat-n">{{ streak > 0 ? streak + '天' : '—' }}</text>
        <text class="stat-l">连续调香</text>
      </view>
      <view class="stat"><text class="stat-n">{{ stats.seal || 0 }}</text><text class="stat-l">封存</text></view>
      <view class="stat"><text class="stat-n">{{ favCount }}</text><text class="stat-l">收藏</text></view>
      <view class="stat"><text class="stat-n">{{ stats.share || 0 }}</text><text class="stat-l">分享</text></view>
    </view>

    <!-- 每日挑战（浅色卡片，与stats区分） -->
    <view class="challenge">
      <view class="ch-body">
        <view class="ch-tag">每日挑战</view>
        <view class="ch-theme">{{ challenge.theme }}</view>
        <view class="ch-hint">根据标题推测香调，来试试</view>
      </view>
      <button class="ch-btn" @tap="acceptChallenge">接受</button>
    </view>

    <!-- 收藏 / 历史：横排入口卡，点击进入独立页面 -->
    <view class="entry-row">
      <view class="entry" @tap="goFavorites">
        <view class="entry-icon fav-icon">♡</view>
        <view class="entry-body">
          <view class="entry-title">我的收藏</view>
          <view class="entry-sub">{{ favCount > 0 ? `${favCount} 瓶心头好` : '把满意的那瓶留下' }}</view>
        </view>
        <text class="entry-arrow">›</text>
      </view>
      <view class="entry" @tap="goHistory">
        <view class="entry-icon hist-icon">⧗</view>
        <view class="entry-body">
          <view class="entry-title">历史配方</view>
          <view class="entry-sub">{{ historyCount > 0 ? `${historyCount} 次调香记录` : '架子还空着' }}</view>
        </view>
        <text class="entry-arrow">›</text>
      </view>
    </view>

    <!-- 彩蛋收藏：记录各彩蛋达成条件与点亮状态 -->
    <view class="menu-group">
      <view class="menu-label">彩蛋</view>
      <view class="menu">
        <view class="menu-item" @tap="goEggs">
          <view class="menu-left">
            <text class="menu-icon egg-icon">✦</text>
            <view class="menu-text">
              <view class="menu-title">彩蛋收藏</view>
              <view class="menu-sub">{{ eggSummary }}</view>
            </view>
          </view>
          <text class="entry-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 档案行囊：导出/导入全部调香记忆，换机不丢 -->
    <view class="menu-group">
      <view class="menu-label">行囊</view>
      <view class="menu">
        <view class="menu-item" @tap="goArchive">
          <view class="menu-left">
            <text class="menu-icon">✈</text>
            <view class="menu-text">
              <view class="menu-title">档案行囊</view>
              <view class="menu-sub">调香记忆打包带走，换机不丢</view>
            </view>
          </view>
          <text class="entry-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 留言建议 / 联系我：点击进入独立页面 -->
    <view class="menu-group">
      <view class="menu-label">关于</view>
      <view class="menu">
        <view class="menu-item" @tap="goFeedback">
          <view class="menu-left">
            <text class="menu-icon">✉</text>
            <view class="menu-text">
              <view class="menu-title">留言建议</view>
              <view class="menu-sub">写封信给我，只有我能看到</view>
            </view>
          </view>
          <text class="entry-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goContact">
          <view class="menu-left">
            <!-- 联系我用 @（邮箱语义），与留言建议的 ✉ 区分 -->
            <text class="menu-icon">@</text>
            <view class="menu-text">
              <view class="menu-title">联系我</view>
              <view class="menu-sub">邮箱联系，欢迎来聊</view>
            </view>
          </view>
          <text class="entry-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goDisclaimer">
          <view class="menu-left">
            <text class="menu-icon">§</text>
            <view class="menu-text">
              <view class="menu-title">免责声明</view>
              <view class="menu-sub">内容审查与信息使用说明</view>
            </view>
          </view>
          <text class="entry-arrow">›</text>
        </view>
        <view class="menu-item" @tap="redoSurvey">
          <view class="menu-left">
            <text class="menu-icon">↻</text>
            <view class="menu-text">
              <view class="menu-title">重做开屏小调查</view>
              <view class="menu-sub">重新回答三道题，换一瓶贴合你的香</view>
            </view>
          </view>
          <text class="entry-arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getDailyChallenge, setDailyChallengeTarget, isChallengeDone, getChallengeScore } from '@/utils/mix.js'
import { getStreak } from '@/utils/streak.js'
import { getStats, track } from '@/utils/analytics.js'
import { getFavorites } from '@/utils/favorites.js'
import { getEggs } from '@/utils/eggs.js'

const favCount = ref(0)
const historyCount = ref(0)
const streak = ref(0)
const stats = ref({})
// 彩蛋总数随 eggs.js 登记表走，别写死
const initEggs = getEggs()
const eggSummary = ref(initEggs.achieved >= initEggs.total
  ? `全部点亮 ${initEggs.total}/${initEggs.total} ✦`
  : `已点亮 ${initEggs.achieved}/${initEggs.total}`)

const challenge = computed(() => getDailyChallenge())

function goFavorites() {
  track('open_favorites')
  uni.navigateTo({ url: '/pages/favorites/favorites' })
}

function goHistory() {
  track('open_history')
  uni.navigateTo({ url: '/pages/history/history' })
}

function goFeedback() {
  track('open_feedback')
  uni.navigateTo({ url: '/pages/feedback/feedback' })
}

function goArchive() {
  track('open_archive')
  uni.navigateTo({ url: '/pages/archive/archive' })
}

function goContact() {
  track('open_contact')
  uni.navigateTo({ url: '/pages/contact/contact' })
}

function goDisclaimer() {
  track('open_disclaimer')
  uni.navigateTo({ url: '/pages/disclaimer/disclaimer' })
}

function goEggs() {
  track('open_eggs')
  uni.navigateTo({ url: '/pages/eggs/eggs' })
}

// 重做开屏小调查：清掉「已完成」标记并让首页 onShow 立即重弹三题。
// gu_onboard_done 一旦写入（答完三题 / 点过"怎么做"）开屏就永不再弹，
// 这是有意设计；本入口提供一条可重复验证与重新匹配的路径。
function redoSurvey() {
  track('redo_survey')
  try {
    uni.removeStorageSync('gu_onboard_done')
    uni.setStorageSync('gu_redo_survey', 1)
  } catch (e) { /* 忽略 */ }
  uni.showToast({ title: '回到首页重答三题', icon: 'none' })
  uni.switchTab({ url: '/pages/home/home' })
}

function acceptChallenge() {
  if (!challenge.value) return
  const accept = () => {
    setDailyChallengeTarget(challenge.value)
    // showToast 必须在 switchTab 之前调用
    uni.showToast({ title: '去工坊调出这个主题', icon: 'none' })
    uni.switchTab({ url: '/pages/lab/lab' })
  }
  // 当天已完成过：再接受 = 从纯水重新来一遍。分数只会被更高的覆盖，
  // 说清楚规则用户才敢放心冲分，否则以为重调会弄丢今天的成绩。
  if (isChallengeDone()) {
    const cur = getChallengeScore()
    uni.showModal({
      title: '今日已完成',
      content: `今天已${cur != null ? `拿下 ${cur}/95` : '完成'}。重调会从头再来，只有分数更高才更新成绩。要再试一次吗？`,
      confirmText: '再来一次',
      cancelText: '先不了',
      success: (m) => { if (m.confirm) accept() }
    })
    return
  }
  accept()
}

onShow(() => {
  // 只取数量，列表渲染交给各自的独立页面
  favCount.value = getFavorites().length
  try {
    const list = uni.getStorageSync('isabella_history')
    historyCount.value = Array.isArray(list) ? list.length : 0
  } catch (e) {
    historyCount.value = 0
  }
  streak.value = getStreak()
  stats.value = getStats()
  const eggs = getEggs()
  eggSummary.value = eggs.achieved >= eggs.total
    ? `全部点亮 ${eggs.total}/${eggs.total} ✦`
    : `已点亮 ${eggs.achieved}/${eggs.total}`
})
</script>

<style scoped>
.mine { min-height: 100vh; background: #f0eee5; padding: 24rpx 28rpx 60rpx; box-sizing: border-box; }

/* 调香数据条（含连续天数） */
.stats {
  display: flex; background: #f6f3ea; border-radius: 16rpx;
  padding: 20rpx 0; margin-bottom: 20rpx;
}
.stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.stat-n { font-size: 34rpx; font-weight: 700; color: #2e5c45; }
.stat-l { font-size: 20rpx; color: #6b6a6a; }
.streak-stat .stat-n { color: #c45c5c; }

/* 每日挑战（浅色卡片，与stats区分） */
.challenge {
  display: flex; align-items: center; gap: 18rpx;
  background: linear-gradient(135deg, #f6f3ea 0%, #ece7d8 100%);
  border: 2rpx solid #2e5c45;
  border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx;
}
.ch-body { flex: 1; min-width: 0; }
.ch-tag { font-size: 22rpx; color: #8a5f18; letter-spacing: 2rpx; }
.ch-theme { font-size: 32rpx; font-weight: 700; color: #2e5c45; margin: 6rpx 0; }
.ch-hint { font-size: 22rpx; color: #6b6a6a; line-height: 1.5; }
.ch-btn {
  flex-shrink: 0; font-size: 26rpx; color: #fff; background: #2e5c45;
  border-radius: 12rpx; padding: 14rpx 30rpx; margin: 0;
}
.ch-btn::after { border: none; }

/* 收藏 / 历史 横排入口卡 */
.entry-row { display: flex; gap: 18rpx; margin-bottom: 24rpx; }
.entry {
  flex: 1; display: flex; align-items: center; gap: 14rpx;
  background: #f6f3ea; border-radius: 16rpx; padding: 24rpx 20rpx;
  min-width: 0;
}
.entry:active { background: #efeadd; }
.entry-icon {
  flex-shrink: 0; width: 64rpx; height: 64rpx; border-radius: 50%;
  background: #fff; border: 2rpx solid rgba(169,120,38,0.30);
  display: flex; align-items: center; justify-content: center;
  font-size: 36rpx; color: #8a5f18;
}
.fav-icon { color: #c45c5c; }
.hist-icon { color: #2e5c45; font-size: 32rpx; }
.entry-body { flex: 1; min-width: 0; }
.entry-title { font-size: 26rpx; font-weight: 700; color: #2b2b2e; }
.entry-sub {
  font-size: 20rpx; color: #6b6a6a; margin-top: 4rpx;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.entry-arrow { flex-shrink: 0; font-size: 36rpx; color: #b0ae9f; line-height: 1; }

/* 留言建议 / 联系我 菜单分组 */
.menu-group { margin-top: 8rpx; }
.menu-label {
  font-size: 22rpx; color: #6b6a6a; letter-spacing: 2rpx;
  margin-bottom: 12rpx; padding-left: 4rpx;
}
.menu {
  background: #f6f3ea; border-radius: 16rpx; overflow: hidden;
}
.menu-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 26rpx 24rpx;
}
.menu-item:active { background: #efeadd; }
.menu-item + .menu-item { border-top: 2rpx solid rgba(26,26,30,0.06); }
.menu-left { display: flex; align-items: center; gap: 18rpx; min-width: 0; }
.menu-icon { font-size: 34rpx; }
.egg-icon { color: #8a5f18; }
.menu-title { font-size: 28rpx; font-weight: 600; color: #2b2b2e; }
.menu-sub { font-size: 20rpx; color: #6b6a6a; margin-top: 4rpx; }
</style>
