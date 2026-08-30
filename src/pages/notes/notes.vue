<template>
  <view class="notes">
    <view class="note-layout">
      <!-- 目录 -->
      <view class="note-toc" :class="{ collapsed: tocCollapsed }">
        <view class="toc-header">笔记目录 <text class="toc-count">{{ notesData.length }}</text></view>
        <scroll-view scroll-y class="toc-list" :show-scrollbar="false">
          <view
            v-for="(n, i) in notesData"
            :key="i"
            class="toc-item"
            :class="{ active: i === currentIndex }"
            @tap="selectNote(i)"
          >{{ tocLabel(n.title) }}</view>
        </scroll-view>
      </view>

      <!-- 折叠/展开箭头（半透明，点击收放侧边栏） -->
      <view class="toc-toggle" :class="{ collapsed: tocCollapsed }" @tap="toggleToc">
        <text class="toc-arrow">{{ tocCollapsed ? '›' : '‹' }}</text>
      </view>

      <!-- 正文 -->
      <view class="note-main">
        <view class="note-toolbar">
          <button class="tb-btn" @tap="prev">‹</button>
          <text class="tb-ind">{{ currentIndex + 1 }} / {{ notesData.length }}</text>
          <button class="tb-btn" @tap="next">›</button>
        </view>

        <scroll-view scroll-y class="note-scroll" :show-scrollbar="false">
          <view class="note-inner">
            <!-- 导读封面（首屏，不直接铺正文） -->
            <view v-if="!readStarted" class="note-cover">
              <view class="cover-eyebrow">古先生的调香日记 · 第 {{ currentIndex + 1 }} 篇</view>
              <view class="cover-title">{{ tocLabel(currentNote.title) }}</view>
              <view class="cover-lead">{{ currentNote.lead || '' }}</view>
              <view class="cover-meta" v-if="currentNote.date">{{ currentNote.date }}</view>
              <view class="cover-rule"></view>
              <view class="cover-start" @tap="startRead">开始阅读<text class="cover-arrow">→</text></view>
              <view class="cover-count">{{ currentNote.sections.length }} 段 · 约 2 分钟读完</view>
            </view>

            <!-- 正文（点开始阅读后展开） -->
            <block v-else>
              <view class="note-head">
                <view class="note-title">{{ currentNote.title }}</view>
                <view class="note-meta" v-if="currentNote.date">{{ currentNote.date }}</view>
                <view class="note-rule"></view>
              </view>
              <view class="note-lead" v-if="currentNote.lead">{{ currentNote.lead }}</view>
              <view class="note-section" v-for="(s, si) in currentNote.sections" :key="si">
                <view class="sec-head">{{ s.heading }}</view>
                <view class="sec-text">{{ s.text }}</view>
              </view>
              <view class="note-pyramid" v-if="currentNote.pyramid">
                <view class="pyr-row"><text class="pyr-label">前调</text><text class="pyr-val">{{ currentNote.pyramid.top.join('、') }}</text></view>
                <view class="pyr-row"><text class="pyr-label">中调</text><text class="pyr-val">{{ currentNote.pyramid.middle.join('、') }}</text></view>
                <view class="pyr-row"><text class="pyr-label">后调</text><text class="pyr-val">{{ currentNote.pyramid.base.join('、') }}</text></view>
              </view>
            </block>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { notesData } from '@/utils/data.js'

const currentIndex = ref(0)
const tocCollapsed = ref(false)
const readStarted = ref(false)

// 目录只保留冒号前的内容（如 "No.5：xxx" → "No.5"）
function tocLabel(title) {
  if (!title) return ''
  const idx = title.indexOf('：')
  if (idx > 0) return title.slice(0, idx)
  const idx2 = title.indexOf(':')
  if (idx2 > 0) return title.slice(0, idx2)
  return title
}
function toggleToc() { tocCollapsed.value = !tocCollapsed.value }
function startRead() { readStarted.value = true }

const currentNote = computed(() => {
  const base = notesData[currentIndex.value]
  return {
    title: base.title,
    lead: base.lead,
    date: base.date,
    sections: base.sections,
    pyramid: base.pyramid
  }
})

function selectNote(i) {
  currentIndex.value = i
  readStarted.value = false
}
function prev() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    readStarted.value = false
  }
}
function next() {
  if (currentIndex.value < notesData.length - 1) {
    currentIndex.value++
    readStarted.value = false
  }
}
</script>

<style scoped>
.notes { height: 100vh; background: #f0eee5; box-sizing: border-box; }
.note-layout { display: flex; height: 100%; position: relative; }

.note-toc {
  width: 240rpx; flex-shrink: 0; background: #f0eee5; height: 100%;
  display: flex; flex-direction: column;
  border-right: 2rpx solid rgba(46,92,69,0.08);
  overflow: hidden;
  transition: width 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.note-toc.collapsed { width: 0; }
.toc-header {
  font-size: 24rpx; color: #2e5c45; font-weight: 600; padding: 28rpx 22rpx 16rpx;
  border-bottom: 2rpx solid rgba(46,92,69,0.15);
  white-space: nowrap;
}
.toc-count { color: #a97826; margin-left: 6rpx; }
.toc-list { flex: 1; min-height: 0; padding-top: 14rpx; box-sizing: border-box; }
.toc-item {
  font-size: 23rpx; color: #4a4a48; line-height: 1.5;
  padding: 18rpx 22rpx;
  margin: 0 14rpx 14rpx;
  background: rgba(255,255,255,0.45);
  border-radius: 10rpx;
  position: relative;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  word-break: break-all;
}
.toc-item.active { background: #fff; color: #2e5c45; font-weight: 600; }
.toc-item.active::before {
  content: ''; position: absolute; left: 0; top: 50%;
  transform: translateY(-50%);
  width: 6rpx; height: 40rpx;
  background: #a97826; border-radius: 3rpx;
}

/* 折叠/展开箭头（常驻侧边栏右缘，半透明但清晰可见） */
.toc-toggle {
  position: absolute; left: 240rpx; top: 200rpx;
  transform: translateX(-50%);
  width: 56rpx; height: 56rpx; border-radius: 50%;
  background: rgba(46,92,69,0.12);
  display: flex; align-items: center; justify-content: center;
  z-index: 20; opacity: 0.8;
  transition: left 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease, transform 0.2s ease;
}
.toc-toggle.collapsed { left: 0; opacity: 0.8; }
.toc-toggle:active { opacity: 1; }
.toc-arrow { font-size: 36rpx; color: #2e5c45; line-height: 1; }

.note-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.note-toolbar {
  display: flex; align-items: center; gap: 12rpx; padding: 16rpx 20rpx;
  background: #f0eee5; border-bottom: 2rpx solid rgba(46,92,69,0.08);
}
.tb-btn {
  width: 56rpx; height: 56rpx; line-height: 56rpx; padding: 0; margin: 0;
  background: #fff; color: #2e5c45; border-radius: 10rpx; font-size: 32rpx;
}
.tb-btn::after { border: none; }
.tb-ind { font-size: 24rpx; color: #6b6a6a; }

.note-scroll {
  flex: 1;
  min-height: 0;
  height: 0; /* 关键：让 flex 子项正确计算高度 */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.note-inner { padding: 48rpx 76rpx 100rpx; box-sizing: border-box; }

/* 导读封面（首屏） */
.note-cover {
  display: flex; flex-direction: column; align-items: flex-start;
  padding-top: 60rpx;
}
.cover-eyebrow {
  font-size: 22rpx; color: #a97826; letter-spacing: 3rpx;
  text-transform: uppercase; margin-bottom: 24rpx;
}
.cover-title {
  font-size: 52rpx; font-weight: 700; color: #2e5c45;
  line-height: 1.3; letter-spacing: 1rpx;
}
.cover-lead {
  margin-top: 28rpx; font-size: 32rpx; color: #6b6a6a;
  line-height: 1.7;
}
.cover-meta { margin-top: 28rpx; font-size: 24rpx; color: #7a7970; }
.cover-rule { width: 96rpx; height: 4rpx; background: #a97826; border-radius: 2rpx; margin-top: 36rpx; }
.cover-start {
  margin-top: 44rpx;
  display: flex; align-items: center; gap: 14rpx;
  background: #2e5c45; color: #fff;
  font-size: 30rpx; padding: 22rpx 52rpx; border-radius: 14rpx;
  letter-spacing: 2rpx;
}
.cover-arrow { font-size: 32rpx; line-height: 1; }
.cover-count { margin-top: 28rpx; font-size: 22rpx; color: #b0ae9f; }

/* 正文导语段（editorial lead paragraph） */
.note-lead {
  font-size: 32rpx; color: #6b6a6a;
  line-height: 1.75; margin-bottom: 48rpx; padding-left: 20rpx;
  border-left: 6rpx solid #a97826;
}

.note-head { margin-bottom: 40rpx; }
.note-title { font-size: 38rpx; font-weight: 700; color: #2b2b2e; line-height: 1.5; }
.note-meta { font-size: 24rpx; color: #7a7970; margin-top: 14rpx; }
.note-rule { width: 96rpx; height: 4rpx; background: #a97826; border-radius: 2rpx; margin-top: 30rpx; }
.note-section { margin-bottom: 48rpx; }
.sec-head { font-size: 29rpx; font-weight: 600; color: #2e5c45; margin-bottom: 12rpx; letter-spacing: 1rpx; }
.sec-text { font-size: 27rpx; color: #3a3a38; line-height: 1.9; letter-spacing: 0.5rpx; }

.note-pyramid { margin-top: 20rpx; background: #fff; border-radius: 14rpx; padding: 26rpx 30rpx; }
.pyr-row { display: flex; gap: 18rpx; padding: 10rpx 0; align-items: baseline; }
.pyr-label { font-size: 24rpx; color: #a97826; font-weight: 600; width: 70rpx; flex-shrink: 0; }
.pyr-val { font-size: 25rpx; color: #3a3a38; line-height: 1.6; }

</style>
