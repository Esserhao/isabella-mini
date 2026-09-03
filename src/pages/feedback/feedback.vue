<template>
  <view class="page">
    <!-- 书信样式：信纸底 + 手写感边框，写给店主的一封信 -->
    <view class="letter">
      <view class="letter-head">
        <text class="letter-to">致 古先生</text>
        <text class="letter-date">{{ today }}</text>
      </view>

      <view class="letter-body">
        <textarea
          class="letter-input"
          v-model="content"
          placeholder="想对这间调香室说的话，都写在这里。&#10;建议、吐槽、想要的功能，我都会认真看。"
          maxlength="500"
          auto-height
        />
      </view>

      <view class="letter-foot">
        <text class="letter-count">{{ content.length }}/500</text>
        <text class="letter-sign">—— 一位调香的人</text>
      </view>
    </view>

    <view class="tip">这封信只有店主能看到，不会公开。</view>

    <button class="send-btn" :disabled="sending" @tap="submit">
      {{ sending ? '寄出中…' : '寄出这封信' }}
    </button>

    <!-- 寄出后的仪式感：全屏「投进邮筒」时刻，点一下即可离开，也会自动返回 -->
    <view v-if="mailed" class="mailed" @tap="leaveMailed">
      <view class="mailed-card">
        <view class="mailed-icon">✉</view>
        <view class="mailed-title">信已投进邮筒</view>
        <view class="mailed-sub">回信若来，会夹在下一瓶香里</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { moderateText } from '@/utils/moderate.js'
import { track } from '@/utils/analytics.js'

const content = ref('')
const sending = ref(false)
// 寄出成功后的「投进邮筒」时刻
const mailed = ref(false)
let mailedTimer = null
// 页面是否已卸载。提交成功后的延迟返回要挡住「用户自己先返回了」这种情况
let unloaded = false
onUnload(() => {
  unloaded = true
  if (mailedTimer) { clearTimeout(mailedTimer); mailedTimer = null }
})

const today = (() => {
  const d = new Date()
  const p = (n) => ('' + n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
})()

async function submit() {
  const text = content.value.trim()
  if (!text) {
    uni.showToast({ title: '先写点什么吧', icon: 'none' })
    return
  }

  // 第一道：本地敏感词粗筛（零延迟）
  const local = moderateText(text)
  if (!local.pass) {
    uni.showToast({ title: local.reason || '内容包含不当用词', icon: 'none', duration: 2500 })
    return
  }

  sending.value = true
  try {
    // 第二道：云端官方审查 + 写入（云函数 submitFeedback）
    // #ifdef MP-WEIXIN
    if (typeof wx === 'undefined' || !wx.cloud) {
      uni.showToast({ title: '寄信功能暂未开通，稍后再试', icon: 'none', duration: 2500 })
      return
    }
    const res = await wx.cloud.callFunction({
      name: 'submitFeedback',
      data: { action: 'submit', content: text }
    })
    const r = res && res.result
    if (r && r.ok) {
      track('feedback_submit')
      content.value = ''
      // 仪式感：先给一段全屏的「投进邮筒」时刻，再回上一页
      mailed.value = true
      mailedTimer = setTimeout(() => { leaveMailed() }, 2600)
    } else {
      // 87014 = 审核未通过；其余为写入失败（如集合未建）
      const msg = (r && r.errMsg) || '寄出失败，稍后再试'
      uni.showToast({ title: msg, icon: 'none', duration: 2500 })
    }
    // #endif

    // #ifndef MP-WEIXIN
    // 非微信环境（H5 预览）：无云函数，仅本地审查后提示。
    // 这里并未真正提交，不记 feedback_submit 埋点（否则数据虚高）
    uni.showToast({ title: '当前环境暂不支持寄信', icon: 'none' })
    // #endif
  } catch (e) {
    // 云函数未部署/网络异常：不吞掉用户的文字，明确告知
    console.warn('[feedback] 提交失败', e)
    uni.showToast({ title: '寄出失败，请确认网络后重试', icon: 'none', duration: 2500 })
  } finally {
    sending.value = false
  }
}

// 离开邮筒时刻：点一下或定时器到点都会走这里。
// 页面已卸载就别再退了：用户可能在这期间自己点了返回，
// 再 navigateBack 会多退一层，直接退掉用户的上一个页面。
function leaveMailed() {
  if (mailedTimer) { clearTimeout(mailedTimer); mailedTimer = null }
  mailed.value = false
  if (!unloaded) uni.navigateBack()
}
</script>

<style scoped>
.page {
  min-height: 100vh; background: #f0eee5;
  padding: 32rpx 28rpx calc(60rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* 信纸 */
.letter {
  background: #fbf8f0;
  border: 2rpx solid rgba(169,120,38,0.35);
  border-radius: 8rpx;
  box-shadow: 0 10rpx 30rpx rgba(46,92,69,0.10);
  padding: 36rpx 32rpx 28rpx;
  position: relative;
}
/* 信纸顶部火漆感装饰线 */
.letter::before {
  content: '';
  position: absolute; top: 14rpx; left: 32rpx; right: 32rpx;
  height: 2rpx; background: rgba(169,120,38,0.25);
}

.letter-head {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 26rpx;
}
.letter-to {
  font-size: 30rpx; font-weight: 700; color: #2e5c45; letter-spacing: 3rpx;
}
.letter-date { font-size: 22rpx; color: #a08b6a; }

.letter-body { min-height: 340rpx; }
.letter-input {
  width: 100%; min-height: 340rpx;
  font-size: 28rpx; color: #3a3a38; line-height: 35rpx;
  padding-top: 14rpx;
  /* 一行横线只容一行字：横线周期=行高(35rpx)；占位符整体下移半个字(14rpx)，横线同步下移保持对齐 */
  background-image: repeating-linear-gradient(
    transparent, transparent 33rpx, rgba(169,120,38,0.15) 33rpx, rgba(169,120,38,0.15) 35rpx
  );
  background-position: 0 14rpx;
}
.letter-input::placeholder {
  line-height: 35rpx;
  color: #a08b6a;
  opacity: 0.7;
}

.letter-foot {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 20rpx;
}
.letter-count { font-size: 20rpx; color: #a08b6a; }
.letter-sign { font-size: 24rpx; color: #6b6a6a; }

.tip {
  font-size: 22rpx; color: #6b6a6a; text-align: center;
  margin: 24rpx 0;
}

.send-btn {
  font-size: 28rpx; color: #fff; background: #2e5c45;
  border-radius: 16rpx; padding: 20rpx 0; margin: 0;
}
.send-btn::after { border: none; }
.send-btn[disabled] { background: #9db3a6; color: #fff; }

/* 投进邮筒时刻：全屏暗幕 + 居中一张卡片，楷体手写感 */
.mailed {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(26, 26, 30, 0.55); z-index: 999;
  display: flex; align-items: center; justify-content: center;
}
.mailed-card {
  background: #fbf8f0; border-radius: 24rpx;
  padding: 56rpx 64rpx; text-align: center;
  box-shadow: 0 8rpx 40rpx rgba(26, 26, 30, 0.2);
}
.mailed-icon { font-size: 64rpx; color: #2e5c45; margin-bottom: 20rpx; }
.mailed-title { font-family: var(--font-hand); font-size: 40rpx; color: #2b2b2e; }
.mailed-sub { font-size: 22rpx; color: #6b6a6a; margin-top: 14rpx; }
</style>
