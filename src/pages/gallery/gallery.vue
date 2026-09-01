<template>
  <view class="gallery">
    <view class="g-tabs">
      <view class="g-tab" :class="{ active: tab === 'perfumes' }" @tap="tab = 'perfumes'">香水</view>
      <view class="g-tab" :class="{ active: tab === 'accords' }" @tap="tab = 'accords'">香调</view>
      <view class="g-tab" :class="{ active: tab === 'ingredients' }" @tap="tab = 'ingredients'">香料</view>
      <view class="g-tab" :class="{ active: tab === 'notes' }" @tap="tab = 'notes'">手记</view>
    </view>

    <!-- 香水：拍立得卡片组，左右滑。
         原来是竖排「商品列表卡」（左图右文＋灰底进度条）——整页 AI 感的来源。
         换成相册式拍立得：白框＋照片＋手写感短句，翻相册而不是挑货。

         给教程留了两个复位，缺一不可：
         ① :scroll-top —— 用户若把内容往下滑过，第一张卡滚出视口就量不到尺寸；
         ② deckIndex 归 0 —— swiper 横滑后第一张卡被推出屏幕外，竖向滚动救不回来。
         见下方 ensureCoachTargetVisible。 -->
    <scroll-view v-show="tab === 'perfumes'" scroll-y class="g-scroll" :show-scrollbar="false" :scroll-top="listScrollTop">
      <!-- circular 会复制首尾节点做无缝循环，教程期间必须关掉：
           第 3 步高亮的 #coachGalleryCard 绑在第一张卡上，节点被复制后
           createSelectorQuery 可能选中屏幕外的副本，聚光灯画到屏幕外 → 引导卡死在 3/5。
           ensureCoachTargetVisible 只管切 tab 和 deckIndex 归零，救不了这个（成因不同）。
           关掉后首尾滑动到边界会停住，但教程期间用户本就跟着引导走，可接受。 -->
      <swiper class="deck" :current="deckIndex" :circular="!tut.active"
              previous-margin="70rpx" next-margin="70rpx"
              @change="onDeckChange">
        <swiper-item v-for="(p, i) in perfumes" :key="p.id">
          <view class="deck-cell">
            <view class="pol" :id="i === 0 ? 'coachGalleryCard' : ''"
                  :style="{ transform: cardTransform(i) }" @tap="openPerfume(p)">
              <view class="pol-tape"></view>
              <view class="pol-photo">
                <image class="pol-img" :src="imgSrc(p.id)" mode="aspectFill"
                       :style="{ background: imgBg(p.accords) }" @error="onImgError('polaroid', p.id)"></image>
              </view>
              <view class="pol-cap">{{ p.hook }}</view>
              <view class="pol-foot">
                <view class="pol-meta">
                  <text class="pol-name">{{ p.name }}</text>
                  <!-- 品牌不能省：原列表卡有「爱马仕 · 2005」，拍立得改版时一度漏掉，
                       对香水图鉴来说品牌是有信息量的（娇兰/芦丹氏/爱马仕各有性格） -->
                  <text class="pol-brand">{{ p.brand }} · {{ p.year }}</text>
                </view>
                <text class="pol-no">No.{{ i + 1 }}</text>
              </view>
            </view>
          </view>
        </swiper-item>
      </swiper>
      <view class="deck-dots">
        <view class="deck-dot" v-for="(p, i) in perfumes" :key="p.id" :class="{ on: deckIndex === i }"></view>
      </view>
      <button class="g-random" @tap="randomPick">随便来一瓶（懒人福音）</button>
      <view class="g-footer">共 {{ perfumes.length }} 款 · 图鉴收录</view>
    </scroll-view>

    <!-- 香调列表：方案 E 色谱索引——左侧细色脊代替满铺色块，克制留白，不堆图标。
         三列网格（列宽由屏宽三等分算出），每列左起一道竖脊＋香调名＋两字短注。 -->
    <scroll-view v-show="tab === 'accords'" scroll-y class="g-scroll" :show-scrollbar="false">
      <view class="a-grid" :style="{ '--accord-col-w': accordColW }">
        <view class="a-chip" v-for="a in accords" :key="a.key" @tap="openAccord(a)">
          <!-- 左侧竖脊：像书脊/索引标签，香调本色一道，颜色与香调名强绑定 -->
          <view class="a-spine" :style="{ background: accordColor(a.key) }"></view>
          <view class="a-text">
            <text class="a-label">{{ a.label }}</text>
            <text class="a-desc">{{ accordEpithet(a.key) }}</text>
          </view>
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
          <view class="ing-cell" v-for="(ing, i) in g.items" :key="g.key + '-' + i" @tap="openIngredient(ing)">
            <!-- 每格顶上一道主导香调的色块：和香调卡的主色块、拍立得的照片同一语汇，
                 一眼就能把这味料归到它最像的那个香调家族。 -->
            <view class="ing-swatch" :style="{ background: accordColor(ingMainKey(ing.accords)) }"></view>
            <text class="ing-cell-name">{{ ing.name }}</text>
            <!-- 每格底下铺一条它自己的香调构成色带：不点开也能看出这味料偏什么，
                 顺便让 104 个格子不再是清一色的灰药丸（标签云脸最重的就是它）。 -->
            <view class="ing-strip">
              <view class="ing-strip-i" v-for="(a, j) in ingParts(ing.accords)" :key="j"
                    :style="{ width: a.w + '%', background: a.c }"></view>
            </view>
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
          <text class="n-count">约 {{ readMinutes(n) }} 分钟</text>
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
          <!-- 香水详情：先读一页日记，再看参数。
               原来一进来就是「大图 → 香气结构进度条 → 雷达 → 古先生说」，
               第一屏是规格表气质。现在把古先生说提到前面，
               香气结构/雷达收进「查看香气成分」里，像翻到背面才看的东西。
               雷达 canvas 在 v-if 里，展开后必须重新量一次才画得出来（见 drawRadarSoon）。 -->
          <template v-if="sel.type === 'perfume'">
            <view class="d-paste">
              <image class="d-perfume-img" :src="imgSrc(sel.data.id)" mode="aspectFill"
                     :style="{ background: imgBg(sel.data.accords) }" @error="onImgError('detail', sel.data.id)"></image>
              <view class="d-paste-cap">{{ sel.data.hook }}</view>
            </view>
            <view class="d-title">{{ sel.data.name }}</view>
            <view class="d-sub">{{ sel.data.brand }} · {{ sel.data.year }} · 调香师 {{ sel.data.perfumer }}</view>

            <view class="d-section-title">古先生说</view>
            <view class="d-desc">{{ sel.data.description }}</view>

            <view class="d-fold" @tap="toggleData">
              <text class="d-fold-txt">{{ dataOpen ? '收起香气成分' : '查看香气成分' }}</text>
              <text class="d-fold-arrow">{{ dataOpen ? '↑' : '↓' }}</text>
            </view>

            <view v-if="dataOpen" class="d-data">
              <view class="d-section-title">香气结构</view>
              <!-- 堆叠色带取代原来的灰底进度条：一眼看到整瓶的配比，
                   也顺手用上香调本身的颜色（原来 12 个香调共用同一个绿） -->
              <view class="ribbon">
                <view class="rib-i" v-for="a in allAccords(sel.data.accords)" :key="a.k"
                      :style="{ width: a.v + '%', background: accordColor(a.k) }"></view>
              </view>
              <view class="legend">
                <view class="lg-row" v-for="a in allAccords(sel.data.accords)" :key="a.k">
                  <view class="lg-dot" :style="{ background: accordColor(a.k) }"></view>
                  <text class="lg-name">{{ label(a.k) }}</text>
                  <text class="lg-val">{{ a.v }}%</text>
                </view>
              </view>

              <view class="d-section-row">
                <view class="d-section-title-wrap">
                  <text class="d-section-title">香水六维</text>
                  <text class="dim-help" @tap="radarHelpOpen = true">说明 ⓘ</text>
                </view>
                <view class="radar-mode">
                  <text class="rm-pill" :class="{ on: radarMode === 'relative' }" @tap="setRadarMode('relative')">按结构</text>
                  <text class="rm-pill" :class="{ on: radarMode === 'absolute' }" @tap="setRadarMode('absolute')">按数值</text>
                </view>
              </view>
              <view class="d-radar-wrap">
                <canvas type="2d" id="galleryRadar" class="d-radar"></canvas>
              </view>
              <view class="d-radar-cap" v-if="selRadarCaption">气息特征：{{ selRadarCaption }}</view>
            </view>

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
      <view class="sheet-note">每个香调天生带着 2~3 种气质：比如柑橘同时贡献「明亮度」和「轻盈感」。所以香方只覆盖少数香调时，雷达会呈三角形甚至一条直线——那是气质形状，不是画错了。</view>
      <button class="sheet-close" @tap="radarHelpOpen = false">知道了</button>
    </view>

    <!-- 手把手教程：暗色聚光灯，高亮图鉴 -->
    <CoachMask page="gallery" />
  </view>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { galleryPerfumes, ACCORDS, INGREDIENT_LIBRARY, notesData, RADAR_LABELS, RADAR_DIM_DESC } from '@/utils/data.js'
import { THEME, accordColor } from '@/utils/theme.js'
import { computeRadarValues, radarSummary } from '@/utils/mix.js'
import { drawRadar } from '@/utils/canvas-draw.js'
import { setPendingBlend } from '@/utils/wxacode.js'
import { track } from '@/utils/analytics.js'
import { tut, TUTORIAL_STEPS, bumpCoach } from '@/utils/tutorial.js'
import { markSeen } from '@/utils/seen.js'

// accordColor 用 theme.js 的公共实现，不在这里另写一份 ——
// 本地那版的 fallback 是硬编码的 '#2e5c45'，主题色一改就会漏掉这里。

// 图片底色：加载中和加载失败时露出来的都是这瓶香的主色调，不会是个白洞。
// 本地图理论上不会失败，但万一打包漏了或文件损坏，至少还能看出这是瓶什么香。
function imgBg(acc) {
  const entries = Object.entries(acc || {}).sort((a, b) => b[1] - a[1])
  const key = entries[0] ? entries[0][0] : 'citrus'
  const c = accordColor(key)
  return `linear-gradient(155deg, ${c}1f, ${c}3d)`
}
function onImgError(where, id) {
  // 不静默：真失败了留一条 warn，方便事后定位是哪张图
  console.warn(`[gallery] 图片加载失败 ${where}:`, id)
}

const tab = ref('perfumes')
// 列表滚动位置，仅供教程复位用（:scroll-top 绑定在香水列表上）
const listScrollTop = ref(0)
// 拍立得卡片组当前页。教程要亮第一张卡，横滑之后必须能归 0
const deckIndex = ref(0)
function onDeckChange(e) { deckIndex.value = e.detail.current }
// 每张拍立得给一个固定小倾角，别让整叠卡像复制粘贴；非当前页缩一点点
function cardTransform(i) {
  const tilt = i % 2 === 0 ? -1.4 : 1.2
  const scale = deckIndex.value === i ? 1 : 0.92
  return `rotate(${tilt}deg) scale(${scale})`
}
const perfumes = galleryPerfumes
const accords = ACCORDS
const notes = notesData
// 香调卡自适应：检测屏宽 → 三等分（每列 = (屏宽 − 横向内外边距 − 两道列间隙) / 3）
// g-scroll 用 border-box，左右共 28rpx×2；a-grid 左右共 2rpx×2；3 列间隙 20rpx×2 → 合计 100rpx
const accordColW = ref('')
function getScreenW() {
  if (uni.getWindowInfo) { const i = uni.getWindowInfo(); if (i && i.windowWidth) return i.windowWidth }
  if (uni.getSystemInfoSync) { const i = uni.getSystemInfoSync(); if (i && i.windowWidth) return i.windowWidth }
  return 375
}
function calcAccordLayout() {
  const w = getScreenW()
  const rpx = w / 750
  const used = 100 * rpx            // 横向内外边距 + 两道列间隙，单位 px
  accordColW.value = ((w - used) / 3).toFixed(2) + 'px'
}
const sel = ref(null)
// 详情里的「香气成分」默认收起：首屏只讲古先生的话，参数翻到背面才看
const dataOpen = ref(false)
const radarHelpOpen = ref(false)
const radarDimList = RADAR_LABELS.map((lab) => ({ label: lab, desc: RADAR_DIM_DESC[lab] || '' }))
// 雷达视角：默认「结构」（相对值看名香自身气息）；切「绝对」按全局刻度，方便和别的香横比
const radarMode = ref('relative')

// scroll-top 只在「值变化」时才触发滚动，所以先给个非 0 值再归 0，确保一定回滚到顶
function resetListScroll() {
  listScrollTop.value = 1
  setTimeout(() => { listScrollTop.value = 0 }, 30)
}

// 教程第 3 步要亮的是拍立得组第一张卡（#coachGalleryCard）。
// 两种「看不见」都得先救回来，否则 CoachMask 一直重试，表现就是引导卡在 2/5 不动了：
// ① 用户停在「香调/香料/手记」tab —— 列表被 v-show 藏着，量不到宽高；
// ② 用户把卡片组往左滑过 —— 第一张被推出视口外，竖向滚动救不回来，必须把 swiper 归位。
function ensureCoachTargetVisible() {
  if (!tut.active) return
  const s = TUTORIAL_STEPS[tut.index]
  if (!s || s.page !== 'gallery') return
  if (tab.value !== 'perfumes') tab.value = 'perfumes'
  if (deckIndex.value !== 0) deckIndex.value = 0
  nextTick(resetListScroll)
  // 复位（含 scroll-view 滚动归零）真正生效要等一帧多，
  // 等它落定再让 CoachMask 重新量一次位置，
  // 否则会量到提前逛图鉴时缓存的旧坐标、兜底到屏幕中段错误亮框。
  setTimeout(bumpCoach, 80)
}
onShow(ensureCoachTargetVisible)
onShow(calcAccordLayout)
watch([() => tut.active, () => tut.index], ensureCoachTargetVisible)

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
// 图鉴图走本地资源，不走 CDN。
// 之前试过 raw.githubusercontent.com，属境外域名：开发者工具里勾选
// 「不校验合法域名」能显示，真机上一律加载失败，且该域名在国内本身就不稳定。
// 本地图已过 scripts/optimize-gallery.py 压缩（最长边 700px / q80 / 单张≤150KB），
// 11 张合计约 537KB，主包装得下。后续加图务必先跑压缩脚本再看主包余量。
function imgSrc(id) { return '/static/gallery/p' + id + '.' + (IMG_EXT[id] || 'png') }
// 香调矢量图标（SVG→PNG 静态图，体积小保留本地）
function accordImg(key) { return '/static/gallery/accords/' + key + '.png' }
// 香调卡短注：从「一句气味素描」压到「两三个字」，作标签而非说明。
const ACCORD_EPITHET = {
  citrus: '明亮', floral: '温柔', fruity: '清甜', woody: '沉静',
  oriental: '异情', fougere: '古典', green: '清醒', musk: '贴肤',
  amber: '温润', vanilla: '暖甜', tobacco: '微醺', aquatic: '清冽'
}
function accordEpithet(key) { return ACCORD_EPITHET[key] || '' }

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

function allAccords(acc) {
  return Object.keys(acc)
    .map((k) => ({ k, v: acc[k] }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
}
// 香料格子底下的「气味指纹」色带（归一化后的百分比 + 本色）。
// 香料的 accords 是「香调贡献度」，104 种里有 3 种不求和为 1（0.92~0.95），
// 直接按原始值堆叠会在末尾留一段空白，看着像数据缺了一块 —— 所以先归一到 100。
function ingParts(acc) {
  const parts = ingAccords(acc)
  const total = parts.reduce((s, x) => s + (Number(x.v) || 0), 0)
  if (!total) return []
  return parts.map((x) => ({ k: x.k, w: ((Number(x.v) || 0) / total) * 100, c: accordColor(x.k) }))
}
function ingAccords(acc) {
  const parts = Object.keys(acc || {})
    .map((k) => ({ k, v: Number(acc[k]) || 0 }))
    .filter((x) => x.v > 0)
  const total = parts.reduce((s, x) => s + x.v, 0)
  // 归一化到占比（占非零香调之和），这样「柠檬 0.9 / 果香 0.1」这类求和不足 1 的
  // 香料，详情条百分比也能加起来是 100%，不会看着像数据缺一块
  return parts
    .map((x) => ({ k: x.k, v: total ? x.v / total : 0 }))
    .sort((a, b) => b.v - a.v)
}

// 翻阅记录：打开一次详情记一笔，三类（香水/香调/手记）都翻过就点亮「卷末余香」。
// toast 延后 700ms：详情弹层此刻正在展开，立刻弹会被展开动画盖过去看不见。
function noteSeen(kind, id) {
  if (!markSeen(kind, id)) return
  setTimeout(() => {
    uni.showToast({ title: '✦ 卷末余香 · 新彩蛋已收入「我的 · 彩蛋收藏」', icon: 'none' })
  }, 700)
}

function openPerfume(p) {
  sel.value = { type: 'perfume', data: p }
  // 每次打开都从「读日记」开始，参数区收着。
  // 这里不能顺便画雷达：canvas 在 v-if 里，此刻根本没渲染，
  // createSelectorQuery 取不到节点，画了也是白画。
  dataOpen.value = false
  noteSeen('perfume', p.id)
}
function openAccord(a) { sel.value = { type: 'accord', data: a }; noteSeen('accord', a.key) }
// 香料不计入翻阅记录：104 种工具书条目，逐条点开只是机械打卡（详见 seen.js 头注）
function openIngredient(ing) { sel.value = { type: 'ingredient', data: ing } }
function openNote(n, i) { sel.value = { type: 'note', data: n, index: i }; noteSeen('note', n.title) }
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
    // dpr 取像素比：uni.getWindowInfo 在部分旧基础库/开发者工具里不存在，
    // 必须回退 uni.getSystemInfoSync —— 这里在 exec 回调内裸调会直接抛错，
    // 详情页雷达静默不画（home/lab/card 三处都有同款降级链，唯独这里漏过）。
    let dpr = 1
    try {
      dpr = (uni.getWindowInfo && uni.getWindowInfo().pixelRatio) ||
            (uni.getSystemInfoSync && uni.getSystemInfoSync().pixelRatio) || 1
    } catch (e) { dpr = 1 }
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

// 展开「香气成分」：雷达 canvas 此刻才第一次进 DOM，必须重新量一次才画得出来。
// nextTick 不够稳（弹层刚挂载），再加一层 setTimeout，和原来的做法一致。
function drawRadarSoon() {
  nextTick(() => setTimeout(() => {
    if (sel.value && sel.value.type === 'perfume') {
      drawPerfumeRadar(sel.value.data.accords, radarMode.value)
    }
  }, 60))
}
function toggleData() {
  dataOpen.value = !dataOpen.value
  if (dataOpen.value) drawRadarSoon()
}
// 六维视角切换：原来是原生 switch（表单控件气质），换成两枚文字 pill
function setRadarMode(m) {
  radarMode.value = m
  if (sel.value && sel.value.type === 'perfume') drawPerfumeRadar(sel.value.data.accords, m)
}

// 以图鉴某瓶为基调去工坊调香：暂存配方 → 跳工坊（lab 页 onShow 接住）
function blendFromGallery(p) {
  // 来源印记 = 图鉴香名：改编后再封存，卡面会印「改编自 ××」
  setPendingBlend(p.accords, p.name, p.name)
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
// 阅读时长按实际字数估（中文约 400 字/分钟）。原先写死「约 2 分钟」——
// 这篇三千字那篇八百字，报同一个数，是假信息。
// 「N 段」也去掉了：那是内容的结构，读者不关心一篇文章分了几段。
function readMinutes(n) {
  let chars = (n.lead || '').length
  ;(n.sections || []).forEach((s) => {
    chars += (s.heading || '').length + (s.text || '').length
  })
  return Math.max(1, Math.round(chars / 400))
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

/* ---------- 拍立得卡片组 ----------
   swiper 默认高度 150px，必须显式给高，否则卡片被压扁。
   760rpx 的来路：卡体约 684（上内边距 20 + 胶带净 8 + 照片 440 + 短句 22+84
   + 底部两行 16+72 + 下内边距 26），胶带在卡顶外露约 10、倾角再吃约 6，
   视觉总高约 700，留 60rpx 余量防止裁切。
   改照片高度或底部行数时，这里必须跟着重算。 */
.deck { width: 100%; height: 760rpx; }
.deck-cell { height: 100%; display: flex; align-items: center; justify-content: center; }
.pol {
  width: 500rpx; box-sizing: border-box; background: #fff;
  border-radius: 4rpx; padding: 20rpx 20rpx 26rpx;
  box-shadow: 0 8rpx 24rpx rgba(60,50,30,0.16);
  transition: transform 240ms ease;
}
/* 胶带：让卡看起来是被贴上去的，不是排版排出来的 */
.pol-tape {
  width: 96rpx; height: 26rpx; margin: -30rpx auto 8rpx;
  background: rgba(214,196,140,0.85); transform: rotate(-2.5deg);
}
/* 照片高度要让位给下面两行文字（香名 + 品牌·年份），否则整张卡超出 .deck 会被裁 */
.pol-photo { width: 100%; height: 440rpx; border-radius: 2rpx; overflow: hidden; background: #e7e3d5; }
.pol-img { width: 100%; height: 100%; display: block; }
/* 手写感字体栈见 App.vue 的 --font-hand（楷体，不引字体文件）。
   别加 font-style: italic —— 理由写在 App.vue 里了。 */
.pol-cap {
  font-family: var(--font-hand);
  font-size: 27rpx; color: #8a5f18;
  line-height: 1.55; text-align: center;
  margin-top: 22rpx; padding: 0 6rpx;
}
.pol-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 16rpx; gap: 12rpx; }
.pol-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.pol-name { font-size: 28rpx; font-weight: 700; color: #2b2b2e; }
.pol-brand { font-size: 21rpx; color: #6b6a6a; }
.pol-no { font-size: 20rpx; color: #9a958a; letter-spacing: 1rpx; flex-shrink: 0; }
.deck-dots { display: flex; justify-content: center; gap: 10rpx; margin: 18rpx 0 6rpx; }
.deck-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: rgba(46,92,69,0.22); transition: background 200ms ease; }
.deck-dot.on { background: #2e5c45; }

/* 香调卡：三列白卡＋左侧竖脊＋楷体名＋两字短注（方案 E 色谱索引） */
.a-grid { display: flex; flex-wrap: wrap; gap: 20rpx; padding: 4rpx 2rpx; }
.a-chip {
  box-sizing: border-box;
  flex: 0 0 var(--accord-col-w, calc((100% - 40rpx) / 3));
  width: var(--accord-col-w, calc((100% - 40rpx) / 3));
  background: #fffdf8;
  border-radius: 16rpx; padding: 18rpx 14rpx 18rpx 16rpx;
  border: 1rpx solid rgba(46,92,69,0.07);
  display: flex; flex-direction: row; align-items: center; gap: 14rpx;
  text-align: left;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.a-chip:active { transform: translateY(-4rpx); border-color: rgba(46,92,69,0.18); box-shadow: 0 10rpx 20rpx rgba(60,50,30,0.10); }
/* 脊 + 文字块：文字左对齐，竖脊像书脊把这一格和它的香调绑在一起 */
.a-text { display: flex; flex-direction: column; align-items: flex-start; gap: 6rpx; min-width: 0; }
/* 方案 E 左侧细色脊：香调本色一道竖脊，替代满铺色块，克制不抢戏 */
.a-spine { width: 6rpx; height: 52rpx; border-radius: 3rpx; flex-shrink: 0; }
.a-dot { width: 24rpx; height: 24rpx; border-radius: 50%; }
/* 楷体名 + 两字短注（方案 E），左对齐贴合索引感 */
.a-label { font-family: var(--font-hand); font-size: 28rpx; color: #3a342b; letter-spacing: 1rpx; text-align: left; }
.a-desc { font-family: var(--font-hand); font-size: 20rpx; color: #8a8276; line-height: 1; text-align: left; }

/* 详情大图：只有香水走「贴上去的照片」，香调/香料走下面的 .d-accord-img 小图 */
.d-paste { width: 480rpx; margin: 0 auto 26rpx; }
.d-perfume-img {
  width: 100%; height: 560rpx; border-radius: 4rpx;
  display: block; background: #e7e3d5;
  box-shadow: 0 10rpx 26rpx rgba(60,50,30,0.18);
  transform: rotate(-1.2deg);
}
.d-accord-img {
  width: 200rpx; height: 200rpx; display: block;
  margin: 0 auto 24rpx;
}

.g-footer { font-size: 22rpx; color: #6b6a6a; text-align: center; padding: 20rpx 0 10rpx; }

/* 香料子栏目 */
.ing-group { background: #f6f3ea; border-radius: 16rpx; padding: 22rpx; margin-bottom: 20rpx; }
.ing-group-head { display: flex; align-items: center; gap: 14rpx; margin-bottom: 18rpx; }
.ing-group-label { font-size: 28rpx; font-weight: 700; color: #2e5c45; flex: 1; }
.ing-group-count { font-size: 22rpx; color: #6b6a6a; }
.ing-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
/* 标本格：白卡＋主色块＋楷体名＋指纹色带，与香调卡、拍立得同源 */
.ing-cell {
  background: #fff; border-radius: 12rpx; padding: 14rpx 20rpx 12rpx;
  border: 1rpx solid rgba(46,92,69,0.10);
  box-shadow: 0 3rpx 10rpx rgba(60,50,30,0.06);
  min-width: 150rpx;
  display: flex; flex-direction: column; align-items: center; gap: 10rpx;
}
.ing-cell:active { background: #e7e3d5; }
/* 顶上一道主导香调色块：和香调卡的主色块同一语汇 */
.ing-swatch { width: 100%; height: 8rpx; border-radius: 4rpx; }
/* 楷体手写感名称，呼应拍立得短句与香调标签 */
.ing-cell-name { font-family: var(--font-hand); font-size: 24rpx; color: #2b2b2e; display: block; text-align: center; }
/* 香调构成色带：104 种各有各的指纹，一眼能分出「纯柑橘」和「柑橘带点绿」 */
.ing-strip { display: flex; width: 100%; height: 6rpx; border-radius: 3rpx; overflow: hidden; margin-top: 2rpx; }
.ing-strip-i { height: 100%; }

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
  font-size: 26rpx; color: #2e5c45; background: #fff; border-radius: 8rpx;
  padding: 8rpx 24rpx; margin: 0; display: inline-block;
}
.detail-back::after { border: none; }
.detail-scroll { flex: 1; min-height: 0; height: 0; padding: 28rpx 32rpx 60rpx; box-sizing: border-box; }
.d-title { font-size: 40rpx; font-weight: 700; color: #2b2b2e; }
.d-sub { font-size: 24rpx; color: #6b6a6a; margin: 8rpx 0 14rpx; }
/* 贴在照片下的手写感短句。字体栈与 .pol-cap 一致（App.vue 的 --font-hand） */
.d-paste-cap {
  font-family: var(--font-hand);
  font-size: 27rpx; color: #8a5f18;
  line-height: 1.6; text-align: center; margin-top: 24rpx;
}
/* 香气成分折叠入口：首屏只讲故事，参数翻到背面才看 */
.d-fold {
  display: flex; align-items: center; justify-content: center; gap: 10rpx;
  margin-top: 34rpx; padding: 18rpx 0;
  border: 2rpx dashed rgba(46,92,69,0.32); border-radius: 14rpx;
}
.d-fold:active { background: rgba(46,92,69,0.06); }
.d-fold-txt { font-size: 25rpx; color: #2e5c45; }
.d-fold-arrow { font-size: 24rpx; color: #2e5c45; }
.d-data { margin-top: 8rpx; }
/* 堆叠色带取代灰底进度条：一眼看到整瓶配比，并用上香调本身的颜色 */
.ribbon { display: flex; height: 30rpx; border-radius: 15rpx; overflow: hidden; margin-bottom: 20rpx; }
.rib-i { height: 100%; box-sizing: border-box; }
/* 相邻色块之间压一条极细白线：琥珀/木质/香草/烟草都是棕调，挨在一起分不出来。
   最小非零占比只有 1%（约 7rpx），所以分隔线只能取 1rpx，再粗就把细色块吃掉了。 */
.rib-i + .rib-i { border-left: 1rpx solid rgba(255,255,255,0.7); }
.legend { display: flex; flex-direction: column; gap: 10rpx; }
.lg-row { display: flex; align-items: center; gap: 12rpx; }
.lg-dot { width: 18rpx; height: 18rpx; border-radius: 50%; flex-shrink: 0; }
.lg-name { font-size: 23rpx; color: #6b6a6a; flex: 1; min-width: 0; }
.lg-val { font-size: 23rpx; color: #8a5f18; flex-shrink: 0; }
.d-section-title {
  font-size: 26rpx; font-weight: 600; color: #2e5c45; margin: 26rpx 0 14rpx;
  border-left: 6rpx solid #2e5c45; padding-left: 14rpx;
}
.d-bar { display: flex; align-items: center; gap: 14rpx; margin-bottom: 12rpx; }
.d-bar-label { font-size: 22rpx; color: #6b6a6a; width: 70rpx; flex-shrink: 0; }
.d-bar-track { flex: 1; height: 12rpx; background: rgba(26,26,30,0.08); border-radius: 8rpx; overflow: hidden; }
.d-bar-fill { height: 100%; background: #2e5c45; border-radius: 8rpx; }
.d-bar-val { font-size: 22rpx; color: #8a5f18; width: 60rpx; text-align: right; flex-shrink: 0; }
.d-desc { font-size: 26rpx; color: #3a3a38; line-height: 1.85; }
/* 香水六维雷达 */
.d-section-row { display: flex; align-items: center; justify-content: space-between; }
.d-section-row .d-section-title { margin-bottom: 0; }
/* .radar-mode / .rm-pill 已提到 App.vue 全局（工坊「香气画像」用同一套），此处不再重复定义 */
.d-radar-wrap { display: flex; justify-content: center; margin: 6rpx 0 4rpx; }
.d-radar { width: 460rpx; height: 460rpx; display: block; }
.d-radar-cap { text-align: center; font-size: 24rpx; color: #2e5c45; letter-spacing: 1rpx; margin-bottom: 6rpx; }
/* 以这瓶为基调去调香 */
.d-blend-btn {
  margin-top: 28rpx; width: 100%; box-sizing: border-box;
  font-size: 28rpx; color: #fff; background: #2e5c45;
  border-radius: 16rpx; padding: 22rpx 0; line-height: 1.4; letter-spacing: 2rpx;
}
.d-blend-btn::after { border: none; }
.d-blend-btn:active { background: #244a37; }
/* 随便来一瓶 */
.g-random {
  width: 100%; box-sizing: border-box; margin-bottom: 20rpx;
  font-size: 26rpx; color: #8a5f18; background: #fff;
  border: 2rpx solid rgba(169,120,38,0.45); border-radius: 16rpx;
  padding: 20rpx 0; line-height: 1.4;
}
.g-random::after { border: none; }
.g-random:active { background: #f3ead8; }
.ing-list { display: flex; flex-wrap: wrap; gap: 14rpx; }
.ing-item { background: #fff; border-radius: 24rpx; padding: 12rpx 24rpx; }
.ing-name { font-size: 24rpx; color: #2b2b2e; }

/* ---------- 手记子栏目 ---------- */
.n-card {
  background: #f6f3ea; border-radius: 16rpx; padding: 26rpx 24rpx; margin-bottom: 20rpx;
  border-left: 6rpx solid #a97826;
}
.n-card:active { background: #efeadd; }
.n-eyebrow { font-size: 20rpx; color: #8a5f18; letter-spacing: 3rpx; }
.n-title { font-size: 32rpx; font-weight: 700; color: #2e5c45; line-height: 1.4; margin-top: 10rpx; }
.n-lead {
  font-size: 24rpx; color: #6b6a6a; line-height: 1.7; margin-top: 12rpx;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
}
.n-foot { display: flex; align-items: baseline; justify-content: space-between; margin-top: 16rpx; gap: 16rpx; }
.n-date { font-size: 20rpx; color: #6b6a6a; flex: 1; min-width: 0; }
.n-count { font-size: 20rpx; color: #b0ae9f; flex-shrink: 0; }

/* 手记详情（复用图鉴详情弹层） */
.d-eyebrow {
  font-size: 22rpx; color: #8a5f18; letter-spacing: 3rpx; margin-bottom: 16rpx;
}
.d-note-lead {
  font-size: 28rpx; color: #6b6a6a; line-height: 1.75;
  margin: 22rpx 0 40rpx; padding-left: 20rpx; border-left: 6rpx solid #a97826;
}
.d-note-sec { margin-bottom: 40rpx; }
.d-sec-head { font-size: 28rpx; font-weight: 600; color: #2e5c45; margin-bottom: 12rpx; letter-spacing: 1rpx; }
.d-sec-text { font-size: 26rpx; color: #3a3a38; line-height: 1.9; letter-spacing: 0.5rpx; }
.d-pyramid { background: #fff; border-radius: 16rpx; padding: 26rpx 30rpx; margin-top: 10rpx; }
.pyr-row { display: flex; gap: 18rpx; padding: 10rpx 0; align-items: baseline; }
.pyr-label { font-size: 24rpx; color: #8a5f18; font-weight: 600; width: 70rpx; flex-shrink: 0; }
.pyr-val { font-size: 24rpx; color: #3a3a38; line-height: 1.6; }

/* 香水六维「说明」入口 + 六维释义底 sheet */
.d-section-title-wrap { display: flex; align-items: baseline; gap: 14rpx; }
.d-section-title-wrap .d-section-title { margin-bottom: 0; }
.dim-help {
  font-size: 22rpx; color: #8a5f18; font-weight: 600;
  border: 2rpx solid rgba(169,120,38,0.35); border-radius: 16rpx;
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
.dim-name { font-size: 26rpx; font-weight: 700; color: #2e5c45; width: 130rpx; flex-shrink: 0; }
.dim-text { font-size: 24rpx; color: #3a3a38; line-height: 1.6; flex: 1; }
.sheet-note {
  margin-top: 20rpx; padding: 14rpx 18rpx;
  background: rgba(46, 92, 69, 0.06); border-radius: 12rpx;
  font-size: 22rpx; color: #6b6a6a; line-height: 1.7;
}
.sheet-close {
  margin-top: 28rpx; width: 100%; font-size: 30rpx; font-weight: 600;
  background: #2e5c45; color: #fff; border-radius: 16rpx; padding: 22rpx 0;
}
.sheet-close::after { border: none; }
</style>
