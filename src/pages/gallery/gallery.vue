<template>
  <view class="gallery">
    <view class="g-tabs">
      <view class="g-tab" :class="{ active: tab === 'perfumes' }" @tap="tab = 'perfumes'">香水</view>
      <view class="g-tab" :class="{ active: tab === 'accords' }" @tap="tab = 'accords'">香调</view>
      <view class="g-tab" :class="{ active: tab === 'ingredients' }" @tap="tab = 'ingredients'">香料</view>
      <view class="g-tab" :class="{ active: tab === 'notes' }" @tap="tab = 'notes'">手记</view>
    </view>

    <!-- 香水列表 -->
    <scroll-view v-show="tab === 'perfumes'" scroll-y class="g-scroll" :show-scrollbar="false">
      <button class="g-random" @tap="randomPick">随便来一瓶（懒人福音）</button>
      <view class="p-card" v-for="(p, i) in perfumes" :key="p.id" :id="i === 0 ? 'coachGalleryCard' : ''" @tap="openPerfume(p)">
        <image class="p-thumb" :src="imgSrc(p.id)" mode="aspectFill"></image>
        <view class="p-info">
          <view class="p-name">{{ p.name }}</view>
          <view class="p-sub">{{ p.brand }} · {{ p.year }}</view>
          <view class="p-hook">「{{ p.hook }}」</view>
          <view class="p-bars">
            <view class="p-bar" v-for="a in topAccords(p.accords)" :key="a.k">
              <text class="p-bar-label">{{ label(a.k) }}</text>
              <view class="p-bar-track"><view class="p-bar-fill" :style="{ width: a.v + '%' }"></view></view>
            </view>
          </view>
        </view>
      </view>
      <view class="g-footer">共 {{ perfumes.length }} 款 · 图鉴收录</view>
    </scroll-view>

    <!-- 香调列表 -->
    <scroll-view v-show="tab === 'accords'" scroll-y class="g-scroll" :show-scrollbar="false">
      <view class="a-grid">
        <view class="a-chip" v-for="a in accords" :key="a.key" @tap="openAccord(a)">
          <image class="a-icon" :src="accordImg(a.key)" mode="aspectFit"></image>
          <text class="a-label">{{ a.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 香料列表（按主导香调分组） -->
    <scroll-view v-show="tab === 'ingredients'" scroll-y class="g-scroll" :show-scrollbar="false">
      <view class="ing-group" v-for="g in ingredientGroups" :key="g.key">
        <view class="ing-group-head">
          <view class="a-dot" :style="{ background: g.color }"></view>
          <text class="ing-group-label">{{ g.label }}</text>
          <text class="ing-group-count">{{ g.items.length }}</text>
        </view>
        <view class="ing-grid">
          <view class="ing-pill" v-for="(ing, i) in g.items" :key="g.key + '-' + i" @tap="openIngredient(ing)">
            <text class="ing-pill-name">{{ ing.name }}</text>
          </view>
        </view>
      </view>
      <view class="g-footer">共 {{ totalIngredients }} 种香料 · 来自调香师工具书</view>
    </scroll-view>

    <!-- 手记（原「笔记」tab 迁入，复用图鉴详情弹层） -->
    <scroll-view v-show="tab === 'notes'" scroll-y class="g-scroll" :show-scrollbar="false">
      <view class="n-card" v-for="(n, i) in notes" :key="i" @tap="openNote(n, i)">
        <view class="n-eyebrow">第 {{ i + 1 }} 篇</view>
        <view class="n-title">{{ noteLabel(n.title) }}</view>
        <view class="n-lead" v-if="n.lead">{{ n.lead }}</view>
        <view class="n-foot">
          <text class="n-date" v-if="n.date">{{ n.date }}</text>
          <text class="n-count">{{ n.sections.length }} 段 · 约 2 分钟</text>
        </view>
      </view>
      <view class="g-footer">共 {{ notes.length }} 篇 · 古先生的调香日记</view>
    </scroll-view>

    <!-- 详情 -->
    <view v-if="sel" class="detail-mask" data-role="mask" @tap="closeDetailIfMask">
      <view class="detail" data-role="detail">
        <view class="detail-bar">
          <button class="detail-back" @tap="closeDetail">← 返回</button>
        </view>
        <scroll-view scroll-y class="detail-scroll" :show-scrollbar="false">
          <template v-if="sel.type === 'perfume'">
            <image class="d-perfume-img" :src="imgSrc(sel.data.id)" mode="aspectFill"></image>
            <view class="d-title">{{ sel.data.name }}</view>
            <view class="d-sub">{{ sel.data.brand }} · {{ sel.data.year }} · 调香师 {{ sel.data.perfumer }}</view>
            <view class="d-hook">「{{ sel.data.hook }}」</view>
            <view class="d-section-title">香气结构</view>
            <view class="d-bar" v-for="a in allAccords(sel.data.accords)" :key="a.k">
              <text class="d-bar-label">{{ label(a.k) }}</text>
              <view class="d-bar-track"><view class="d-bar-fill" :style="{ width: a.v + '%' }"></view></view>
              <text class="d-bar-val">{{ a.v }}%</text>
            </view>
            <view class="d-section-row">
              <view class="d-section-title-wrap">
                <text class="d-section-title">香水六维</text>
                <text class="dim-help" @tap="radarHelpOpen = true">说明 ⓘ</text>
              </view>
              <view class="radar-mode">
                <text class="rm-label" :class="{ on: radarMode === 'relative' }">按比例</text>
                <switch class="rm-switch" :checked="radarMode === 'absolute'" color="#2e5c45" @change="onRadarMode" />
                <text class="rm-label" :class="{ on: radarMode === 'absolute' }">按数值</text>
              </view>
            </view>
            <view class="d-radar-wrap">
              <canvas type="2d" id="galleryRadar" class="d-radar"></canvas>
            </view>
            <view class="d-radar-cap" v-if="selRadarCaption">气息特征：{{ selRadarCaption }}</view>
            <view class="d-section-title">古先生说</view>
            <view class="d-desc">{{ sel.data.description }}</view>
            <button class="d-blend-btn" @tap="blendFromGallery(sel.data)">以这瓶为基调去调香 →</button>
          </template>

          <template v-else-if="sel.type === 'ingredient'">
            <image class="d-accord-img" :src="accordImg(ingMainKey(sel.data.accords))" mode="aspectFit"></image>
            <view class="d-title">{{ sel.data.name }}</view>
            <view class="d-sub">香料 · 调香师工具书</view>
            <view class="d-section-title">香调贡献</view>
            <view class="d-bar" v-for="a in ingAccords(sel.data.accords)" :key="a.k">
              <text class="d-bar-label">{{ label(a.k) }}</text>
              <view class="d-bar-track"><view class="d-bar-fill" :style="{ width: Math.round(a.v * 100) + '%', background: accordColor(a.k) }"></view></view>
              <text class="d-bar-val">{{ Math.round(a.v * 100) }}%</text>
            </view>
            <view class="d-section-title">归类</view>
            <view class="ing-list">
              <view class="ing-item" v-for="(a, i) in ingAccords(sel.data.accords)" :key="i">
                <view class="a-dot" :style="{ background: accordColor(a.k), display: 'inline-block' }"></view>
                <text class="ing-name" style="margin-left: 10rpx;">{{ label(a.k) }}</text>
              </view>
            </view>
          </template>

          <template v-else-if="sel.type === 'note'">
            <view class="d-eyebrow">古先生的调香日记 · 第 {{ sel.index + 1 }} 篇</view>
            <view class="d-title">{{ sel.data.title }}</view>
            <view class="d-sub" v-if="sel.data.date">{{ sel.data.date }}</view>
            <view class="d-note-lead" v-if="sel.data.lead">{{ sel.data.lead }}</view>
            <view class="d-note-sec" v-for="(s, si) in sel.data.sections" :key="si">
              <view class="d-sec-head">{{ s.heading }}</view>
              <view class="d-sec-text">{{ s.text }}</view>
            </view>
            <view class="d-pyramid" v-if="sel.data.pyramid">
              <view class="pyr-row"><text class="pyr-label">前调</text><text class="pyr-val">{{ sel.data.pyramid.top.join('、') }}</text></view>
              <view class="pyr-row"><text class="pyr-label">中调</text><text class="pyr-val">{{ sel.data.pyramid.middle.join('、') }}</text></view>
              <view class="pyr-row"><text class="pyr-label">后调</text><text class="pyr-val">{{ sel.data.pyramid.base.join('、') }}</text></view>
            </view>
          </template>

          <template v-else>
            <image class="d-accord-img" :src="accordImg(sel.data.key)" mode="aspectFit"></image>
            <view class="d-title">{{ sel.data.label }}</view>
            <view class="d-sub">香调家族</view>
            <view class="d-desc">{{ sel.data.description }}</view>
            <view class="d-section-title">代表香料</view>
            <view class="ing-list">
              <view class="ing-item" v-for="(ing, i) in sel.data.typicalIngredients" :key="i">
                <text class="ing-name">{{ ing }}</text>
              </view>
            </view>
          </template>
        </scroll-view>
      </view>
    </view>

    <!-- 六维说明 sheet -->
    <view class="sheet-mask" v-if="radarHelpOpen" @tap="radarHelpOpen = false"></view>
    <view class="sheet" v-if="radarHelpOpen">
      <view class="sheet-title">六维雷达在说什么</view>
      <view class="dim-row" v-for="(d, i) in radarDimList" :key="i">
        <text class="dim-name">{{ d.label }}</text>
        <text class="dim-text">{{ d.desc }}</text>
      </view>
      <button class="sheet-close" @tap="radarHelpOpen = false">知道了</button>
    </view>

    <!-- 手把手教程：暗色聚光灯，高亮图鉴 -->
    <CoachMask page="gallery" />
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { galleryPerfumes, ACCORDS, INGREDIENT_LIBRARY, notesData, RADAR_LABELS, RADAR_DIM_DESC } from '@/utils/data.js'
import { ACCORD_COLORS, THEME } from '@/utils/theme.js'
import { computeRadarValues, radarSummary } from '@/utils/mix.js'
import { drawRadar } from '@/utils/canvas-draw.js'
import { setPendingBlend } from '@/utils/wxacode.js'
import { track } from '@/utils/analytics.js'

function accordColor(key) { return ACCORD_COLORS[key] || '#2e5c45' }

const tab = ref('perfumes')
const perfumes = galleryPerfumes
const accords = ACCORDS
const notes = notesData
const sel = ref(null)
const radarHelpOpen = ref(false)
const radarDimList = RADAR_LABELS.map((lab) => ({ label: lab, desc: RADAR_DIM_DESC[lab] || '' }))
// 雷达视角：默认「结构」（相对值看名香自身气息）；切「绝对」按全局刻度，方便和别的香横比
const radarMode = ref('relative')

// 香水详情六维雷达下方的「气息特征」字幕，帮小白读懂雷达
const selRadarCaption = computed(() => {
  if (sel.value && sel.value.type === 'perfume') {
    // radarSummary 必须吃 6 维雷达数组；传 12 香调对象会崩
    return radarSummary(computeRadarValues(sel.value.data.accords, radarMode.value)).join(' · ')
  }
  return ''
})

const GALLERY_LABELS = {
  citrus: '柑橘', floral: '花香', fruity: '果香', woody: '木质',
  oriental: '东方', fougere: '馥奇', green: '绿意', musk: '麝香',
  amber: '琥珀', vanilla: '香草', tobacco: '烟草', aquatic: '水生'
}
function label(k) { return GALLERY_LABELS[k] || k }

// 本地品牌图（小程序不能加载境外域名）
// 1/3/5/6 下载真实 jpg；2/4 由用户提供的 webp 产品图转 jpg；全部为无水印真实图
const IMG_EXT = { 1: 'jpg', 2: 'jpg', 3: 'jpg', 4: 'jpg', 5: 'jpg', 6: 'jpg', 7: 'jpg', 8: 'jpg', 9: 'jpg', 10: 'jpg', 11: 'jpg' }
// 图鉴图片走 GitHub raw + CDN 加载，不占用主包空间。
// 把小程序的 src/static/gallery/ 目录上传到 GitHub 仓库后，
// 请将下方 GITHUB_RAW 替换为你的仓库实际地址。
const GITHUB_RAW = 'https://raw.githubusercontent.com/Esserhao/isabella-mini/main/src/static/gallery'
function imgSrc(id) { return GITHUB_RAW + '/p' + id + '.' + (IMG_EXT[id] || 'png') }
// 香调矢量图标（SVG→PNG 静态图，体积小保留本地）
function accordImg(key) { return '/static/gallery/accords/' + key + '.png' }

// 香料按主导香调分组
const ingredientGroups = computed(() => {
  const map = {}
  INGREDIENT_LIBRARY.forEach((ing) => {
    const sorted = Object.entries(ing.accords).sort((a, b) => b[1] - a[1])
    const main = sorted[0] ? sorted[0][0] : 'woody'
    if (!map[main]) map[main] = []
    map[main].push(ing)
  })
  return ACCORDS
    .filter((a) => map[a.key])
    .map((a) => ({
      key: a.key,
      label: a.label,
      color: accordColor(a.key),
      items: map[a.key]
    }))
})
const totalIngredients = computed(() => INGREDIENT_LIBRARY.length)

function topAccords(acc) {
  return Object.keys(acc)
    .map((k) => ({ k, v: acc[k] }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
}
function allAccords(acc) {
  return Object.keys(acc)
    .map((k) => ({ k, v: acc[k] }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
}
function ingAccords(acc) {
  return Object.keys(acc || {})
    .map((k) => ({ k, v: acc[k] }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
}

function openPerfume(p) {
  sel.value = { type: 'perfume', data: p }
  // 详情弹层刚打开时 canvas 可能尚未渲染到 DOM，nextTick 不够稳，
  // 再加一层 setTimeout 确保 createSelectorQuery 能取到节点。
  nextTick(() => setTimeout(() => drawPerfumeRadar(p.accords, radarMode.value), 50))
}
function openAccord(a) { sel.value = { type: 'accord', data: a } }
function openIngredient(ing) { sel.value = { type: 'ingredient', data: ing } }
function openNote(n, i) { sel.value = { type: 'note', data: n, index: i } }
function closeDetail() { sel.value = null }
// 仅当点击遮罩层（而非详情内容区）时关闭
function closeDetailIfMask(e) {
  const role = e.target.dataset && e.target.dataset.role
  if (role === 'mask') closeDetail()
}

// 图鉴香水详情里的六维雷达（canvas 2d 程序化绘制）
function drawPerfumeRadar(accords, mode = 'relative') {
  if (!accords) return
  uni.createSelectorQuery().select('#galleryRadar').fields({ node: true, size: true }).exec((res) => {
    if (!res || !res[0] || !res[0].node) return
    const cvs = res[0].node
    const ctx = cvs.getContext('2d')
    if (!ctx) return
    const dpr = uni.getWindowInfo().pixelRatio || 1
    const w = res[0].width || 300
    const h = res[0].height || 300
    cvs.width = Math.max(1, Math.round(w * dpr))
    cvs.height = Math.max(1, Math.round(h * dpr))
    ctx.scale(dpr, dpr)
    drawRadar(ctx, {
      cx: w / 2, cy: h / 2, radius: Math.min(w, h) * 0.36,
      values: computeRadarValues(accords, mode), labels: RADAR_LABELS, theme: THEME
    })
  })
}

function onRadarMode(e) {
  radarMode.value = e.detail.value ? 'absolute' : 'relative'
  if (sel.value && sel.value.type === 'perfume') drawPerfumeRadar(sel.value.data.accords, radarMode.value)
}

// 以图鉴某瓶为基调去工坊调香：暂存配方 → 跳工坊（lab 页 onShow 接住）
function blendFromGallery(p) {
  setPendingBlend(p.accords, p.name)
  track('gallery_blend')
  // showToast 必须在 switchTab 之前调用，否则页面被卸载后 toast 被拒绝
  uni.showToast({ title: '已载入基调，去工坊微调', icon: 'none' })
  uni.switchTab({ url: '/pages/lab/lab' })
}

// 懒人福音：随机挑一瓶图鉴香水载入工坊
function randomPick() {
  const p = galleryPerfumes[Math.floor(Math.random() * galleryPerfumes.length)]
  setPendingBlend(p.accords, p.name)
  track('gallery_random')
  uni.showToast({ title: '已随机载入「' + p.name + '」', icon: 'none' })
  uni.switchTab({ url: '/pages/lab/lab' })
}
// 列表卡只显示冒号前的短标题（"No.5：xxx" → "No.5"），详情里给全名
function noteLabel(title) {
  if (!title) return ''
  const idx = title.indexOf('：')
  if (idx > 0) return title.slice(0, idx)
  const idx2 = title.indexOf(':')
  if (idx2 > 0) return title.slice(0, idx2)
  return title
}
// 香料的主导香调（用于详情配矢量图标）
function ingMainKey(accords) {
  const sorted = Object.entries(accords || {}).sort((a, b) => b[1] - a[1])
  return sorted[0] ? sorted[0][0] : 'woody'
}
</script>

<style scoped>
.gallery { height: 100vh; background: #f0eee5; display: flex; flex-direction: column; box-sizing: border-box; }
.g-tabs { display: flex; background: #e7e3d5; padding: 0 20rpx; }
.g-tab {
  flex: 1; text-align: center; font-size: 28rpx; color: #6b6a6a; padding: 22rpx 0;
  border-bottom: 4rpx solid transparent;
}
.g-tab.active { color: #2e5c45; font-weight: 600; border-bottom-color: #2e5c45; }

.g-scroll { flex: 1; min-height: 0; height: 0; padding: 24rpx 28rpx 60rpx; box-sizing: border-box; }

.p-card {
  display: flex; gap: 20rpx; background: #f6f3ea; border-radius: 18rpx;
  padding: 22rpx; margin-bottom: 20rpx;
}
.p-thumb {
  width: 150rpx; height: 200rpx; border-radius: 14rpx; flex-shrink: 0;
  display: block;
}
.p-info { flex: 1; min-width: 0; }
.p-name { font-size: 32rpx; font-weight: 700; color: #2b2b2e; }
.p-sub { font-size: 22rpx; color: #9b9b8f; margin: 4rpx 0 8rpx; }
.p-hook { font-size: 23rpx; color: #a97826; font-style: italic; line-height: 1.5; margin-bottom: 12rpx; }
.p-bars { display: flex; flex-direction: column; gap: 6rpx; }
.p-bar { display: flex; align-items: center; gap: 10rpx; }
.p-bar-label { font-size: 20rpx; color: #6b6a6a; width: 60rpx; flex-shrink: 0; }
.p-bar-track { flex: 1; height: 8rpx; background: rgba(26,26,30,0.08); border-radius: 4rpx; overflow: hidden; }
.p-bar-fill { height: 100%; background: #2e5c45; border-radius: 4rpx; }

.a-grid { display: flex; flex-wrap: wrap; gap: 18rpx; }
.a-chip {
  display: flex; align-items: center; gap: 14rpx; background: #f6f3ea;
  border-radius: 40rpx; padding: 12rpx 22rpx;
}
.a-icon { width: 48rpx; height: 48rpx; flex-shrink: 0; }
.a-dot { width: 24rpx; height: 24rpx; border-radius: 50%; }
.a-label { font-size: 26rpx; color: #2b2b2e; }

/* 详情大图（香水/香调/香料共用） */
.d-perfume-img {
  width: 100%; height: 460rpx; border-radius: 16rpx;
  display: block; margin-bottom: 24rpx;
}
.d-accord-img {
  width: 200rpx; height: 200rpx; display: block;
  margin: 0 auto 24rpx;
}

.g-footer { font-size: 22rpx; color: #9b9b8f; text-align: center; padding: 20rpx 0 10rpx; }

/* 香料子栏目 */
.ing-group { background: #f6f3ea; border-radius: 18rpx; padding: 22rpx; margin-bottom: 20rpx; }
.ing-group-head { display: flex; align-items: center; gap: 14rpx; margin-bottom: 18rpx; }
.ing-group-label { font-size: 28rpx; font-weight: 700; color: #2e5c45; flex: 1; }
.ing-group-count { font-size: 22rpx; color: #9b9b8f; }
.ing-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.ing-pill {
  background: #fff; border-radius: 30rpx; padding: 12rpx 24rpx;
  border: 1rpx solid rgba(46,92,69,0.08);
}
.ing-pill:active { background: #e7e3d5; }
.ing-pill-name { font-size: 24rpx; color: #2b2b2e; }

.detail-mask {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4);
  z-index: 100; display: flex; align-items: flex-end;
}
.detail {
  width: 100%; height: 88%; background: #f6f3ea; border-radius: 24rpx 24rpx 0 0;
  display: flex; flex-direction: column; overflow: hidden;
}
.detail-bar { padding: 16rpx 24rpx; border-bottom: 2rpx solid rgba(0,0,0,0.05); }
.detail-back {
  font-size: 26rpx; color: #2e5c45; background: #fff; border-radius: 10rpx;
  padding: 8rpx 24rpx; margin: 0; display: inline-block;
}
.detail-back::after { border: none; }
.detail-scroll { flex: 1; min-height: 0; height: 0; padding: 28rpx 32rpx 60rpx; box-sizing: border-box; }
.d-title { font-size: 40rpx; font-weight: 700; color: #2b2b2e; }
.d-sub { font-size: 24rpx; color: #9b9b8f; margin: 8rpx 0 14rpx; }
.d-hook { font-size: 26rpx; color: #a97826; font-style: italic; line-height: 1.6; margin-bottom: 22rpx; }
.d-section-title {
  font-size: 26rpx; font-weight: 600; color: #2e5c45; margin: 26rpx 0 14rpx;
  border-left: 6rpx solid #2e5c45; padding-left: 14rpx;
}
.d-bar { display: flex; align-items: center; gap: 14rpx; margin-bottom: 12rpx; }
.d-bar-label { font-size: 23rpx; color: #6b6a6a; width: 70rpx; flex-shrink: 0; }
.d-bar-track { flex: 1; height: 12rpx; background: rgba(26,26,30,0.08); border-radius: 6rpx; overflow: hidden; }
.d-bar-fill { height: 100%; background: #2e5c45; border-radius: 6rpx; }
.d-bar-val { font-size: 22rpx; color: #a97826; width: 60rpx; text-align: right; flex-shrink: 0; }
.d-desc { font-size: 27rpx; color: #3a3a38; line-height: 1.85; }
/* 香水六维雷达 */
.d-section-row { display: flex; align-items: center; justify-content: space-between; }
.d-section-row .d-section-title { margin-bottom: 0; }
.radar-mode { display: flex; align-items: center; gap: 8rpx; }
.rm-label { font-size: 22rpx; color: #9a958a; }
.rm-label.on { color: #2e5c45; font-weight: 600; }
.rm-switch { transform: scale(0.7); }
.d-radar-wrap { display: flex; justify-content: center; margin: 6rpx 0 4rpx; }
.d-radar { width: 460rpx; height: 460rpx; display: block; }
.d-radar-cap { text-align: center; font-size: 24rpx; color: #2e5c45; letter-spacing: 1rpx; margin-bottom: 6rpx; }
/* 以这瓶为基调去调香 */
.d-blend-btn {
  margin-top: 28rpx; width: 100%; box-sizing: border-box;
  font-size: 28rpx; color: #fff; background: #2e5c45;
  border-radius: 14rpx; padding: 22rpx 0; line-height: 1.4; letter-spacing: 2rpx;
}
.d-blend-btn::after { border: none; }
.d-blend-btn:active { background: #244a37; }
/* 随便来一瓶 */
.g-random {
  width: 100%; box-sizing: border-box; margin-bottom: 20rpx;
  font-size: 26rpx; color: #a97826; background: #fff;
  border: 2rpx solid rgba(169,120,38,0.45); border-radius: 14rpx;
  padding: 20rpx 0; line-height: 1.4;
}
.g-random::after { border: none; }
.g-random:active { background: #f3ead8; }
.ing-list { display: flex; flex-wrap: wrap; gap: 14rpx; }
.ing-item { background: #fff; border-radius: 30rpx; padding: 12rpx 24rpx; }
.ing-name { font-size: 25rpx; color: #2b2b2e; }

/* ---------- 手记子栏目 ---------- */
.n-card {
  background: #f6f3ea; border-radius: 18rpx; padding: 26rpx 24rpx; margin-bottom: 20rpx;
  border-left: 6rpx solid #a97826;
}
.n-card:active { background: #efeadd; }
.n-eyebrow { font-size: 21rpx; color: #a97826; letter-spacing: 3rpx; }
.n-title { font-size: 32rpx; font-weight: 700; color: #2e5c45; line-height: 1.4; margin-top: 10rpx; }
.n-lead {
  font-size: 25rpx; color: #6b6a6a; font-style: italic; line-height: 1.7; margin-top: 12rpx;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
}
.n-foot { display: flex; align-items: baseline; justify-content: space-between; margin-top: 16rpx; gap: 16rpx; }
.n-date { font-size: 21rpx; color: #9b9b8f; flex: 1; min-width: 0; }
.n-count { font-size: 21rpx; color: #b0ae9f; flex-shrink: 0; }

/* 手记详情（复用图鉴详情弹层） */
.d-eyebrow {
  font-size: 22rpx; color: #a97826; letter-spacing: 3rpx; margin-bottom: 16rpx;
}
.d-note-lead {
  font-size: 29rpx; color: #6b6a6a; font-style: italic; line-height: 1.75;
  margin: 22rpx 0 40rpx; padding-left: 20rpx; border-left: 6rpx solid #a97826;
}
.d-note-sec { margin-bottom: 40rpx; }
.d-sec-head { font-size: 28rpx; font-weight: 600; color: #2e5c45; margin-bottom: 12rpx; letter-spacing: 1rpx; }
.d-sec-text { font-size: 27rpx; color: #3a3a38; line-height: 1.9; letter-spacing: 0.5rpx; }
.d-pyramid { background: #fff; border-radius: 14rpx; padding: 26rpx 30rpx; margin-top: 10rpx; }
.pyr-row { display: flex; gap: 18rpx; padding: 10rpx 0; align-items: baseline; }
.pyr-label { font-size: 24rpx; color: #a97826; font-weight: 600; width: 70rpx; flex-shrink: 0; }
.pyr-val { font-size: 25rpx; color: #3a3a38; line-height: 1.6; }

/* 香水六维「说明」入口 + 六维释义底 sheet */
.d-section-title-wrap { display: flex; align-items: baseline; gap: 14rpx; }
.d-section-title-wrap .d-section-title { margin-bottom: 0; }
.dim-help {
  font-size: 22rpx; color: #a97826; font-weight: 600;
  border: 2rpx solid rgba(169,120,38,0.35); border-radius: 20rpx;
  padding: 2rpx 14rpx; line-height: 1.4; flex-shrink: 0;
}
.sheet-mask {
  position: fixed; left: 0; right: 0; top: 0; bottom: 0;
  background: rgba(0,0,0,0.45); z-index: 200;
}
.sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 201;
  background: #f6f3ea; border-radius: 24rpx 24rpx 0 0;
  padding: 36rpx 36rpx calc(40rpx + env(safe-area-inset-bottom));
  max-height: 72vh; overflow-y: auto;
}
.sheet-title { font-size: 32rpx; font-weight: 700; color: #2b2b2e; margin-bottom: 16rpx; }
.dim-row { display: flex; gap: 16rpx; padding: 14rpx 0; border-bottom: 2rpx solid rgba(0,0,0,0.05); }
.dim-name { font-size: 27rpx; font-weight: 700; color: #2e5c45; width: 130rpx; flex-shrink: 0; }
.dim-text { font-size: 25rpx; color: #3a3a38; line-height: 1.6; flex: 1; }
.sheet-close {
  margin-top: 28rpx; width: 100%; font-size: 30rpx; font-weight: 600;
  background: #2e5c45; color: #fff; border-radius: 16rpx; padding: 22rpx 0;
}
.sheet-close::after { border: none; }
</style>
