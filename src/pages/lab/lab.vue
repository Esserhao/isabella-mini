<template>
  <view class="lab">
    <view class="lab-header">
      <text class="lab-title">工坊 · 调香台</text>
      <text class="lab-sub">拖动滑块配香气，像调奶茶一样简单</text>
    </view>

    <!-- 今日挑战：接受挑战后进入工坊会预载目标配方 + 实时契合度，小白也能玩 -->
    <view v-if="challengeInfo" class="challenge-banner">
      <view class="cb-main">
        <text class="cb-tag">今日挑战</text>
        <text class="cb-theme">{{ challengeInfo.theme }}</text>
      </view>
      <view class="cb-meta">
        <text class="cb-hint">{{ challengeInfo.hint }}</text>
        <text class="cb-score">和目标的相似度 <text class="cb-num">{{ challengeScore }}%</text> <text class="cb-tip">{{ challengeScoreTip }}</text></text>
      </view>
      <view class="cb-close" @tap="exitChallenge">×</view>
    </view>

    <view class="name-row">
      <text class="name-label">香名</text>
      <input class="name-input" :value="name" placeholder="为这瓶香起个名字" @input="onName" maxlength="20" />
      <text class="name-suggest" @tap="suggestName">帮我起名</text>
    </view>

    <!-- 调香感言：20 字内，记录调香时的感触。提交前过内容审查（moderate.js） -->
    <view class="name-row note-row">
      <text class="name-label">感言</text>
      <input class="name-input" :value="note" placeholder="此刻的感触（20字内）" @input="onNote" @blur="checkNote" maxlength="20" />
      <text class="note-count">{{ note.length }}/20</text>
    </view>

    <view class="panel" id="coachRadar">
      <view class="panel-title-row">
        <view class="title-group">
          <text class="panel-title">香气画像</text>
          <text class="dim-help" @tap="radarHelpOpen = true">六维是什么 ⓘ</text>
        </view>
        <view class="radar-mode">
          <text class="rm-label" :class="{ on: radarMode === 'relative' }">我的风格</text>
          <switch class="rm-switch" :checked="radarMode === 'absolute'" color="#2e5c45" @change="onRadarMode" />
          <text class="rm-label" :class="{ on: radarMode === 'absolute' }">对比名香</text>
        </view>
      </view>
      <!-- 雷达 canvas(type="2d")是微信原生组件，浮在视图层之上、z-index 盖不住。
           聚光灯教程高亮它时遮罩会被它穿透，故 tut.active 时内联 display:none 真正隐藏，
           关闭后 drawLive() 重绘恢复。内联 style 优先级高于 .rcanvas 的 display。 -->
      <view class="canvas-wrap"><canvas type="2d" id="radarCanvas" class="rcanvas" :style="labRadarHidden ? 'display:none' : ''"></canvas></view>
      <view v-if="radarCaption" class="radar-caption">味道偏向：{{ radarCaption }}</view>
      <view v-if="nearPerfume" class="near-perfume">有点像「{{ nearPerfume }}」呢（相似 {{ nearScore }}%）</view>
      <view v-if="blendFeedback" class="blend-feedback">{{ blendFeedback }}</view>
    </view>

    <!-- 香调释义底 sheet：把 data.js 里已有的 12 个香调释义/原料接进工坊 -->
    <view class="sheet-mask" v-if="activeAccord" @tap="closeAccordDesc"></view>
    <view class="sheet" v-if="activeAccord">
      <view class="sheet-title">{{ activeAccordInfo.label }} · 这是什么香</view>
      <view class="sheet-desc">{{ activeAccordInfo.description }}</view>
      <view class="sheet-sub">常见原料</view>
      <view class="chip-row">
        <text class="chip" v-for="(ing, i) in (activeAccordInfo.typicalIngredients || [])" :key="i">{{ ing }}</text>
      </view>
      <button class="sheet-close" @tap="closeAccordDesc">知道了</button>
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

    <!-- 首次进工坊的一次性引导蒙层（gu_lab_guided 记忆，之后不再弹） -->
    <view class="coach-mask" v-if="coachmarkOpen" data-role="mask" @tap="closeCoachIfMask">
      <view class="coach-card" data-role="card" @tap.stop>
        <view class="coach-title">第一次来工坊？</view>
        <view class="coach-line">① 拖动下方「香调滑块」，上方雷达会实时变化</view>
        <view class="coach-line">② 点香调名旁的 ⓘ，看看它是什么味</view>
        <view class="coach-line">③ 不会调？先点上面的「一键模板」打个底</view>
        <button class="coach-btn" @tap="closeCoach">开始调香 →</button>
      </view>
    </view>

    <view class="panel">
      <view class="panel-head">
        <text class="panel-title">香调配比</text>
        <view class="blend-tools">
          <text class="tool-btn" @tap="undo">撤销</text>
          <text class="tool-btn" @tap="resetBlend">重置</text>
        </view>
      </view>
      <view class="tpl-tip">先把味道铺个底，再慢慢微调</view>
      <!-- 一键气味模板：小白从「成品」改起，而非面对默认那瓶 -->
      <view class="tpl-row">
        <view class="tpl-btn" v-for="t in templates" :key="t.key" @tap="applyTemplate(t)">
          <text class="tpl-label">{{ t.label }}</text>
        </view>
      </view>
      <view class="normalize-hint">拖动某个香调，其它会按比例自动让位，总和始终是 100%</view>
      <view v-if="scentBroadcast" class="scent-broadcast">{{ scentBroadcast }}</view>

      <!-- 香调滑块：拖动即实时重绘雷达，其余各项等比让位 -->
      <view class="slider-list">
        <view class="slider-item" v-for="a in accords" :key="a.key" :id="a.key === accords[0].key ? 'coachSliders' : ''">
          <view class="slider-meta">
            <view class="slider-name-wrap" @tap="openAccordDesc(a.key)">
              <text class="slider-name">{{ a.label }}</text>
              <text class="slider-info">i</text>
            </view>
            <text class="slider-val">{{ values[a.key] }}%</text>
          </view>
          <slider class="slider" :value="values[a.key]" min="0" max="100"
            activeColor="#2e5c45" backgroundColor="#e7e3d5" block-size="18"
            @changing="onSlide(a.key, $event)" @change="onSlideEnd(a.key, $event)" />
        </view>
      </view>

      <!-- 高级：单方香料。与香调一一对应，改一边另一边同步跟随 -->
      <view class="adv-head" @tap="toggleAdv">
        <text class="adv-title">进阶 · 直接调原料（可不展开）</text>
        <text class="adv-toggle">{{ advOpen ? '收起' : '展开' }}</text>
      </view>
      <view class="slider-list adv-list" v-if="advOpen">
        <view class="slider-item" v-for="ing in coreIngredients" :key="ing.key">
          <view class="slider-meta">
            <text class="slider-name">{{ ing.label }}</text>
            <text class="slider-val">{{ ingValues[ing.key] }}%</text>
          </view>
          <slider class="slider" :value="ingValues[ing.key]" min="0" max="100"
            activeColor="#a97826" backgroundColor="#e7e3d5" block-size="18"
            @changing="onIngSlide(ing.key, $event)" @change="onIngSlideEnd(ing.key, $event)" />
          <text class="ing-desc">{{ ing.desc }}</text>
        </view>
      </view>
    </view>

    <view class="panel quote-panel">
      <text class="quote">「{{ quote }}」</text>
      <text class="formula">配方：{{ formulaText }}</text>
    </view>

    <view class="panel card-panel">
      <view class="card-head" @tap="cardOpen = !cardOpen">
        <view class="card-head-left">
          <image v-if="cardTempPath" class="card-thumb" :src="cardTempPath" mode="aspectFill"></image>
          <text class="panel-title">封存卡</text>
        </view>
        <text class="card-toggle">{{ cardOpen ? '收起' : '展开' }}</text>
      </view>
      <view class="card-body" :class="{ hidden: !cardOpen }">
        <button class="btn ghost seal-cta" @tap="triggerSeal">封存这张卡片</button>
        <canvas type="2d" id="cardCanvas" class="ccanvas"></canvas>
        <!-- 封存卡预览区不设底部按钮：封存后直接跳转 card 页，保存/分享/收藏都在 card 页 -->
      </view>
    </view>

    <!-- 分享图：转发好友 5:4、朋友圈 1:1。离屏绘制，只为导出图片，不展示 -->
    <view class="lab-share-wrap">
      <canvas type="2d" id="shareFriendCanvas" class="lab-share-canvas"></canvas>
      <canvas type="2d" id="shareTimelineCanvas" class="lab-share-canvas"></canvas>
    </view>

    <!-- 手把手教程：暗色聚光灯，高亮工坊（最重点） -->
    <CoachMask page="lab" />
  </view>
</template>

<script setup>
import { ref, reactive, nextTick, computed, watch } from 'vue'
import { onLoad, onShow, onReady, onUnload, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { ACCORDS, RADAR_LABELS, CORE_INGREDIENTS, galleryPerfumes, RADAR_DIM_DESC, SCENT_TEMPLATES } from '@/utils/data.js'
import { computeRadarValues, generateFormula, getGuQuote, genPerfumeName, scoreDailyChallenge, takeDailyChallengeTarget, radarSummary, markChallengeDone, topAccordDesc } from '@/utils/mix.js'
import { drawRadar, drawRadarGrow, drawCard, drawCardBase, drawShareCard, SHARE_SIZE } from '@/utils/canvas-draw.js'
import { THEME } from '@/utils/theme.js'
import { recordSeal } from '@/utils/streak.js'
import { track } from '@/utils/analytics.js'
import { bumpSealCount } from '@/utils/progress.js'
import { getRarity } from '@/utils/rarity.js'
import { moderateText } from '@/utils/moderate.js'
import { decodeAccordParams, encodeAccordParams, takePendingBlend, getWxacodePath } from '@/utils/wxacode.js'
import { tut } from '@/utils/tutorial.js'

const accords = ACCORDS
const coreIngredients = CORE_INGREDIENTS
const name = ref('未命名香氛')
const note = ref('')  // 调香感言（20 字内），随封存记录入库，card 页展示
let nameTouched = false  // 用户是否手动起名（未起名则封存时自动生成）
// 高级区（单方香料）默认收起：首屏只暴露香调这一套滑块
const advOpen = ref(false)

// 初始配方 = 图鉴第一瓶（尼罗河花园），与首页 Hook 卡同源。
// 用户进来看到的就是首页那瓶「已经不错的香」，改 1-2 个滑块即成为自己的。
const PRESET = galleryPerfumes[0].accords

const values = reactive({})
ACCORDS.forEach((a) => { values[a.key] = 0 })
// 预设值归一化到总和 100
;(function initPreset() {
  const raw = {}
  let sum = 0
  ACCORDS.forEach((a) => { raw[a.key] = PRESET[a.key] || 0; sum += raw[a.key] })
  if (sum <= 0) { values.floral = 100; return }
  let acc = 0
  const keys = ACCORDS.map((a) => a.key)
  keys.forEach((k, i) => {
    if (i === keys.length - 1) { values[k] = 100 - acc; return }
    values[k] = Math.round((raw[k] / sum) * 100)
    acc += values[k]
  })
})()

// 香料滑块值（12 种核心香料，与 12 个香调一一对应，见 CORE_INGREDIENTS.accord）
const ingValues = reactive({})
CORE_INGREDIENTS.forEach((ing) => { ingValues[ing.key] = values[ing.accord] || 0 })

// ---------- 扫码 / 分享还原 ----------
// 通过专属小程序码或分享卡片进入时带 p（配方）/n（香名）参数。
// 这里只负责解析并暂存，真正落到滑块上在 onReady（画布就绪后）执行。
function safeDecode(s) {
  try { return decodeURIComponent(s) } catch (e) { return s }
}
const incoming = { blend: null, challenge: null }
let restoreData = null
onLoad((option) => {
  const p = option && option.p
  if (!p) return
  const accords = decodeAccordParams(safeDecode(p))
  if (!accords) return
  const n = option && option.n ? safeDecode(option.n) : ''
  restoreData = { accords, name: n }
})

// 把还原数据写回滑块与香名。
// 注意：每日挑战的 target 只写了部分香调键（如 {green:70,woody:55,...}），
// 缺键时 accords[k] 是 undefined，undefined/sum 会算出 NaN 并污染整排滑块，
// 所以这里必须逐键兜 0；同时用最大余数法保证总和恰好 100。
function applyRestore({ accords, name: n }) {
  const raw = {}
  let sum = 0
  ACCORDS.forEach((a) => {
    const v = Number(accords && accords[a.key]) || 0
    raw[a.key] = v < 0 ? 0 : v
    sum += raw[a.key]
  })
  if (sum <= 0) {
    ACCORDS.forEach((a) => { values[a.key] = 0 })
    values.floral = 100
  } else {
    const exact = ACCORDS.map((a) => (raw[a.key] / sum) * 100)
    const floors = exact.map((v) => Math.floor(v))
    let remainder = 100 - floors.reduce((s, v) => s + v, 0)
    const order = exact
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac)
    for (let j = 0; j < order.length && remainder > 0; j++, remainder--) {
      floors[order[j].i] += 1
    }
    ACCORDS.forEach((a, i) => { values[a.key] = floors[i] })
  }
  syncIngFromAccord()
  if (n) {
    name.value = n
    nameTouched = true
  }
  track('scan_restore')
}

// 接力落地：图鉴/随机/调查(running blend) 与 每日挑战(challenge) 经 storage 暂存后跳工坊。
// 冷启动时画布未就绪，onShow 先把它们收进 incoming，等 onReady 画布就绪再应用。
// 优先级：running blend > 每日挑战（二者实际不会同帧出现）。
function applyIncomingIfReady() {
  if (!radar) return
  if (incoming.blend) {
    applyRestore(incoming.blend)
    incoming.blend = null
    drawLive(); syncCard()
    return
  }
  if (incoming.challenge) {
    const c = incoming.challenge
    applyRestore({ accords: c.target, name: '' })
    challengeTarget.value = c.target
    challengeInfo.value = { theme: c.theme, hint: c.hint }
    incoming.challenge = null
    drawLive(); syncCard()
  }
}

const quote = ref('')
const formulaText = ref('')
const blendFeedback = ref('')
// 今日挑战（内存态，离开工坊即失）：载入目标配方 + 实时契合度 + 气息字幕
const challengeTarget = ref(null)
const challengeInfo = ref(null)
const challengeScore = ref(0)
const radarCaption = ref('')
// 雷达视角：默认「结构」（相对值，看自己气息偏好）；切「绝对」按全局刻度横向可比
const radarMode = ref('relative')
// 对比名香虚线叠加：冻结时点最近图鉴香水的六维 + 标签
const overlayRef = ref(null)

// ---------- 小白引导：香调释义 / 六维说明 / 实时气味播报 ----------
const activeAccord = ref('')          // 当前打开释义的香调 key
const radarHelpOpen = ref(false)      // 六维说明 sheet
const scentBroadcast = ref('')        // 拖动时的实时气味播报
const activeAccordInfo = computed(() =>
  ACCORDS.find((a) => a.key === activeAccord.value) || null
)
// 六维说明（转为数组供 v-for）
const radarDimList = RADAR_LABELS.map((lab) => ({ label: lab, desc: RADAR_DIM_DESC[lab] || '' }))
const ACCORD_LABEL = {}
ACCORDS.forEach((a) => { ACCORD_LABEL[a.key] = a.label })
function openAccordDesc(key) { activeAccord.value = key }
function closeAccordDesc() { activeAccord.value = '' }

// 群友聊天式情感化提示词：每个香调一对上调/下调台词
const EMOTIONAL_HINT = {
  citrus:   { up: '加一点柑橘，像刚剥开一颗青柠', down: '柑橘退后，更沉稳内敛了' },
  floral:   { up: '花香被你唤醒了，温柔又浪漫', down: '收起一点花瓣，不想太张扬' },
  fruity:   { up: '果香跳出来了，甜得像一口蜜桃', down: '果香后退，留给别的味道空间' },
  woody:    { up: '木质在加深，像走进一片老树林', down: '木质减淡，氛围更轻盈了' },
  green:    { up: '绿意冒出来了，雨后青草的味道', down: '少了些草叶，没那么尖锐了' },
  oriental: { up: '东方调更浓了，神秘又迷人', down: '东方调收敛，留给日常感' },
  aquatic:  { up: '水感涌上来，像海风拂过', down: '水感退潮，更贴肤了' },
  fougere:  { up: '馥奇加深了，更干练得体', down: '馥奇淡了，随性一点' },
  musk:     { up: '麝香浮现，像第二层皮肤', down: '麝香隐去，更清透' },
  amber:    { up: '琥珀在升温，适合夜晚', down: '琥珀降温，白天也能穿' },
  vanilla:  { up: '香草更甜了，像在宠自己', down: '香草淡了，甜度刚好' },
  tobacco:  { up: '烟草味重了，有故事', down: '烟草淡化，轻快了一些' }
}

// 每个香调主导拉动的雷达维度（复算一次，用于「实时气味播报」把动作翻译成大白话）
const accordEffect = {}
ACCORDS.forEach((a) => {
  const r = computeRadarValues({ [a.key]: 100 })
  const top = []
  RADAR_LABELS.forEach((lab, i) => { if (r[i] >= 35) top.push(lab) })
  accordEffect[a.key] = top.length ? top : [RADAR_LABELS[r.indexOf(Math.max(...r))]]
})
let broadcastTimer = null
function broadcastAccord(key, dir) {
  const hint = EMOTIONAL_HINT[key]
  if (hint) {
    scentBroadcast.value = hint[dir] || (dir === 'up' ? `「${ACCORD_LABEL[key]}」加重了` : `「${ACCORD_LABEL[key]}」减轻了`)
  } else {
    const dims = accordEffect[key]
    if (!dims || !dims.length) return
    const verb = dir === 'up' ? '上升' : '下降'
    scentBroadcast.value = `调${dir === 'up' ? '高' : '低'}「${ACCORD_LABEL[key] || key}」 → ${dims.join('、')}${verb}`
  }
  if (broadcastTimer) clearTimeout(broadcastTimer)
  broadcastTimer = setTimeout(() => { scentBroadcast.value = '' }, 1800)
}

// ---------- T1 一键气味模板 ----------
const templates = SCENT_TEMPLATES
// 把一份 12 键配方铺到滑块（归一到 100），模板/重置/撤销共用
function applyTemplateVals(accordsObj) {
  const raw = {}
  let sum = 0
  ACCORDS.forEach((a) => { raw[a.key] = accordsObj[a.key] || 0; sum += raw[a.key] })
  if (sum <= 0) return
  ACCORDS.forEach((a) => { values[a.key] = Math.round((raw[a.key] / sum) * 100) })
}
function applyTemplate(t) {
  pushHistory()
  applyTemplateVals(t.accords)
  syncIngFromAccord()
  drawLive()
  syncCard()
  uni.showToast({ title: '已套用「' + t.label + '」，再微调', icon: 'none' })
}

// ---------- T2 撤销 / 重置 + 归一化手势识别 ----------
const history = []
let dragging = false
function snapshot() {
  const s = {}
  ACCORDS.forEach((a) => { s[a.key] = values[a.key] })
  return s
}
function pushHistory() {
  history.push(snapshot())
  if (history.length > 60) history.shift()
}
// 手势基线：手势开始时记录该香调的占比，整个手势期间方向都以此为参照。
// 用基线而非「上一次事件值」可避免拖动中的取整抖动 / 滑块回弹把方向判反
// （向右拖却显示"减小"的根因：松手时 @change 上报值可能因回弹小于上一次 @changing 的值）。
let gestureBase = {}
function beginGesture(anchorKey) {
  if (!dragging) { dragging = true; pushHistory() }
  if (anchorKey && gestureBase[anchorKey] === undefined) gestureBase[anchorKey] = values[anchorKey]
}
function endGesture() { dragging = false; gestureBase = {} }
function undo() {
  const s = history.pop()
  if (!s) { uni.showToast({ title: '没有可撤销的操作', icon: 'none' }); return }
  ACCORDS.forEach((a) => { values[a.key] = s[a.key] || 0 })
  syncIngFromAccord(); drawLive(); syncCard()
  uni.showToast({ title: '已撤销', icon: 'none' })
}
function resetBlend() {
  pushHistory()
  applyTemplateVals(PRESET)
  syncIngFromAccord(); drawLive(); syncCard()
  uni.showToast({ title: '已恢复默认', icon: 'none' })
}

// ---------- T3 靠近名香 ----------
const nearPerfume = ref('')
const nearScore = ref(0)
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0
  ACCORDS.forEach((k) => {
    const x = a[k.key] || 0, y = b[k.key] || 0
    dot += x * y; na += x * x; nb += y * y
  })
  return (na && nb) ? dot / Math.sqrt(na * nb) : 0
}

// ---------- T4 在场引导 + 起名建议 ----------
const coachmarkOpen = ref(false)
function closeCoach() {
  try { uni.setStorageSync('gu_lab_guided', 1) } catch (e) { /* 忽略 */ }
  coachmarkOpen.value = false
}
function closeCoachIfMask(e) {
  const role = e.target.dataset && e.target.dataset.role
  if (role === 'mask') closeCoach()
}
function suggestName() {
  name.value = genPerfumeName()
  nameTouched = true
}

// 挑战契合度提示：小白友好，分数低时给方向而不是打击
const challengeScoreTip = computed(() => {
  if (!challengeTarget.value) return ''
  const v = challengeScore.value
  if (v >= 85) return '· 很接近今天的主题啦'
  if (v >= 60) return '· 方向对了，继续调'
  return '· 试试加重主导香调'
})
// 放弃挑战：清掉横幅与契合度，回到自由调香（不强制）
function exitChallenge() {
  challengeTarget.value = null
  challengeInfo.value = null
}

let radar = null
let card = null
let cardDrawn = false

// 雷达 canvas 是微信原生组件，浮在视图层之上、z-index 盖不住。
// 聚光灯教程(CoachMask)高亮它时遮罩会被它穿透——教程激活时隐藏，关闭后重绘恢复。
const labRadarHidden = computed(() => tut.active || coachmarkOpen.value)
watch(labRadarHidden, (hidden) => { if (!hidden) nextTick(() => drawLive()) })

const cardTempPath = ref('')
const cardOpen = ref(true)  // 封存卡默认展开，作为调香台页面底部（与实际一致，避免隐藏画布重影）
const cardSealed = ref(false)  // 是否已封存（控制按钮文案：重新封存）

// 香调值即最终占比（总和恒为 100，由 normalizeFrom 维持）
function getAccordValues() {
  const vals = {}
  ACCORDS.forEach((a) => { vals[a.key] = values[a.key] })
  return vals
}

// 归一化：把 anchorKey 定在 target，剩下的 (100 - target) 按其余各项当前比例等比分配。
// 等比而非均摊 —— 用户调出来的形状是他的创作，不该被摊平。
// 这样「多加木质」必然「少掉别的」，取舍的张力就在这里。
// 取整用最大余数法：先向下取整，余数按小数部分从大到小逐一补 1。
// 不能让末位吸收全部余数 —— 末位若为 0 会被减成负数，并沿着后续拖动一路传染。
function normalizeFrom(anchorKey, target) {
  const t = Math.max(0, Math.min(100, Math.round(target)))
  values[anchorKey] = t
  const others = ACCORDS.map((a) => a.key).filter((k) => k !== anchorKey)
  const budget = 100 - t
  const restSum = others.reduce((s, k) => s + values[k], 0)

  if (budget <= 0) {
    others.forEach((k) => { values[k] = 0 })
    return
  }

  // 其余全为 0：预算平均落到其余项，避免总和不足 100
  const exact = restSum <= 0
    ? others.map(() => budget / others.length)
    : others.map((k) => (values[k] / restSum) * budget)

  const floors = exact.map((v) => Math.floor(v))
  let remainder = budget - floors.reduce((s, v) => s + v, 0)
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (let j = 0; j < order.length && remainder > 0; j++, remainder--) {
    floors[order[j].i] += 1
  }
  others.forEach((k, i) => { values[k] = floors[i] })
}

// 两套滑块共用同一份底层占比：香料 ←→ 香调按 CORE_INGREDIENTS.accord 映射同步
function syncIngFromAccord() {
  CORE_INGREDIENTS.forEach((ing) => { ingValues[ing.key] = values[ing.accord] || 0 })
}

function toggleAdv() {
  advOpen.value = !advOpen.value
}

function initCanvas(sel, designW, designH) {
  return new Promise((resolve) => {
    let done = false
    const finish = (val) => { if (!done) { done = true; resolve(val) } }
    const tryInit = (retryCount = 0) => {
      try {
        uni.createSelectorQuery().select(sel).fields({ node: true, size: true }).exec((res) => {
          try {
            if (!res || !res[0] || !res[0].node || !res[0].width || !res[0].height) {
              // canvas 未就绪或尺寸为 0，重试（最多 3 次）
              if (retryCount < 3) {
                setTimeout(() => tryInit(retryCount + 1), 100)
              } else {
                // 最终失败必须给 null：调用方一律用 if (!radar) / if (!card) 做闸门，
                // 返回 { ctx: null, failed: true } 这种「真值对象」会骗过闸门，
                // 后续 drawRadar(null) 直接崩——这正是六维图崩溃的同一类根因。
                finish(null)
              }
              return
            }
            const cvs = res[0].node
            const ctx = cvs.getContext('2d')
            if (!ctx) { finish(null); return }
            // dpr 取像素比：uni.getWindowInfo 在部分旧基础库/开发者工具里不存在，
            // 必须回退 uni.getSystemInfoSync，否则 GetWindowInfo is not a function 会抛错、
            // 让 exec 回调崩在 resolve 之前 → Promise 永不 resolve → onReady 挂死。
            let dpr = 1
            try {
              dpr = (uni.getWindowInfo && uni.getWindowInfo().pixelRatio) ||
                    (uni.getSystemInfoSync && uni.getSystemInfoSync().pixelRatio) || 1
            } catch (e) { dpr = 1 }
            const w = designW || res[0].width
            const h = designH || res[0].height
            cvs.width = Math.max(1, Math.round(w * dpr))
            cvs.height = Math.max(1, Math.round(h * dpr))
            ctx.scale(dpr, dpr)
            finish({ canvas: cvs, ctx, w, h })
          } catch (e) { finish(null) }
        })
      } catch (e) { finish(null) }
    }
    tryInit()
  })
}

function recompute() {
  const vals = getAccordValues()
  const radarValues = computeRadarValues(vals, radarMode.value)
  quote.value = getGuQuote(radarValues)
  formulaText.value = generateFormula(vals).join('、')
  // 小白引导：把抽象雷达实时翻译成一句话；挑战模式同步契合度
  // 注意：radarSummary 吃的是 6 维雷达「数组」，不是 12 香调对象——
  // 传错会 vals.map is not a function，整条 drawLive 链路一起崩。
  radarCaption.value = radarSummary(radarValues).join(' · ')
  // T3：与图鉴名香做余弦相似度，给「接近某款名香」的参照与成就感
  let best = null, bestS = 0
  galleryPerfumes.forEach((p) => {
    const s = cosineSim(vals, p.accords)
    if (s > bestS) { bestS = s; best = p }
  })
  if (best && bestS >= 0.82) { nearPerfume.value = best.name; nearScore.value = Math.round(bestS * 100) }
  else { nearPerfume.value = '' }
  if (challengeTarget.value) {
    const s = scoreDailyChallenge(vals, { target: challengeTarget.value })
    if (s) challengeScore.value = s.score
  }
  return radarValues
}

function onRadarMode(e) {
  radarMode.value = e.detail.value ? 'absolute' : 'relative'
  // 切到"对比名香"：冻结当前最贴近的图鉴香水六维作为虚线叠加
  if (radarMode.value === 'absolute') {
    const vals = getAccordValues()
    let best = null, bestS = 0
    galleryPerfumes.forEach((p) => {
      const s = cosineSim(vals, p.accords)
      if (s > bestS) { bestS = s; best = p }
    })
    if (best) {
      const overlayVals = computeRadarValues(best.accords, 'absolute')
      overlayRef.value = { values: overlayVals, label: best.name, color: THEME.gold }
    }
  } else {
    overlayRef.value = null
  }
  drawLive()
  syncCard()
}

function drawLive() {
  if (!radar) return
  const radarValues = recompute()
  drawRadar(radar.ctx, {
    cx: radar.w / 2, cy: radar.h / 2,
    radius: Math.min(radar.w, radar.h) * 0.34,
    values: radarValues, labels: RADAR_LABELS, theme: THEME,
    overlay: overlayRef.value
  })
}

// 拖动即实时重绘：每一下都让雷达跟着动，不用等按钮
function onSlide(key, e) {
  beginGesture(key)
  normalizeFrom(key, e.detail.value)
  const dir = values[key] > gestureBase[key] ? 'up' : 'down'
  syncIngFromAccord()
  drawLive()
  flashFeedback()
  syncCard()
  broadcastAccord(key, dir)
}
// 抬手收尾：应用最终值（纯点击时 changing 可能未触发），结束本次手势
function onSlideEnd(key, e) {
  beginGesture(key)
  normalizeFrom(key, e.detail.value)
  const dir = values[key] > gestureBase[key] ? 'up' : 'down'
  syncIngFromAccord()
  drawLive()
  syncCard()
  broadcastAccord(key, dir)
  endGesture()
}
// 高级区：改香料等价于改它对应的那个香调，同一份占比双向同步
function onIngSlide(key, e) {
  const ing = CORE_INGREDIENTS.find((i) => i.key === key)
  if (!ing) return
  const ak = ing.accord
  beginGesture(ak)
  normalizeFrom(ak, e.detail.value)
  const dir = values[ak] > gestureBase[ak] ? 'up' : 'down'
  syncIngFromAccord()
  drawLive()
  flashFeedback()
  syncCard()
  broadcastAccord(ak, dir)
}
function onIngSlideEnd(key, e) {
  const ing = CORE_INGREDIENTS.find((i) => i.key === key)
  if (!ing) return
  const ak = ing.accord
  beginGesture(ak)
  normalizeFrom(ak, e.detail.value)
  const dir = values[ak] > gestureBase[ak] ? 'up' : 'down'
  syncIngFromAccord()
  drawLive()
  syncCard()
  broadcastAccord(ak, dir)
  endGesture()
}

// 极端反馈：主导香调 >= 70 时闪一句台词（拖动中节流，避免每帧弹）
let blendFeedbackTimer = null
function flashFeedback() {
  const vals = getAccordValues()
  const topKey = Object.keys(vals).sort((a, b) => vals[b] - vals[a])[0]
  if (vals[topKey] >= 70 && FEEDBACK[topKey]) {
    blendFeedback.value = FEEDBACK[topKey]
    if (blendFeedbackTimer) clearTimeout(blendFeedbackTimer)
    blendFeedbackTimer = setTimeout(() => { blendFeedback.value = '' }, 2600)
  }
}

// 雷达生长动画：由首页「看看我是什么香」进入时播放一次（原「开始调香」按钮的行为）
function playGrow() {
  if (!radar) return
  const radarValues = recompute()
  drawRadarGrow(radar.ctx, {
    cx: radar.w / 2, cy: radar.h / 2,
    radius: Math.min(radar.w, radar.h) * 0.34,
    values: radarValues, labels: RADAR_LABELS, theme: THEME,
    duration: 500, canvas: radar.canvas
  })
  flashFeedback()
  syncCard()
}

// 主导香调极端反馈台词（re-engagement moment）
const FEEDBACK = {
  floral: '花香主导：你今天大概想被记住。',
  citrus: '柑橘主导：你的开场白很明亮。',
  woody: '木质主导：你不解释，但很稳。',
  green: '绿意主导：你讨厌装模作样。',
  oriental: '东方主导：你身上有秘密。',
  fruity: '果香主导：你比看起来甜。',
  fougere: '馥奇主导：得体是你要的体面。',
  musk: '麝香主导：你不想被定义。',
  amber: '琥珀主导：你适合夜晚。',
  vanilla: '香草主导：你在讨自己喜欢。',
  tobacco: '烟草主导：你有故事但不讲。',
  aquatic: '水生主导：你总在别处。'
}
function onName(e) {
  name.value = e.detail.value
  nameTouched = true
  syncCard()  // 香名改动同步到封存卡
}

// 调香感言输入：maxlength=20 已在模板层兜底，这里只更新状态
function onNote(e) {
  note.value = e.detail.value
}

// 失焦时本地审查：命中敏感词立即清空并提示，不让脏内容等到封存才暴露
function checkNote() {
  if (!note.value) return
  const r = moderateText(note.value)
  if (!r.pass) {
    note.value = ''
    uni.showToast({ title: r.reason || '感言包含不当内容', icon: 'none', duration: 2500 })
  }
}

// 纯重绘封存卡主体（不含埋点/持久化）
// opts.stamp: 封存时 true，仅用于决定是否获取小程序码
// radarValues/accordValues/quote/formula 全部同源于 getAccordValues，保证与上方一致
async function renderCard(opts = {}) {
  const { stamp = false } = opts
  if (!card) return false
  const vals = getAccordValues()
  const formula = generateFormula(vals)
  recompute()
  // 获取真小程序码（封存时才需要）
  const qrSrc = stamp ? await getWxacodePath(vals, name.value) : ''
  const cardOpt = {
    width: card.w, height: card.h,
    name: name.value,
    radarValues: computeRadarValues(vals, radarMode.value),
    labels: RADAR_LABELS,
    quote: quote.value,
    formula,
    // 用户亲手填的调香感言（20 字内），画在卡片金线下方；未填则整块留白
    note: note.value,
    // 预览阶段尚无真实封存时间，用当前（重绘那天就是「今天」，符合预期）
    sealTime: Date.now(),
    accords: ACCORDS, accordValues: vals, theme: THEME
  }
  if (stamp) {
    await drawCard(card.ctx, {
      ...cardOpt,
      canvas: card.canvas,
      qrCode: true,
      qrSrc
    })
  } else {
    drawCardBase(card.ctx, cardOpt)
  }
  cardDrawn = true
  scheduleShareTemp()
  return true
}

// 分享图不必每次滑块微调都重画：导出两张 canvas 有开销，1.5s 防抖足够。
// 用户松手停 1.5s 后才生成，拖动手感不受影响。
let shareTimer = null
function scheduleShareTemp() {
  if (shareTimer) clearTimeout(shareTimer)
  shareTimer = setTimeout(() => {
    shareTimer = null
    ensureShareTemp()
  }, 1500)
}

// 同步封存卡（手操：拖滑块/开始调香/改香名后，实时同步内容，不盖印章、不写历史）
let syncTimer = null
function syncCard() {
  if (!card) return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(async () => {
    await renderCard()
    ensureCardTemp()
  }, 400)
}

// 封存：重绘卡片 + 埋点 + 连续天数 + 历史持久化
async function sealCard(stamped = true) {
  if (!card) return false
  const ok = await renderCard({ stamp: stamped })
  if (!ok) return false
  // 仅当用户真正「封存」（stamped=true）时才做埋点/连签/历史；
  // onReady 里的 sealCard(false) 只是画预览卡，不应触发副作用
  if (stamped) {
    track('seal')
    recordSeal()
    const vals = getAccordValues()
    // 历史持久化（供配方库页读取）
    try {
      const key = 'isabella_history'
      const list = uni.getStorageSync(key)
      const arr = Array.isArray(list) ? list : []
      arr.unshift({
        time: Date.now(),
        name: name.value,
        accords: { ...vals },
        quote: quote.value,
        formula: generateFormula(vals),
        note: note.value  // 调香感言随封存记录入库（已过审查）
      })
      uni.setStorageSync(key, arr.slice(0, 50))
    } catch (e) { /* 忽略存储异常 */ }
  }
  ensureCardTemp()
  return true
}

// 封存：完成卡片定稿并入库，然后跳转封存卡页（不再原地展示）
async function triggerSeal() {
  // 未起名则自动生成一个香名
  if (!nameTouched) {
    name.value = genPerfumeName()
    nameTouched = true
  }

  // 阶梯递进：封存数 +1，拿到当前层级（印章大小/角度/称号）
  const { tier, leveledUp, unlock } = bumpSealCount()
  // 同一次封存共用一个时间戳；提前到这里，让 drawCard 也能拿到真实封存时间
  // （否则旧卡片隔几天重开，卡面会印出重绘当天的日期，信息错误）。
  const sealTime = Date.now()
  const rarity = getRarity(computeRadarValues(getAccordValues()))

  // 画带印章的封存卡（含稀有度徽章 + 层级称号），用该层级的 stampScale/stampRotate
  if (card) {
    const vals = getAccordValues()
    const formula = generateFormula(vals)
    recompute()
    // 获取这瓶香专属的真小程序码
    const qrSrc = await getWxacodePath(vals, name.value)
    await drawCard(card.ctx, {
      width: card.w, height: card.h,
      name: name.value,
      radarValues: computeRadarValues(vals, radarMode.value),
      labels: RADAR_LABELS,
      quote: quote.value,
      formula,
      note: note.value,
      accords: ACCORDS, accordValues: vals, theme: THEME,
      rarity: rarity.label,
      tierTitle: tier.title,
      // 真实封存时间，旧卡片重绘不会变（drawCardBase 优先用它，否则回退当天）
      sealTime,
      canvas: card.canvas,
      qrCode: true,
      qrSrc  // 真小程序码路径
    })
    cardDrawn = true
    cardSealed.value = true
  }

  // 埋点 + 连签 + 历史持久化
  track('seal')
  recordSeal()
  if (challengeTarget.value) markChallengeDone()  // 挑战模式下封存即视为今日挑战完成
  const vals = getAccordValues()
  // 同一次封存必须共用同一个时间戳（已在函数上方统一取过）：历史记录与卡片页都拿它当唯一键，
  // 各调一次 Date.now() 会差出几毫秒，导致卡片页收藏后回历史页显示「未收藏」。
  try {
    const key = 'isabella_history'
    const list = uni.getStorageSync(key)
    const arr = Array.isArray(list) ? list : []
    arr.unshift({
      time: sealTime,
      name: name.value,
      accords: { ...vals },
      quote: quote.value,
      formula: generateFormula(vals),
      note: note.value  // 调香感言随封存记录入库（已过审查）
    })
    uni.setStorageSync(key, arr.slice(0, 50))
  } catch (e) { /* 忽略 */ }

  // 确保 tempPath 就绪（card 页直接从本地读，不走 query 传大图）
  await ensureCardTemp()

  // 跳转封存卡页：通过 Storage 传递数据（避免 URL 长度限制）
  const cardData = {
    time: sealTime,
    name: name.value,
    accords: { ...vals },
    quote: quote.value,
    formula: generateFormula(vals),
    note: note.value,
    rarity: rarity.label,
    rarityText: rarity.line,
    tierTitle: tier.title,
    tierKey: tier.key,
    sealLabel: tier.sealLabel,
    radarMode: radarMode.value  // 跨页一致：card 页读它重算雷达，不再回退默认 relative
  }
  try { uni.setStorageSync('isabella_card_data', cardData) } catch (e) { /* 忽略 */ }
  uni.navigateTo({ url: '/pages/card/card?from=seal' })

  // 弹解锁文案（层级提升时）
  if (leveledUp && unlock) {
    uni.showModal({
      title: '封存成就',
      content: unlock,
      showCancel: false,
      confirmText: '好的'
    })
  }
}

async function saveCard() {
  // 保存到相册已移至 card 页，lab 页保留此函数供向后兼容（模板中不再调用）
  if (!card) { uni.showToast({ title: '请先调香', icon: 'none' }); return }
  if (!cardDrawn) { await renderCard(); ensureCardTemp(); }
  const c = card.canvas
  uni.canvasToTempFilePath({
    canvas: c, x: 0, y: 0, width: c.width, height: c.height,
    destWidth: c.width, destHeight: c.height,
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => { track('save_card'); uni.showToast({ title: '已保存到相册', icon: 'success' }) },
        fail: (err) => {
          if (/auth|deny/i.test(err.errMsg || '')) {
            uni.showModal({ title: '需要相册权限', content: '请在设置中允许保存到相册', confirmText: '去设置', success: (m) => { if (m.confirm) uni.openSetting() } })
          } else { uni.showToast({ title: '保存失败', icon: 'none' }) }
        }
      })
    },
    fail: () => uni.showToast({ title: '导出失败', icon: 'none' })
  })
}

// 生成封存卡临时图（供分享缩略图使用）
function ensureCardTemp() {
  return new Promise((resolve) => {
    if (!cardDrawn || !card) { resolve(); return }
    uni.canvasToTempFilePath({
      canvas: card.canvas,
      x: 0, y: 0, width: card.canvas.width, height: card.canvas.height,
      destWidth: card.canvas.width, destHeight: card.canvas.height,
      success: (res) => { cardTempPath.value = res.tempFilePath; resolve() },
      fail: () => { resolve() }
    })
  })
}

// 分享图（5:4 转发好友 / 1:1 朋友圈）。
// 不能用封存卡那张 600×900 的图：非目标比例会被居中裁剪，香名和调香感言正好在两端。
let shareFriendPath = ''
let shareTimelinePath = ''

function exportShareTemp(cvs) {
  return new Promise((resolve) => {
    if (!cvs) { resolve(''); return }
    uni.canvasToTempFilePath({
      canvas: cvs,
      destWidth: cvs.width, destHeight: cvs.height,
      success: (res) => resolve(res.tempFilePath || ''),
      fail: () => resolve('')
    })
  })
}

async function ensureShareTemp() {
  const vals = getAccordValues()
  const base = {
    name: name.value,
    radarValues: computeRadarValues(vals, radarMode.value),
    quote: quote.value,
    accords: ACCORDS,
    accordValues: vals,
    theme: THEME
  }
  const friend = await initCanvas('#shareFriendCanvas', SHARE_SIZE.friend.w, SHARE_SIZE.friend.h)
  if (friend) {
    drawShareCard(friend.ctx, { ...base, width: friend.w, height: friend.h })
    shareFriendPath = await exportShareTemp(friend.canvas)
    // 导出后把离屏 canvas 缩到 1×1 释放显存（dpr=3 下每张约 16MB，下次防抖重画时 initCanvas 会重设尺寸）
    friend.canvas.width = 1
    friend.canvas.height = 1
  }
  const timeline = await initCanvas('#shareTimelineCanvas', SHARE_SIZE.timeline.w, SHARE_SIZE.timeline.h)
  if (timeline) {
    drawShareCard(timeline.ctx, { ...base, width: timeline.w, height: timeline.h })
    shareTimelinePath = await exportShareTemp(timeline.canvas)
    timeline.canvas.width = 1
    timeline.canvas.height = 1
  }
}

// card 页已接管分享，lab 页保留原生分享钩子供微信右上角菜单用。
// path 带上 p（配方）/n（香名）：好友点进来直接还原这瓶香，与扫码闭环同一套参数。
onShareAppMessage(() => {
  const vals = getAccordValues()
  const isRealName = name.value && name.value !== '未命名香氛'
  // 分享卡片 path 不带前导斜杠（getwxacode/分享路径规范）
  let path = `pages/lab/lab?p=${encodeAccordParams(vals)}`
  if (isRealName) {
    path += `&n=${encodeURIComponent(name.value)}`
  }
  const obj = {
    title: isRealName ? `「${name.value}」我调了一瓶属于我的香水` : `我调了一瓶属于我的${topAccordDesc(vals, 2)}香水`,
    path
  }
  if (shareFriendPath) obj.imageUrl = shareFriendPath
  return obj
})
onShareTimeline(() => {
  const vals = getAccordValues()
  const isRealName = name.value && name.value !== '未命名香氛'
  const obj = {
    title: isRealName ? `「${name.value}」我调了一瓶属于我的香水` : `我调了一瓶属于我的${topAccordDesc(vals, 2)}香水`
  }
  if (shareTimelinePath) obj.imageUrl = shareTimelinePath
  return obj
})

onShow(() => {
  track('enter_lab')
  // 接力接收：图鉴/随机/调查(running blend) 与 每日挑战。取出即删（storage），
  // 暂存到 incoming，等画布就绪（onReady 或本帧 nextTick）再落到滑块。
  const pb = takePendingBlend()
  if (pb) incoming.blend = pb
  const dc = takeDailyChallengeTarget()
  if (dc) incoming.challenge = dc
  // 从分享页/卡片页返回后，Canvas2D 偶发位移/残影，强制重绘一次（不播放动画）
  nextTick(() => {
    if (card) {
      renderCard({ stamp: cardSealed.value })
      ensureCardTemp()
    }
    // 由首页 CTA 进入：补播一次雷达生长（radar 已就绪的情况，如二次进入）
    if (radar) consumePendingGrow()
    // 从其它 tab 切回时，重绘一次雷达确保显示（canvas 切回偶发空白）
    if (radar) drawLive()
    // 接力落地（热启动路径：radar 已存在）
    applyIncomingIfReady()
  })
})

// 页面卸载时清理定时器，避免内存泄漏
onUnload(() => {
  if (syncTimer) clearTimeout(syncTimer)
  if (blendFeedbackTimer) clearTimeout(blendFeedbackTimer)
  if (broadcastTimer) clearTimeout(broadcastTimer)
  if (shareTimer) clearTimeout(shareTimer)
})

// 首页「看看我是什么香」会写下这个标记：进入工坊时播一次生长动画
function consumePendingGrow() {
  let pending = false
  try {
    pending = !!uni.getStorageSync('isabella_pending_grow')
    if (pending) uni.removeStorageSync('isabella_pending_grow')
  } catch (e) { /* 忽略 */ }
  if (pending) playGrow()
  return pending
}

onReady(async () => {
  radar = await initCanvas('#radarCanvas')
  card = await initCanvas('#cardCanvas', 600, 900)
  if (restoreData) {
    // 扫码/分享进入：先把这瓶香写回滑块，再用生长动画「长出来」——
    // 让被分享者第一眼看到「这瓶香在我手里成形」，而不是干巴巴的数字
    applyRestore(restoreData)
    restoreData = null
    playGrow()
  } else if (!incoming.blend && !incoming.challenge && !consumePendingGrow()) {
    // 由首页 CTA 进入则播生长动画，否则直接静态呈现预设配方
    drawLive()
  }
  // 冷启动接力落地（图鉴/随机/调查/每日挑战）：此刻画布刚就绪
  applyIncomingIfReady()
  // 初始预览卡不带印章；点击三个功能按钮后才叠加程序化印章
  await sealCard(false)
  await ensureCardTemp()
  // 首次进工坊：弹一次性在场引导（gu_lab_guided 记忆，之后不再弹）。
  // 若正在走「怎么做」聚光灯教程，则让位给教程，避免两层蒙层叠加。
  if (!uni.getStorageSync('gu_lab_guided') && !tut.active) coachmarkOpen.value = true
})
</script>

<style scoped>
/* 富有设计感的字体：标题用 Georgia 衬线体，正文用 PingFang SC */
.lab {
  min-height: 100vh;
  background: #f0eee5;
  padding: 24rpx 28rpx 60rpx;
  box-sizing: border-box;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
}
.lab-header { margin: 12rpx 0 20rpx; }
.lab-title { font-size: 40rpx; font-weight: 700; color: #2e5c45; display: block; font-family: "Georgia", "Palatino", serif; letter-spacing: 1rpx; }
.lab-sub { font-size: 24rpx; color: #6b6a6a; margin-top: 6rpx; display: block; }

.name-row {
  display: flex; align-items: center; gap: 16rpx;
  background: #f6f3ea; border-radius: 16rpx; padding: 16rpx 20rpx; margin-bottom: 20rpx;
}
.name-label { font-size: 26rpx; color: #2e5c45; font-weight: 600; }
.name-input {
  flex: 1; font-size: 28rpx; color: #2b2b2e; background: #fff;
  border-radius: 10rpx; padding: 10rpx 16rpx;
}
/* 感言行：与香名行同款，右侧加字数计数 */
.note-row { margin-bottom: 20rpx; }
.note-count { font-size: 21rpx; color: #a08b6a; flex-shrink: 0; }

.panel {
  background: #f6f3ea; border-radius: 18rpx; padding: 22rpx;
  margin-bottom: 20rpx;
}
.panel-title {
  font-size: 26rpx; color: #2e5c45; font-weight: 600; display: block; margin-bottom: 14rpx;
  font-family: "Georgia", "Palatino", serif; letter-spacing: 0.5rpx;
}
.panel-title-row { display: flex; align-items: center; justify-content: space-between; }
.radar-mode { display: flex; align-items: center; gap: 8rpx; }
.rm-label { font-size: 22rpx; color: #9a958a; }
.rm-label.on { color: #2e5c45; font-weight: 600; }
.rm-switch { transform: scale(0.72); }
.canvas-wrap { padding-top: 28rpx; }
.rcanvas, .mcanvas { width: 600rpx; height: 600rpx; display: block; margin: 0 auto; }

/* 极端反馈条（主导香调 >=70 时闪现） */
.blend-feedback {
  margin-top: 20rpx;
  background: #fff; border-left: 6rpx solid #a97826;
  border-radius: 12rpx; padding: 18rpx 24rpx;
  font-size: 26rpx; color: #2e5c45; line-height: 1.5;
  animation: fbIn 0.35s ease;
}
@keyframes fbIn {
  from { opacity: 0; transform: translateY(-8rpx); }
  to   { opacity: 1; transform: translateY(0); }
}
.ccanvas { width: 600rpx; height: 900rpx; display: block; margin: 0 auto; background: #f6f3ea; }
/* 离屏画布：移出视口而不是 display:none，避免部分基础库拿不到 node */
.lab-share-wrap {
  position: fixed; left: -9999px; top: 0;
  width: 0; height: 0; overflow: hidden; pointer-events: none;
}
.lab-share-canvas { width: 750px; height: 600px; }

.slider-item { margin-bottom: 10rpx; }
.slider-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rpx; }
.slider-name { font-size: 26rpx; color: #2b2b2e; font-family: "Georgia", "Palatino", serif; }
.slider-val { font-size: 24rpx; color: #a97826; font-weight: 600; font-family: "Georgia", "Palatino", serif; }
.slider { margin: 0; }
.ing-desc { display: block; font-size: 20rpx; color: #a08b6a; margin-top: 4rpx; }

/* 高级 · 单方香料（默认收起） */
.panel-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 18rpx;
}
.panel-hint { font-size: 21rpx; color: #a08b6a; letter-spacing: 1rpx; }
.adv-head {
  margin-top: 8rpx; padding: 20rpx 0 4rpx;
  border-top: 1rpx solid rgba(26,26,30,0.10);
  display: flex; align-items: center; justify-content: space-between;
}
.adv-title { font-size: 26rpx; color: #a97826; letter-spacing: 1rpx; }
.adv-toggle { font-size: 24rpx; color: #9b9b8f; }
.adv-list { margin-top: 16rpx; }

.quote-panel { display: flex; flex-direction: column; gap: 14rpx; }
.quote { font-size: 28rpx; font-style: italic; color: #6b6a6a; line-height: 1.6; font-family: "Georgia", "Palatino", serif; }
.formula { font-size: 26rpx; color: #2b2b2e; line-height: 1.6; }

.btn-row { display: flex; gap: 20rpx; margin-top: 22rpx; }
.btn {
  flex: 1; font-size: 28rpx; border-radius: 14rpx; padding: 18rpx 0; margin: 0; line-height: 1.4;
}
.btn.ghost { background: #fff; color: #2e5c45; border: 2rpx solid #2e5c45; }
.btn.primary { background: #2e5c45; color: #fff; }
.btn.gold { background: #a97826; color: #fff; }
.btn::after { border: none; }

/* 封存卡折叠面板 */
.card-panel { position: relative; }
.card-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14rpx;
}
.card-head-left { display: flex; align-items: center; gap: 14rpx; min-width: 0; }
.card-thumb {
  width: 64rpx; height: 96rpx; border-radius: 8rpx; flex-shrink: 0;
  border: 2rpx solid rgba(169,120,38,0.30); background: #fff;
}
.card-toggle { font-size: 24rpx; color: #a97826; padding: 8rpx 16rpx; }
.card-body { transition: opacity 0.25s ease; }
/* 折叠时不 display:none（canvas 隐藏会导出失败），改为 absolute 移出视口保持可绘制。
   避免 fixed 定位在微信真机/开发者工具里偶发把隐藏内容带到视口顶部造成重影。 */
.card-body.hidden {
  position: absolute; left: -9999rpx; top: -9999rpx;
  opacity: 0; pointer-events: none;
}
.seal-cta { margin-bottom: 20rpx; }
.seal-cta--done { background: #fff; color: #a97826; border: 2rpx solid rgba(169,120,38,0.4); }

/* 今日挑战横幅：青绿底 + 金线，和品牌色一致，不抢调香台主体 */
.challenge-banner {
  display: flex; align-items: center; gap: 18rpx;
  background: linear-gradient(120deg, #eef3ee, #f6f3ea);
  border: 2rpx solid rgba(46,92,69,0.18);
  border-left: 8rpx solid #2e5c45;
  border-radius: 16rpx; padding: 18rpx 22rpx; margin-bottom: 20rpx;
}
.cb-main { display: flex; flex-direction: column; gap: 4rpx; flex-shrink: 0; }
.cb-tag {
  font-size: 20rpx; color: #fff; background: #2e5c45;
  border-radius: 20rpx; padding: 2rpx 14rpx; align-self: flex-start;
}
.cb-theme { font-size: 28rpx; font-weight: 700; color: #2b2b2e; }
.cb-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.cb-hint { font-size: 22rpx; color: #6b6a6a; line-height: 1.4; }
.cb-score { font-size: 22rpx; color: #6b6a6a; }
.cb-num { font-size: 30rpx; font-weight: 700; color: #a97826; margin: 0 4rpx; }
.cb-tip { color: #2e5c45; }
.cb-close {
  font-size: 40rpx; color: #9b9b8f; flex-shrink: 0;
  width: 48rpx; height: 48rpx; line-height: 44rpx; text-align: center;
}

/* 工坊雷达下方的气息特征字幕：把六个坐标轴翻译成人话 */
.radar-caption {
  margin-top: 14rpx; text-align: center;
  font-size: 24rpx; color: #2e5c45; letter-spacing: 1rpx;
}

/* 标题行里的「六维说明」入口 */
.title-group { display: flex; align-items: baseline; gap: 14rpx; }
.dim-help {
  font-size: 22rpx; color: #a97826; font-weight: 600;
  border: 2rpx solid rgba(169,120,38,0.35); border-radius: 20rpx;
  padding: 2rpx 14rpx; line-height: 1.4;
}

/* 香调滑块 label 可点开释义 */
.slider-name-wrap { display: flex; align-items: center; gap: 6rpx; }
.slider-info {
  font-size: 20rpx; color: #a97826; border: 2rpx solid rgba(169,120,38,0.4);
  border-radius: 50%; width: 30rpx; height: 30rpx; line-height: 28rpx;
  text-align: center; flex-shrink: 0; font-family: "Georgia", "Palatino", serif;
  font-style: italic;
}

/* 实时气味播报：拖动时把动作翻译成大白话 */
.scent-broadcast {
  margin-bottom: 14rpx; padding: 12rpx 18rpx; border-radius: 12rpx;
  background: rgba(46,92,69,0.08); color: #2e5c45;
  font-size: 25rpx; line-height: 1.5; text-align: center;
}

/* 通用底 sheet（香调释义 / 六维说明共用） */
.sheet-mask {
  position: fixed; left: 0; right: 0; top: 0; bottom: 0;
  background: rgba(0,0,0,0.45); z-index: 50;
}
.sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 51;
  background: #f6f3ea; border-radius: 24rpx 24rpx 0 0;
  padding: 36rpx 36rpx calc(40rpx + env(safe-area-inset-bottom));
  max-height: 72vh; overflow-y: auto;
}
.sheet-title { font-size: 32rpx; font-weight: 700; color: #2b2b2e; margin-bottom: 16rpx; }
.sheet-desc { font-size: 27rpx; color: #3a3a38; line-height: 1.8; }
.sheet-sub { font-size: 24rpx; color: #9b9b8f; margin: 22rpx 0 12rpx; }
.chip-row { display: flex; flex-wrap: wrap; gap: 12rpx; }
.chip {
  font-size: 24rpx; color: #2e5c45; background: #fff;
  border: 2rpx solid rgba(46,92,69,0.2); border-radius: 30rpx; padding: 8rpx 18rpx;
}
.sheet-close {
  margin-top: 28rpx; width: 100%; font-size: 30rpx; font-weight: 600;
  background: #2e5c45; color: #fff; border-radius: 16rpx; padding: 22rpx 0;
}
.sheet-close::after { border: none; }
.dim-row { display: flex; gap: 16rpx; padding: 14rpx 0; border-bottom: 2rpx solid rgba(0,0,0,0.05); }
.dim-name { font-size: 27rpx; font-weight: 700; color: #2e5c45; width: 130rpx; flex-shrink: 0; }
.dim-text { font-size: 25rpx; color: #3a3a38; line-height: 1.6; flex: 1; }

/* 香名旁的「帮我起名」 */
.name-suggest {
  font-size: 24rpx; color: #a97826; font-weight: 600; flex-shrink: 0;
  border: 2rpx solid rgba(169,120,38,0.4); border-radius: 24rpx; padding: 6rpx 16rpx;
}
.name-suggest:active { background: #f3ead8; }

/* 撤销 / 重置工具（香调配比面板右上） */
.blend-tools { display: flex; gap: 12rpx; }
.tool-btn {
  font-size: 22rpx; color: #2e5c45; font-weight: 600;
  border: 2rpx solid rgba(46,92,69,0.3); border-radius: 20rpx; padding: 4rpx 16rpx;
}
.tool-btn:active { background: rgba(46,92,69,0.08); }

/* 一键气味模板 */
.tpl-tip {
  font-size: 22rpx; color: #9b9b8f; line-height: 1.5; margin-bottom: 10rpx;
  text-align: center;
}
.tpl-row { display: flex; gap: 14rpx; margin-bottom: 12rpx; }
.tpl-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx;
  background: #fff; border: 2rpx solid rgba(46,92,69,0.16);
  border-radius: 14rpx; padding: 16rpx 6rpx;
}
.tpl-btn:active { background: rgba(46,92,69,0.06); }
.tpl-label { font-size: 22rpx; color: #2b2b2e; font-family: "Georgia", "Palatino", serif; }

/* 归一化解释 */
.normalize-hint { font-size: 21rpx; color: #9b9b8f; margin-bottom: 12rpx; }

/* 靠近名香提示 */
.near-perfume {
  margin-top: 8rpx; text-align: center;
  font-size: 23rpx; color: #a97826; letter-spacing: 1rpx;
}

/* 首次进工坊引导蒙层 */
.coach-mask {
  position: fixed; left: 0; right: 0; top: 0; bottom: 0;
  background: rgba(0,0,0,0.55); z-index: 300;
  display: flex; align-items: center; justify-content: center;
}
.coach-card {
  width: 560rpx; background: #f6f3ea; border-radius: 24rpx;
  padding: 40rpx 36rpx 32rpx; box-sizing: border-box;
}
.coach-title { font-size: 34rpx; font-weight: 700; color: #2e5c45; margin-bottom: 20rpx; }
.coach-line { font-size: 26rpx; color: #3a3a38; line-height: 1.9; }
.coach-btn {
  margin-top: 28rpx; width: 100%; font-size: 30rpx; font-weight: 600;
  background: #2e5c45; color: #fff; border-radius: 16rpx; padding: 22rpx 0;
}
.coach-btn::after { border: none; }

</style>
