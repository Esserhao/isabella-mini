<template>
  <view class="page">
    <!-- 导出：把本机调香记忆打包成一段文本 -->
    <view class="card">
      <view class="hd">
        <view class="hd-icon">✈</view>
        <view class="hd-title">带走行囊</view>
      </view>
      <view class="lead">把调香日记、收藏、彩蛋和翻过的图鉴，都收进一段文字。复制后存进微信收藏或备忘录，换手机时粘贴回来，一样都不少。</view>

      <button v-if="!exportText" class="act-btn" :disabled="packing" @tap="makeArchive">
        {{ packing ? '打包中…' : '整理行囊' }}
      </button>
      <block v-else>
        <textarea class="archive-box" :value="exportText" disabled :maxlength="-1" />
        <view class="box-foot">
          <text class="box-count">{{ exportText.length }} 字</text>
          <text class="box-hint">整段复制，缺一个字符都认不出来</text>
        </view>
        <view class="btn-row">
          <button class="act-btn half" @tap="copyArchive">复制档案</button>
          <button class="act-btn half ghost" @tap="resetExport">收起</button>
        </view>
      </block>
    </view>

    <!-- 导入：粘贴档案文本，智能合并进本机 -->
    <view class="card">
      <view class="hd">
        <view class="hd-icon">❖</view>
        <view class="hd-title">领回行囊</view>
      </view>
      <view class="lead">在新手机上打开这一页，把档案粘贴进来。两边都有的东西会自动合在一起，谁的记忆都不会被挤掉。</view>

      <textarea
        class="paste-box"
        v-model="importText"
        maxlength="50000"
        placeholder="把档案文本完整粘贴到这里"
        placeholder-class="paste-ph"
      />
      <button class="act-btn" :disabled="merging || !importText.trim()" @tap="importArchive">
        {{ merging ? '认领中…' : '认领行囊' }}
      </button>

      <view v-if="mergeResult" class="result">
        <view class="r-title">{{ mergeResult.title }}</view>
        <view v-for="(line, i) in mergeResult.lines" :key="i" class="r-line">{{ line }}</view>
      </view>
    </view>

    <view class="foot-note">档案只在你手里，本店不留底、不上传。</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { track } from '@/utils/analytics.js'
import { collectArchive, serializeArchive, parseArchive, describeArchive, mergeArchive } from '@/utils/archive.js'

const packing = ref(false)
const exportText = ref('')
const importText = ref('')
const merging = ref(false)
const mergeResult = ref(null)

onShow(() => { track('open_archive') })

function makeArchive() {
  packing.value = true
  // collect + serialize 是纯同步计算，历史满 50 条时 JSON 也就几千字，
  // 下一拍再赋值，让「打包中…」至少闪一拍，别让按钮像没反应。
  setTimeout(() => {
    try {
      exportText.value = serializeArchive(collectArchive())
      track('archive_export')
    } catch (e) { /* 忽略 */ }
    packing.value = false
  }, 120)
}

function copyArchive() {
  uni.setClipboardData({
    data: exportText.value,
    success: () => uni.showToast({ title: '已复制，收好', icon: 'none' })
  })
}

function resetExport() {
  exportText.value = ''
}

function mergeDone(sum) {
  const lines = []
  if (sum.history) lines.push(`调香日记并进 ${sum.history} 瓶`)
  if (sum.favorites) lines.push(`收藏并进 ${sum.favorites} 瓶`)
  if (sum.eggs) lines.push(`彩蛋点亮 ${sum.eggs} 枚`)
  if (sum.seen) lines.push(`图鉴翻阅记上 ${sum.seen} 项`)
  if (sum.streak) lines.push('连续天数取了更长的那串')
  if (sum.sealCount) lines.push('累计封存数取了更多的那边')
  if (sum.stats) lines.push(`${sum.stats} 项足迹取了多的一边`)
  // 截断提示一致性（审计 P3）：历史满 50/收藏满 100 各有时机 toast，唯独归档合并
  // 一直静默——档案里更旧的记录被本机上限顶掉时，用户该知道「这份档案没进全」。
  // dropped 只算「远端条目被 cap 挤出」，本机旧条目让位不算（它们仍在列表，只是更靠后）。
  const dropped = sum.dropped || {}
  if (dropped.history) lines.push(`本机日记只留 50 瓶，档案里更旧的 ${dropped.history} 瓶没能并进`)
  if (dropped.favorites) lines.push(`本机收藏只留 100 件，档案里更旧的 ${dropped.favorites} 件没能并进`)
  const partial = dropped.history || dropped.favorites
  if (!lines.length) return { title: '两边已经同步', lines: ['这份档案里的记忆，本机都有。'] }
  return { title: partial ? '收下一部分' : '行囊已归位', lines }
}

function importArchive() {
  const parsed = parseArchive(importText.value)
  if (!parsed.ok) {
    uni.showToast({ title: parsed.error, icon: 'none', duration: 2800 })
    return
  }
  const info = describeArchive(parsed.archive)
  const parts = []
  if (info.history) parts.push(`日记 ${info.history} 瓶`)
  if (info.favorites) parts.push(`收藏 ${info.favorites} 瓶`)
  if (info.eggs) parts.push(`彩蛋 ${info.eggs} 枚`)
  if (info.seen) parts.push(`翻阅 ${info.seen} 项`)
  if (info.sealCount) parts.push(`累计封存 ${info.sealCount} 瓶`)
  if (info.streak) parts.push(`连续 ${info.streak} 天`)
  const summary = parts.length ? `这份档案里有：${parts.join('、')}` : '这份档案是空的'
  uni.showModal({
    title: '认领这份档案？',
    content: summary + '。与本机重合的部分自动合并，不会覆盖你现在的记录。',
    confirmText: '合并进来',
    cancelText: '先不了',
    success: (m) => {
      if (!m.confirm) return
      merging.value = true
      setTimeout(() => {
        try {
          const r = mergeArchive(parsed.archive)
          if (!r.ok) {
            uni.showToast({ title: '合并失败，稍后再试', icon: 'none' })
          } else {
            track('archive_import')
            mergeResult.value = mergeDone(r.sum)
            importText.value = ''
            const dropped = (r.sum.dropped && (r.sum.dropped.history || r.sum.dropped.favorites))
            // 与 result 面板同口径：有档案条目因本机上限没能进全时，toast 也点明，
            // 不让人误以为「整份档案都归位了」
            uni.showToast({ title: dropped ? '本机已满，部分没能并进' : '行囊已归位', icon: 'none', duration: 2500 })
          }
        } catch (e) { /* 忽略 */ }
        merging.value = false
      }, 120)
    }
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh; background: #f0eee5;
  padding: 32rpx 28rpx calc(60rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.card {
  background: #fbf8f0; border-radius: 20rpx;
  padding: 32rpx 28rpx; margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(26, 26, 30, 0.04);
}
.hd { display: flex; align-items: center; gap: 14rpx; margin-bottom: 14rpx; }
.hd-icon { font-size: 34rpx; color: #2e5c45; }
.hd-title { font-size: 32rpx; font-weight: 700; color: #2b2b2e; }

.lead {
  font-size: 24rpx; color: #6b6a6a; line-height: 1.7;
  margin-bottom: 24rpx;
}

.act-btn {
  font-size: 28rpx; color: #fff; background: #2e5c45;
  border-radius: 16rpx; padding: 20rpx 0; margin: 0; width: 100%;
}
.act-btn::after { border: none; }
.act-btn[disabled] { background: #9db3a6; color: #fff; }
.act-btn.half { width: calc(50% - 10rpx); }
.act-btn.ghost { background: transparent; color: #2e5c45; border: 2rpx solid #2e5c45; }
.btn-row { display: flex; justify-content: space-between; margin-top: 16rpx; }

.archive-box, .paste-box {
  width: 100%; box-sizing: border-box;
  background: #f6f3ea; border-radius: 12rpx;
  padding: 20rpx; font-size: 22rpx; line-height: 1.6;
  color: #4a4740; min-height: 160rpx;
}
.paste-box { color: #2b2b2e; }
.archive-box { margin-bottom: 16rpx; max-height: 320rpx; }
.paste-box { margin-bottom: 20rpx; }

.box-foot {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16rpx;
}
.box-count { font-size: 20rpx; color: #a08b6a; }
.box-hint { font-size: 20rpx; color: #9b9b8f; }

.result {
  margin-top: 24rpx; padding: 20rpx 24rpx;
  background: #f6f3ea; border-radius: 12rpx;
}
.r-title { font-size: 26rpx; font-weight: 700; color: #2e5c45; margin-bottom: 8rpx; }
.r-line { font-size: 23rpx; color: #6b6a6a; line-height: 1.8; }

.foot-note {
  font-size: 20rpx; color: #9b9b8f; text-align: center;
  margin-top: 8rpx;
}
</style>
