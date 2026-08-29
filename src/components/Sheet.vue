<template>
  <transition name="sheet">
    <view v-if="visible" class="sheet-mask" @tap="onMask">
      <view class="sheet-panel" @tap.stop :style="panelStyle">
        <text v-if="title" class="sheet-title">{{ title }}</text>
        <view class="sheet-body"><slot /></view>
        <view v-if="closable" class="sheet-close" @tap="close">关闭</view>
      </view>
    </view>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  closable: { type: Boolean, default: true }
})
const emit = defineEmits(['update:visible', 'close'])
const panelStyle = computed(() => ({
  paddingBottom: 'calc(48rpx + env(safe-area-inset-bottom))'
}))
function onMask() { emit('update:visible', false); emit('close') }
function close() { emit('update:visible', false); emit('close') }
</script>

<style scoped>
.sheet-mask {
  position: fixed; left: 0; right: 0; top: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.45); z-index: 99;
  display: flex; align-items: flex-end;
}
.sheet-panel {
  width: 100%; max-height: 82vh;
  background: #f6f3ea; border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 32rpx 48rpx; box-sizing: border-box;
  display: flex; flex-direction: column;
}
.sheet-title {
  font-size: 30rpx; font-weight: 700; color: #2e5c45;
  display: block; text-align: center; margin-bottom: 24rpx;
  flex-shrink: 0;
}
.sheet-body {
  flex: 1; min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.sheet-close {
  margin-top: 28rpx; width: 100%; font-size: 28rpx; background: #fff;
  color: #6b6a6a; border-radius: 14rpx; padding: 18rpx 0; line-height: 1.4;
  text-align: center;
  flex-shrink: 0;
}

/* 滑入 + 淡出动画 */
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.28s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel { transform: translateY(100%); }
</style>
