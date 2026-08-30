<template>
  <view class="page">
    <view class="card">
      <view class="hd">
        <view class="hd-icon">§</view>
        <view class="hd-title">免责声明</view>
      </view>

      <view class="block">
        <view class="b-title">1. 项目性质</view>
        <view class="b-text">「古先生的调香日记」是一个虚拟调香体验与分享日记项目，仅供个人创意表达与记录。所有香水配方、香调描述均为虚构，不涉及真实香水制作、商业销售或任何交易行为。</view>
      </view>

      <view class="block">
        <view class="b-title">2. 用户内容与审查</view>
        <view class="b-text">调香感言、留言等用户生成内容将经过内容安全审查（微信官方接口 + 本地过滤）。不当内容将被拦截或删除，项目运营方不对用户生成内容的准确性或合法性负责。</view>
      </view>

      <view class="block">
        <view class="b-title">3. 信息收集与使用</view>
        <view class="b-text">使用「留言」功能时，我们会收集您的微信 openid 及提交的内容。该信息仅用于接收和回复您的反馈，不会用于其他目的，不会分享给第三方。我们不会收集姓名、电话、位置等个人敏感信息。</view>
      </view>

      <view class="block">
        <view class="b-title">4. 联系我们</view>
        <!-- 这句与下面的邮箱行都可点，统一跳「联系我」页；
             复制按钮只保留在联系页一处，避免出现两个复制入口 -->
        <view class="b-text b-link" @tap="goContact">如对本声明或本项目有任何疑问，请通过以下邮箱联系：</view>
        <view class="b-email" @tap="goContact">
          <text class="b-email-id">{{ EMAIL }}</text>
          <text class="b-email-go">前往联系我 ›</text>
        </view>
      </view>

      <view class="updated">最后更新：2026 年 8 月 20 日</view>
    </view>
  </view>
</template>

<script setup>
import { track } from '@/utils/analytics.js'

// 邮箱与 contact 页保持同源；复制入口只在那边，这里负责把人带过去
const EMAIL = 'zhangxm_411@163.com'

function goContact() {
  track('open_contact')
  uni.navigateTo({ url: '/pages/contact/contact' })
}
</script>

<style scoped>
.page {
  min-height: 100vh; background: #f0eee5;
  padding: 32rpx 28rpx calc(60rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.card {
  background: #fbf8f0;
  border: 2rpx solid rgba(169,120,38,0.25);
  border-radius: 16rpx; padding: 40rpx 32rpx;
  box-shadow: 0 10rpx 30rpx rgba(46,92,69,0.08);
}

.hd { display: flex; align-items: center; gap: 14rpx; margin-bottom: 28rpx; }
.hd-icon {
  width: 56rpx; height: 56rpx; border-radius: 12rpx;
  background: #2e5c45; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 30rpx; font-weight: 700;
}
.hd-title { font-size: 32rpx; font-weight: 700; color: #2e5c45; letter-spacing: 2rpx; }

.block { margin-bottom: 26rpx; }
.b-title { font-size: 26rpx; font-weight: 700; color: #2b2b2e; margin-bottom: 8rpx; }
.b-text { font-size: 24rpx; color: #6b6a6a; line-height: 1.85; }
.b-link:active { opacity: 0.6; }
/* 邮箱入口行：样式与 contact 页的邮箱行同源，点按跳转该页 */
.b-email {
  margin-top: 10rpx;
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border: 2rpx solid rgba(169,120,38,0.30);
  border-radius: 12rpx; padding: 20rpx 24rpx;
}
.b-email:active { background: #f3ead8; }
.b-email-id { font-size: 26rpx; font-weight: 700; color: #8a5f18; }
.b-email-go { font-size: 22rpx; color: #6b6a6a; flex-shrink: 0; }

.updated {
  font-size: 20rpx; color: #6b6a6a; text-align: center;
  margin-top: 32rpx; padding-top: 20rpx;
  border-top: 2rpx solid rgba(26,26,30,0.06);
}
</style>