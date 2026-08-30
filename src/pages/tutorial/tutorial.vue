<template>
  <view class="tut">
    <view class="tut-head">
      <text class="tut-title">手把手教你调第一瓶香</text>
      <text class="tut-sub">跟着做，三分钟出一瓶</text>
    </view>

    <view class="tut-list">
      <view class="tut-step" v-for="(s, i) in steps" :key="i">
        <view class="tut-no">{{ i + 1 }}</view>
        <view class="tut-body">
          <text class="tut-step-title">{{ s.t }}</text>
          <text class="tut-step-text">{{ s.d }}</text>
          <view class="tut-tip" v-if="s.tip">
            <text class="tut-tip-label">小提示</text>
            <text class="tut-tip-text">{{ s.tip }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="tut-cta-group">
      <button class="tut-btn ghost" @tap="redoSurvey">重做小调查</button>
      <button class="tut-btn" @tap="goHome">开始调香</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const steps = ref([
  {
    t: '选个起点',
    d: '底部tab切到「图鉴」，选一款你喜欢的名香，点「以这瓶为基调去调香」，它会自动载入工坊。或者首页点「随便来一瓶」也行。',
    tip: '完全不会调也没关系，先选一款跟着改就行。'
  },
  {
    t: '拖滑块改比例',
    d: '工坊顶部有一根「纯水」滑块，下面是 12 个香调滑块。拖动任意一根，雷达图实时变。加香调是从纯水里置换：水让完了，香调之间才互让（总和恒为 100%）。',
    tip: '不知道某个香调是什么味？点名字旁的圆圈ⓘ看释义。'
  },
  {
    t: '套一键模板',
    d: '不想从零调？香调配比面板顶部有4个一键模板（清新草木/温暖木质/甜美花果/清冽水感），点一下打个底，再微调。',
    tip: '模板只是起点，你随便改，改坏了点「撤销」就行。'
  },
  {
    t: '看雷达读懂自己',
    d: '雷达图六个角代表六个气息维度。默认「我的风格」模式看你的内部结构；切「对比名香」模式可以和真实香水横向对比。',
    tip: '雷达下方会实时显示你的气息特征，比如「明亮度·清冽感」。'
  },
  {
    t: '封存成卡',
    d: '满意后点「封存此香」，生成带印章的封存卡。可以保存到相册、分享给朋友。封存瓶数越多，印章层级越高。',
    tip: '封存后还能继续改，每次封存都会记录一版。'
  },
  {
    t: '每日挑战',
    d: '首页有每日挑战卡片，每天一个调香主题。接受挑战后工坊从一杯纯水起步，照着提示自己把主题调出来——答案不会被铺进滑块，调到契合度高即完成。',
    tip: '连续打卡，火苗角标会成长（小火→中火→大火）。'
  }
])

function goHome() {
  uni.navigateBack({ delta: 1 })
}

function redoSurvey() {
  try { uni.setStorageSync('gu_redo_survey', 1) } catch (e) { /* 忽略 */ }
  uni.navigateBack({ delta: 1 })
}
</script>

<style scoped>
.tut {
  min-height: 100vh; background: #f0eee5;
  padding: 48rpx 36rpx calc(60rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.tut-head { margin-bottom: 36rpx; }
.tut-title { font-size: 42rpx; font-weight: 700; color: #2e5c45; display: block; }
.tut-sub { font-size: 24rpx; color: #6b6a6a; margin-top: 8rpx; display: block; }

.tut-step {
  display: flex; gap: 22rpx; background: #f6f3ea;
  border-radius: 16rpx; padding: 28rpx 26rpx; margin-bottom: 18rpx;
}
.tut-no {
  width: 48rpx; height: 48rpx; border-radius: 50%;
  background: #2e5c45; color: #fff; font-size: 26rpx; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.tut-body { flex: 1; }
.tut-step-title { font-size: 30rpx; font-weight: 700; color: #2b2b2e; display: block; margin-bottom: 8rpx; }
.tut-step-text { font-size: 24rpx; color: #3a3a38; line-height: 1.8; }

.tut-tip {
  margin-top: 14rpx; padding: 12rpx 16rpx;
  background: rgba(46, 92, 69, 0.06); border-radius: 8rpx;
  border-left: 6rpx solid #2e5c45;
}
.tut-tip-label { font-size: 20rpx; color: #2e5c45; font-weight: 700; display: block; margin-bottom: 4rpx; }
.tut-tip-text { font-size: 22rpx; color: #6b6a6a; line-height: 1.6; }

.tut-cta-group { display: flex; gap: 16rpx; margin-top: 24rpx; }
.tut-cta-group .tut-btn { flex: 1; margin-top: 0; }

.tut-btn {
  margin-top: 24rpx; width: 100%; font-size: 30rpx; font-weight: 600;
  letter-spacing: 2rpx; border-radius: 16rpx; padding: 26rpx 0;
  background: #2e5c45; color: #fff;
}
.tut-btn::after { border: none; }
.tut-btn.ghost {
  background: #fff; color: #2e5c45; border: 2rpx solid rgba(46, 92, 69, 0.35);
}
</style>
