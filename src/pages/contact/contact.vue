<template>
  <view class="page">
    <view class="card">
      <view class="avatar">🌿</view>
      <view class="title">古先生</view>
      <view class="desc">调香之外，也欢迎聊聊香水、聊聊生活。</view>

      <view class="email-row">
        <text class="email-label">邮箱</text>
        <text class="email-id" :selectable="true">{{ EMAIL }}</text>
      </view>

      <button class="copy-btn" @tap="copy">复制邮箱地址</button>
      <view class="hint">复制后到邮件客户端粘贴即可</view>
    </view>
  </view>
</template>

<script setup>
import { track } from '@/utils/analytics.js'

// 店主邮箱（唯一联系渠道）
const EMAIL = 'zhangxm_411@163.com'

function copy() {
  uni.setClipboardData({
    data: EMAIL,
    success: () => {
      track('contact_copy')
      uni.showToast({ title: '邮箱已复制', icon: 'success' })
    },
    fail: () => {
      uni.showToast({ title: '复制失败，请长按手动复制', icon: 'none' })
    }
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh; background: #f0eee5;
  padding: 48rpx 28rpx; box-sizing: border-box;
  display: flex; justify-content: center;
}

.card {
  width: 100%; background: #fbf8f0;
  border: 2rpx solid rgba(169,120,38,0.30);
  border-radius: 18rpx; padding: 56rpx 40rpx;
  display: flex; flex-direction: column; align-items: center;
  box-shadow: 0 12rpx 36rpx rgba(46,92,69,0.10);
}

.avatar {
  width: 120rpx; height: 120rpx; border-radius: 50%;
  background: #2e5c45; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 56rpx; margin-bottom: 24rpx;
}

.title { font-size: 34rpx; font-weight: 700; color: #2e5c45; letter-spacing: 2rpx; }
.desc {
  font-size: 24rpx; color: #6b6a6a; line-height: 1.7;
  text-align: center; margin-top: 12rpx;
}

.email-row {
  margin-top: 40rpx; width: 100%;
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border-radius: 12rpx; padding: 24rpx 28rpx;
  border: 2rpx solid rgba(169,120,38,0.20);
}
.email-label { font-size: 26rpx; color: #6b6a6a; }
.email-id { font-size: 28rpx; font-weight: 700; color: #a97826; }

.copy-btn {
  margin-top: 32rpx; width: 100%;
  font-size: 28rpx; color: #fff; background: #2e5c45;
  border-radius: 14rpx; padding: 20rpx 0;
}
.copy-btn::after { border: none; }

.hint { font-size: 21rpx; color: #7a7970; margin-top: 16rpx; }
</style>