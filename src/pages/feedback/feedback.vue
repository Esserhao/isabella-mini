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
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { moderateText, cloudModerate } from '@/utils/moderate.js'
import { track } from '@/utils/analytics.js'

const content = ref('')
const sending = ref(false)
// 页面是否已卸载。提交成功后的延迟返回要挡住「用户自己先返回了」这种情况
let unloaded = false
onUnload(() => { unloaded = true })

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
      uni.showToast({ title: '信已寄出，谢谢你', icon: 'success', duration: 2200 })
      // 页面已卸载就别再退了：用户可能在这 1.6s 内自己点了返回，
      // 定时器照常触发会多退一层，直接退掉用户的上一个页面。
      setTimeout(() => { if (!unloaded) uni.navigateBack() }, 1600)
    } else {
      // 87014 = 审核未通过；其余为写入失败（如集合未建）
      const msg = (r && r.errMsg) || '寄出失败，稍后再试'
      uni.showToast({ title: msg, icon: 'none', duration: 2500 })
    }
    // #endif

    // #ifndef MP-WEIXIN
    // 非微信环境（H5 预览）：无云函数，仅本地审查后提示
    track('feedback_submit')
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

.letter-body { min-height: 320rpx; }
.letter-input {
  width: 100%; min-height: 320rpx;
  font-size: 28rpx; color: #3a3a38; line-height: 2;
  /* 信纸横线感 */
  background-image: repeating-linear-gradient(
    transparent, transparent 54rpx, rgba(169,120,38,0.12) 54rpx, rgba(169,120,38,0.12) 56rpx
  );
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
</style>
