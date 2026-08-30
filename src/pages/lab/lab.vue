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
        <text class="cb-hint-toggle" @tap="hintOpen = !hintOpen">{{ hintOpen ? '收起提示' : '看提示' }}</text>
      </view>
      <view class="cb-meta">
        <text class="cb-intro">挑战介绍：根据标题推测香调</text>
        <text v-if="hintOpen" class="cb-hint">提示：{{ challengeInfo.hint }}</text>
        <text class="cb-score">和目标的相似度 <text class="cb-num">{{ challengeScore }}%</text> <text class="cb-tip">{{ challengeScoreTip }}</text></text>
      </view>
      <view class="cb-close" @tap="exitChallenge">×</view>
    </view>

    <!-- 挑战吸顶条：滚过顶部横幅后从顶端淡入的一行紧凑条。
         fixed 定位不碰文档流（不 reintroduce 抖动）；点条身回到顶部看完整横幅，
         ✕ 仍可放弃挑战。横幅底色不透明，盖得住原生 canvas。 -->
    <view v-if="challengeInfo" class="cb-sticky" :class="{ show: cbSticky }" @tap="scrollToChallenge">
      <text class="cb-sticky-tag">今日挑战</text>
      <text class="cb-sticky-theme">{{ challengeInfo.theme }}</text>
      <text class="cb-sticky-score">{{ challengeScore }}%</text>
      <view class="cb-sticky-close" @tap.stop="exitChallenge">×</view>
    </view>

    <view class="name-row">
      <text class="name-label">香名</text>
      <input class="name-input" :value="name" placeholder="为这瓶香起个名字" @input="onName" @blur="checkName" maxlength="20" />
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
      <!-- 对比名香：原先这个名字画在画布右下角，和正下方的轴标签重叠、又贴着画布底边。
           搬到画布外单独成行，间距交给 CSS 控制，既不再打架也有呼吸感。 -->
      <view v-if="refName" class="ref-perfume">
        <view class="ref-dash"></view>
        <text class="ref-name">对比名香 · {{ refName }}</text>
      </view>
      <!-- 气息字幕与状态行都「常驻占位」：内容出现/消失只换文案不换高度——
           各自 v-if 的写法会在没翻到滑块页时把下面的调配面板顶得上下抖（真机反馈）。
           状态行展示优先级：彩蛋 > 极端反馈 > 相似名香（彩蛋命中时相似度让位，同旧规则）。 -->
      <view class="radar-caption" :class="{ dim: !radarCaption }">
        {{ radarCaption ? '味道偏向：' + radarCaption : '味道偏向：拖动香调后，这里实时解读' }}
      </view>
      <view class="panel-status" :class="panelStatus ? 'is-' + panelStatus.type : ''">
        <template v-if="panelStatus">
          <text v-if="panelStatus.type === 'egg'" class="status-star">✦</text>
          <text class="status-text">{{ panelStatus.text }}</text>
          <text v-if="panelStatus.type === 'egg'" class="status-star">✦</text>
        </template>
      </view>
    </view>

    <!-- 香调释义底 sheet：把 data.js 里已有的 12 个香调释义/原料接进工坊 -->
    <view class="sheet-mask" v-if="activeAccord" @tap="closeAccordDesc"></view>
    <view class="sheet" v-if="activeAccord">
      <view class="sheet-title">{{ activeAccordInfo.label }} · 这是什么香</view>
      <view class="sheet-desc">{{ activeAccordInfo.description }}</view>
      <template v-if="activeAccordInfo.typicalIngredients">
        <view class="sheet-sub">常见原料</view>
        <view class="chip-row">
          <text class="chip" v-for="(ing, i) in activeAccordInfo.typicalIngredients" :key="i">{{ ing }}</text>
        </view>
      </template>
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
      <view class="sheet-note">每个香调天生带着 2~3 种气质：比如柑橘同时贡献「明亮度」和「轻盈感」。所以只拉一根滑块，雷达也会亮起不止一个角；没拉到的轴缩在圆心，图形呈三角形甚至一条直线——那是这瓶香的气质形状，不是画错了。</view>
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
          <text class="tool-btn tool-btn-cta" @tap="randomBlend">摇一瓶</text>
        </view>
      </view>
      <view class="tpl-tip">先把味道铺个底，再慢慢微调</view>
      <!-- 一键气味模板：小白从「成品」改起，而非面对默认那瓶 -->
      <view class="tpl-row">
        <view class="tpl-btn" v-for="t in templates" :key="t.key" @tap="applyTemplate(t)">
          <text class="tpl-label">{{ t.label }}</text>
        </view>
      </view>
      <view class="normalize-hint">加香调就是从纯水里置换，纯水让完了才轮到香调互让，总和始终是 100%</view>
      <view class="scent-broadcast" :class="{ show: scentBroadcast }">{{ scentBroadcast }}</view>

      <!-- 纯水：单独一根放在最上面。它是「瓶子里的空位」，不是一种气味，
           所以它不进 ACCORDS，也就不参与雷达、配方和名香比对 -->
      <view class="slider-item solvent-item">
        <view class="slider-meta">
          <view class="slider-name-wrap" @tap="openAccordDesc(solvent.key)">
            <text class="slider-name">{{ solvent.label }}</text>
            <text class="slider-info">i</text>
          </view>
          <view class="slider-stepper">
            <view class="step-btn" @tap="stepAccord(solvent.key, -1)">−</view>
            <text class="slider-val">{{ values[solvent.key] }}%</text>
            <view class="step-btn" @tap="stepAccord(solvent.key, 1)">+</view>
          </view>
        </view>
        <slider class="slider" :value="values[solvent.key]" min="0" max="100"
          activeColor="#b6c4bd" backgroundColor="#e7e3d5" block-size="18"
          @changing="onSlide(solvent.key, $event)" @change="onSlideEnd(solvent.key, $event)" />
        <view class="strength-line">
          <text class="strength-name">{{ strength.name }}</text>
          <text class="strength-desc">香气 {{ strength.essence }}% · {{ strength.desc }}</text>
        </view>
      </view>

      <!-- 香调滑块：拖动即实时重绘雷达 -->
      <view class="slider-list">
        <view class="slider-item" v-for="a in accords" :key="a.key" :id="a.key === accords[0].key ? 'coachSliders' : ''">
          <view class="slider-meta">
            <view class="slider-name-wrap" @tap="openAccordDesc(a.key)">
              <text class="slider-name">{{ a.label }}</text>
              <text class="slider-info">i</text>
            </view>
            <!-- ± 步进：滑块拖不准个位数，点按 ±1 精修（与拖动同一出口 normalizeFrom） -->
            <view class="slider-stepper">
              <view class="step-btn" @tap="stepAccord(a.key, -1)">−</view>
              <text class="slider-val">{{ values[a.key] }}%</text>
              <view class="step-btn" @tap="stepAccord(a.key, 1)">+</view>
            </view>
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
      <text class="formula" v-if="formulaText">配方：{{ formulaText }}</text>
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
import { onLoad, onShow, onReady, onUnload, onPageScroll, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { ACCORDS, SOLVENT, BLEND_KEYS, RADAR_LABELS, CORE_INGREDIENTS, galleryPerfumes, RADAR_DIM_DESC, SCENT_TEMPLATES } from '@/utils/data.js'
import { computeRadarValues, generateFormula, getGuQuote, genPerfumeName, scoreDailyChallenge, takeDailyChallengeTarget, radarSummary, markChallengeDone, isChallengeDone, topAccordDesc, randomAccords, findExactMatch, blankBlend, strengthOf } from '@/utils/mix.js'
import { drawRadar, drawRadarGrow, drawCard, drawCardBase, drawShareCard, SHARE_SIZE, mainAccordColor } from '@/utils/canvas-draw.js'
import { THEME } from '@/utils/theme.js'
import { recordSeal, getStreak } from '@/utils/streak.js'
import { achieveEgg, sealLabelOf } from '@/utils/eggs.js'
import { track } from '@/utils/analytics.js'
import { bumpSealCount } from '@/utils/progress.js'
import { getRarity } from '@/utils/rarity.js'
import { moderateText } from '@/utils/moderate.js'
import { decodeAccordParams, encodeAccordParams, takePendingBlend, getWxacodePath } from '@/utils/wxacode.js'
import { tut } from '@/utils/tutorial.js'

const accords = ACCORDS
const coreIngredients = CORE_INGREDIENTS
const solvent = SOLVENT
// 浓度：纯水剩多少决定这瓶香有多浓。纯水不是气味，所以这几个数字不计入香调。
const strength = computed(() => strengthOf(values))
const name = ref('未命名香氛')
const note = ref('')  // 调香感言（20 字内），随封存记录入库，card 页展示
let nameTouched = false  // 用户是否手动起名（未起名则封存时自动生成）
// 接力链印记：当前配方的上一代名字（卡面印「改编自 ××」），非接力创作时为空
const originRef = ref('')
// 高级区（单方香料）默认收起：首屏只暴露香调这一套滑块
const advOpen = ref(false)

// 起点是「一杯纯水」：12 个香调全 0，纯水占满 100%。
//
// 以前初始是图鉴第一瓶（尼罗河花园），理由是降低新手门槛。但代价有两个：
// 一是用户看到的是别人调好的香，动手前先得想「我要改什么」；
// 二是每日挑战一来就被判 95 分（见 applyIncomingIfReady）。
// 纯水起步把这两个都解决了：加香调是从水里置换，不是从别的香调里抢，
// 「我没动它却变了」的困惑从根上消失；总和仍恒为 100，雷达从原点长出来。
const values = reactive(blankBlend())

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
  restoreData = { accords, name: n, fromScan: true }
})

// 把还原数据写回滑块与香名。
// 注意：每日挑战的 target 只写了部分香调键（如 {green:70,woody:55,...}），
// 缺键时 accords[k] 是 undefined，undefined/sum 会算出 NaN 并污染整排滑块，
// 所以这里必须逐键兜 0；同时用最大余数法保证总和恰好 100。
function applyRestore({ accords, name: n, fromScan, origin }) {
  // 接力覆盖前的自保：当前配比压入撤销栈——四个接力入口（我也调一瓶/
  // 图鉴基调/摇一瓶/扫码还原）都是无提示覆盖，被顶掉的调整此前
  // 在撤销栈里找不回（applyRestore 不入栈），等于真丢（用户拍板）。
  pushHistory()
  const raw = {}
  let sum = 0
  // 走 BLEND_KEYS（12 香调 + 纯水）。图鉴香水、模板这些没有纯水键，
  // 取 0 后归一化仍把 100 全部分给 12 个香调，与改动前逐键一致。
  BLEND_KEYS.forEach((k) => {
    const v = Number(accords && accords[k]) || 0
    raw[k] = v < 0 ? 0 : v
    sum += raw[k]
  })
  if (sum <= 0) {
    BLEND_KEYS.forEach((k) => { values[k] = k === SOLVENT.key ? 100 : 0 })
  } else {
    const exact = BLEND_KEYS.map((k) => (raw[k] / sum) * 100)
    const floors = exact.map((v) => Math.floor(v))
    let remainder = 100 - floors.reduce((s, v) => s + v, 0)
    const order = exact
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac)
    for (let j = 0; j < order.length && remainder > 0; j++, remainder--) {
      floors[order[j].i] += 1
    }
    BLEND_KEYS.forEach((k, i) => { values[k] = floors[i] })
  }
  // 扫码 / 图鉴接力 / 每日挑战都是系统铺好的配方。
  // 尤其图鉴接力：原值总和本就是 100 的整数，归一化后与那瓶逐键相等（已实测），
  // 不撤闸的话从图鉴点任何一瓶进工坊都会立刻弹「恭喜调出」。
  disarmEgg()
  syncIngFromAccord()
  if (n) {
    name.value = n
    nameTouched = true
  }
  // 来源印记随接力传入（卡页/图鉴传上一代名字；摇一瓶/扫码不带 = 无来源）
  originRef.value = origin || ''
  // 只有真扫码/带参分享进来才记 scan_restore。图鉴接力、首页摇一瓶、
  // 「我也调一瓶」也走本函数，但各有源头埋点（gallery_blend / home_random /
  // blend_from_card），这里再记一遍会把漏斗里的「扫码还原」灌水。
  if (fromScan) track('scan_restore')
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
    // 起点是一杯纯水：12 个香调全 0。
    // 以前把 c.target 本身铺进滑块，等于把答案抄上去：16 个主题进页面一律 95%，挑战送分。
    // 目标只作为评分基准留着，用户从水里一样一样加出来。
    // 不走 applyRestore 是因为它会记 scan_restore 埋点，而这是挑战不是扫码还原。
    // 重接 = 覆盖当前配比，与接力同一自保：先把当前状态压入撤销栈。
    pushHistory()
    originRef.value = ''
    const blank = blankBlend()
    BLEND_KEYS.forEach((k) => { values[k] = blank[k] })
    disarmEgg()
    syncIngFromAccord()
    challengeTarget.value = c.target
    challengeInfo.value = { theme: c.theme, hint: c.hint }
    hintOpen.value = false
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
// 挑战横幅交互态：hint 默认藏起（标题即谜面）；滚过横幅后吸顶条淡入
const hintOpen = ref(false)
const cbSticky = ref(false)
// 滚过顶部横幅（约 200rpx 高 + 页面留白）后收成紧凑条。
// onPageScroll 每帧都来，这里只写一个布尔，值不变时 Vue 不会触发渲染。
onPageScroll((e) => { cbSticky.value = challengeInfo.value != null && e.scrollTop > 100 })
function scrollToChallenge() {
  try { uni.pageScrollTo({ scrollTop: 0, duration: 200 }) } catch (e) { /* 忽略 */ }
}
const radarCaption = ref('')
// 雷达视角：默认「结构」（相对值，看自己气息偏好）；切「绝对」按全局刻度横向可比
const radarMode = ref('relative')
// 对比名香虚线叠加：冻结时点最近图鉴香水的六维 + 标签
const overlayRef = ref(null)
// 对比名香的名字单独成行显示在雷达下方（画布里不再画，见 canvas-draw.js 的说明）
const refName = ref('')

// ---------- 小白引导：香调释义 / 六维说明 / 实时气味播报 ----------
const activeAccord = ref('')          // 当前打开释义的香调 key
const radarHelpOpen = ref(false)      // 六维说明 sheet
const scentBroadcast = ref('')        // 拖动时的实时气味播报
const activeAccordInfo = computed(() =>
  ACCORDS.find((a) => a.key === activeAccord.value) ||
  (activeAccord.value === SOLVENT.key ? SOLVENT : null)
)
// 六维说明（转为数组供 v-for）
const radarDimList = RADAR_LABELS.map((lab) => ({ label: lab, desc: RADAR_DIM_DESC[lab] || '' }))
const ACCORD_LABEL = {}
ACCORDS.forEach((a) => { ACCORD_LABEL[a.key] = a.label })
ACCORD_LABEL[SOLVENT.key] = SOLVENT.label   // 纯水也要有名字，拖它时提示语要用
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
  tobacco:  { up: '烟草味重了，有故事', down: '烟草淡化，轻快了一些' },
  // 纯水不是气味，台词说的是浓淡而不是香
  solvent:  { up: '兑了水，这瓶香淡下来了', down: '水被置换掉，味道更浓了' }
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
// 把一份配方铺到滑块（归一到 100），模板/重置/撤销共用。
// 走 BLEND_KEYS 是为了把纯水也纳进来：模板和图鉴配方里没有纯水，
// 归一后 100 全给香调、纯水归 0（也就是纯香精）。想淡一点自己拖纯水那根滑块。
function applyTemplateVals(accordsObj) {
  const raw = BLEND_KEYS.map((k) => Math.max(0, Number(accordsObj[k]) || 0))
  const sum = raw.reduce((s, v) => s + v, 0)
  if (sum <= 0) return
  const exact = raw.map((v) => (v / sum) * 100)
  const floors = exact.map(Math.floor)
  let remainder = 100 - floors.reduce((s, v) => s + v, 0)
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (let j = 0; j < order.length && remainder > 0; j++, remainder--) {
    floors[order[j].i] += 1
  }
  BLEND_KEYS.forEach((k, i) => { values[k] = floors[i] })
}
function applyTemplate(t) {
  pushHistory()
  applyTemplateVals(t.accords)
  originRef.value = ''  // 套模板是新创作，无接力来源
  // 模板是现成配方，套用不算「调出来」；用户在这基础上拖滑块才会重新置闸
  disarmEgg()
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
  BLEND_KEYS.forEach((k) => { s[k] = values[k] })
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
  BLEND_KEYS.forEach((k) => { values[k] = s[k] || 0 })
  syncIngFromAccord(); drawLive(); syncCard()
  uni.showToast({ title: '已撤销', icon: 'none' })
}
function resetBlend() {
  pushHistory()
  originRef.value = ''
  const blank = blankBlend()
  BLEND_KEYS.forEach((k) => { values[k] = blank[k] })
  // 重置回的是一杯纯水，不是任何一瓶现成的香，不构成复刻
  disarmEgg()
  syncIngFromAccord(); drawLive(); syncCard()
  uni.showToast({ title: '已倒掉，重新来过', icon: 'none' })
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

// ---------- 复刻名香彩蛋 ----------
// 12 个香调数值与图鉴某瓶逐个相同才算「调出了这一瓶」。
// 这是彩蛋不是常规反馈：随机撞上的概率实测 200 万次 0 命中，
// 主要靠用户手动把滑块调成和某瓶一模一样。
//
// eggArmed 是必要闸门：初始化用的是图鉴第一瓶，重置回默认也是它，
// 从图鉴接力进来时经最大余数法归一化后逐键同样相等（已实测 11 瓶全部命中自己）。
// 这三种都是系统铺好的配比，不设闸的话一进工坊就会弹「恭喜调出」。
const eggHit = ref(null)      // 横幅正在展示的那瓶，null = 不展示
let eggArmed = false          // 用户是否亲手调过
let lastHitId = null          // 上一次命中的 id：同一次命中只震动一次，切雷达模式不会重复弹
let eggTimer = null
function armEgg() { eggArmed = true }
function disarmEgg() { eggArmed = false; lastHitId = null; eggHit.value = null }

function checkEgg(vals) {
  const hit = findExactMatch(vals, galleryPerfumes)
  if (!hit) {
    // 图鉴没中再看自己的历史（互斥展示，图鉴优先——原彩蛋让位逻辑不变）
    const self = findExactMatch(vals, selfHistoryCache)
    if (!self) {
      lastHitId = null
      eggHit.value = null      // 调离命中状态立刻收起横幅
      return
    }
    if (lastHitId === self.id) return   // 同一次命中不重复触发
    lastHitId = self.id
    if (eggArmed) celebrateEgg(self)
    return
  }
  if (lastHitId === hit.id) return   // 同一次命中不重复触发
  lastHitId = hit.id
  if (eggArmed) celebrateEgg(hit)
}
function celebrateEgg(p) {
  eggHit.value = p
  // 达成登记（eggs.js，幂等）：首次达成才弹「新彩蛋」提示
  const isNew = achieveEgg(p.self ? 'self_replica' : 'replica')
  // 震动是「惊喜」的一半；部分机型/模拟器不支持，失败就算了不能让它炸。
  // type（light/medium/heavy）分级仅部分平台支持，不支持的机型传参会整次 fail
  // （表现为无震动 + 控制台 unhandled rejection）——不传 type 全平台行为一致。
  try { uni.vibrateShort({ fail: () => {} }) } catch (e) { /* 忽略 */ }
  track(p.self ? 'exact_match_self' : 'exact_match')
  if (isNew) {
    setTimeout(() => { uni.showToast({ title: '✦ 新彩蛋已收入「我的 · 彩蛋收藏」', icon: 'none' }) }, 1200)
  }
  if (eggTimer) clearTimeout(eggTimer)
  eggTimer = setTimeout(() => { eggHit.value = null }, 4500)
}

// 「旧作重现」比对源：历史配方缓存。刚封存的那瓶要剔除——封存完拖回去
// 等于自己触发自己，隔天（下次进工坊）再调回来才算「重现」。onShow 与封存后刷新。
let selfHistoryCache = []
const sessionSealTimes = []
function loadSelfHistory() {
  try {
    const list = uni.getStorageSync('isabella_history')
    const arr = Array.isArray(list) ? list : []
    const next = arr
      .filter((h) => !sessionSealTimes.includes(h.time))
      .map((h) => ({ id: 'self_' + h.time, name: h.name, accords: h.accords || {}, self: true }))
    // 原地替换而不是整体重新赋值：checkEgg 闭包与自检脚本拿到的是同一个数组引用
    selfHistoryCache.length = 0
    selfHistoryCache.push(...next)
  } catch (e) {
    selfHistoryCache.length = 0
  }
}

// 懒人福音（工坊版）：现场摇一瓶全新的配比，与首页共用同一个随机函数。
// 摇完就算用户「调过」了——虽然随机撞上彩蛋的概率约等于 0，
// 但摇出来的配比归他，之后微调命中同样该给彩蛋。
function randomBlend() {
  pushHistory()
  // 走 applyTemplateVals 而不是逐键赋值：那样会漏掉纯水，把「总和恒 100」的
  // 约定打破（纯水还停在拖动前的值上）。归一化后纯水归 0，摇出来的是纯香精。
  applyTemplateVals(randomAccords())
  originRef.value = ''  // 现摇的新配方，无接力来源
  syncIngFromAccord()
  armEgg()
  drawLive()
  syncCard()
  if (!nameTouched) name.value = genPerfumeName()
  uni.showToast({ title: '摇了一瓶，不满意就再摇', icon: 'none' })
  track('lab_random')
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
  hintOpen.value = false
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

// 「十二味全开」的会话级记录：normalizeFrom 里逐味 add，每次进入工坊（onShow）清零。
const touchedAccords = new Set()

// 归一化：把 anchorKey 定在 target，剩下的 (100 - target) 在其余各项之间重新分配。
// 让位顺序是「纯水优先」，而且双向：
//   调大某个香调（需要空间）→ 先扣纯水，水扣光了才按比例动香调；
//   调小某个香调（腾出空间）→ 先补纯水，水补满了才按比例分给香调（相当于往回兑水稀释）。
// 于是只要水还够，拖任何一根香调都不会惊动别的香调——
// 「我明明没碰花香，它却自己变了」这个困惑就是从这儿根治的。
// 水扣光 / 补满之后才轮到香调互让，那时瓶子确实满了，取舍的张力也就自然出现了。
//
// 香调之间的分配是等比而非均摊 —— 用户调出来的形状是他的创作，不该被摊平。
// 取整用最大余数法：先向下取整，余数按小数部分从大到小逐一补 1。
// 不能让末位吸收全部余数 —— 末位若为 0 会被减成负数，并沿着后续拖动一路传染。
function normalizeFrom(anchorKey, target) {
  const t = Math.max(0, Math.min(100, Math.round(target)))
  values[anchorKey] = t
  // 走到这儿说明是用户亲手拖了滑块（香调或香料，四处事件都汇总到这个函数），
  // 复刻名香的彩蛋从此刻起才允许触发。放在函数内而不是四个事件里各写一遍，
  // 是为了以后新增拖动入口时不会漏掉置闸。
  armEgg()
  // 「十二味全开」：同一次会话里 12 个香调都被亲手拉到过非 0。
  // 拖纯水不算（纯水不是气味）；模板/摇一瓶/接力不走这里，天然不计入。
  // touchedAccords 每次进入工坊（onShow）清零，隔次进来自动重开。
  if (anchorKey !== SOLVENT.key && t > 0) {
    touchedAccords.add(anchorKey)
    if (touchedAccords.size >= ACCORDS.length && achieveEgg('full_palette')) {
      uni.showToast({ title: '✦ 十二味全开 · 新彩蛋已收入「我的 · 彩蛋收藏」', icon: 'none' })
    }
  }

  const budget = 100 - t
  if (budget <= 0) {
    BLEND_KEYS.forEach((k) => { if (k !== anchorKey) values[k] = 0 })
    return
  }

  // 按 exact 的比例把 total 整分下去（最大余数法），结果写回 keys
  const assign = (keys, exact, total) => {
    const floors = exact.map((v) => Math.floor(v))
    let remainder = total - floors.reduce((s, v) => s + v, 0)
    const order = exact
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac)
    for (let j = 0; j < order.length && remainder > 0; j++, remainder--) {
      floors[order[j].i] += 1
    }
    keys.forEach((k, i) => { values[k] = floors[i] })
  }

  const waterIsAnchor = anchorKey === SOLVENT.key
  const rest = BLEND_KEYS.filter((k) => k !== SOLVENT.key && k !== anchorKey)
  const restSum = rest.reduce((s, k) => s + values[k], 0)

  let accordBudget
  if (waterIsAnchor) {
    // 拖的就是纯水：水的量已定为 t，剩下的 budget 全归香调，彼此比例不变
    accordBudget = budget
  } else {
    const water = values[SOLVENT.key] || 0
    // delta > 0：其余各项要多拿到这么多（有香调被调小了，腾出空间）
    // delta < 0：其余各项要让出这么多（有香调被调大了，需要空间）
    const delta = budget - (restSum + water)
    if (delta < 0) {
      // 需要空间 → 先扣纯水，水扣光了才按比例动香调
      const fromWater = Math.min(water, -delta)
      values[SOLVENT.key] = water - fromWater
      accordBudget = restSum - (-delta - fromWater)
    } else {
      // 腾出空间 → 先补纯水，水补满了才按比例分给香调（等于往回兑水稀释）
      const toWater = Math.min(100 - water, delta)
      values[SOLVENT.key] = water + toWater
      accordBudget = restSum + (delta - toWater)
    }
  }

  // 香调这边全为 0 时均摊，避免总和不足 100
  assign(rest, restSum <= 0
    ? rest.map(() => accordBudget / rest.length)
    : rest.map((k) => (values[k] / restSum) * accordBudget), accordBudget)
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
  // 复刻名香彩蛋：与「有点像」并列检测，命中时由模板决定只展示恭喜横幅
  checkEgg(vals)
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
      refName.value = best.name
    }
  } else {
    overlayRef.value = null
    refName.value = ''
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
    overlay: overlayRef.value,
    // 纯水态（全 0）：画虚线圆的「留白邀请」，替代空多边形
    ghost: radarValues.every((v) => !v)
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
// ± 步进：点按 ±1 精修个位数（滑块拖不准 1%）。与拖动走同一出口 normalizeFrom——
// 恒和 100 / 纯水优先让位 / 彩蛋置闸全部自动一致；每次点按是一次独立手势，
// 各自入撤销栈，可逐步回退。
function stepAccord(key, delta) {
  const next = Math.max(0, Math.min(100, (values[key] || 0) + delta))
  if (next === values[key]) return
  beginGesture(key)
  normalizeFrom(key, next)
  syncIngFromAccord()
  drawLive()
  flashFeedback()
  syncCard()
  broadcastAccord(key, delta > 0 ? 'up' : 'down')
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

// 雷达面板下的常驻状态行：彩蛋横幅 / 极端反馈 / 相似名香 三选一展示。
// 原先各自 v-if 各占一行，出现/消失会改变文档流高度，
// 把下面的滑块区顶得上下抖（真机反馈）——现在共用一个固定占位。
const panelStatus = computed(() => {
  if (eggHit.value) return { type: 'egg', text: `恭喜调出「${eggHit.value.name}」！` }
  if (blendFeedback.value) return { type: 'feedback', text: blendFeedback.value }
  if (nearPerfume.value && nearPerfume.value !== refName.value) {
    return { type: 'near', text: `有点像「${nearPerfume.value}」呢（相似 ${nearScore.value}%）` }
  }
  return null
})

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
  // 「撞名大胆」：亲手把香起成图鉴名香的名字（自动起名来自固定词表，永不撞）。
  // 放在 input 里而非 blur：按完成名字的最后一个字触发，精确对应用户亲手输入。
  // achieveEgg 幂等，只有首次达成才返回 true，toast 自然只弹一次。
  const trimmed = name.value.trim()
  if (trimmed && galleryPerfumes.some((p) => p.name === trimmed) && achieveEgg('namesake')) {
    uni.showToast({ title: `大胆，敢跟「${trimmed}」重名`, icon: 'none' })
  }
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

// 香名同待遇：它会印上分享标题和小程序码，是直接的 UGC 出口。
// 失焦即筛（点分享/封存都会先让输入框失焦），封存时再闸一道兜底。
function checkName() {
  if (!name.value) return
  const r = moderateText(name.value)
  if (!r.pass) {
    name.value = ''
    nameTouched = false
    uni.showToast({ title: r.reason || '香名包含不当内容', icon: 'none', duration: 2500 })
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
    origin: originRef.value,
    accent: mainAccordColor(vals),
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
// 层级解锁弹窗（封存层级提升时；挑战完成弹窗确认后也可能接这一条）
function showUnlockModal(unlock) {
  uni.showModal({
    title: '封存成就',
    content: unlock,
    showCancel: false,
    confirmText: '好的'
  })
}

async function triggerSeal() {
  // 未起名则自动生成一个香名
  if (!nameTouched) {
    name.value = genPerfumeName()
    nameTouched = true
  }
  // 封存闸：香名与感言同等待遇过本地粗筛。自动生成的名字来自固定词表，
  // 天然安全；手动起的名在这里拦最后一道，不干净就不封。
  const nameCheck = moderateText(name.value)
  if (!nameCheck.pass) {
    name.value = ''
    nameTouched = false
    uni.showToast({ title: nameCheck.reason || '香名包含不当内容，换个名字再封存', icon: 'none', duration: 2500 })
    return
  }
  // 感言同闸：失焦检查依赖「点按钮先触发 blur」的跨端顺序，不保证；
  // 这里不依赖事件顺序，脏感言一律拦在封存之前。
  const noteCheck = moderateText(note.value)
  if (!noteCheck.pass) {
    note.value = ''
    uni.showToast({ title: noteCheck.reason || '感言包含不当内容，改一句再封存', icon: 'none', duration: 2500 })
    return
  }

  // 「一瓶留白」的边界：纯水允许封存（那正是彩蛋），但不能拿来交挑战作业——
  // 12 香调全 0 时契合度必然垫底，放行等于白送「今日挑战已完成」。
  const sealVals = getAccordValues()
  const isPureWater = !ACCORDS.some((a) => (sealVals[a.key] || 0) > 0)
  if (isPureWater && challengeTarget.value) {
    uni.showToast({ title: '一杯水可交不了挑战作业，先加点香调吧', icon: 'none', duration: 2500 })
    return
  }

  // 副作用先行：埋点与连签提前到画卡之前 —— 记录不该依赖画卡是否成功；
  // 且连签/层级先算好，卡面上的封存小字才是「封存之后」的准确状态。
  track('seal')
  recordSeal()
  // 静默型彩蛋统一收口：本次封存新达成几枚，合并成一条提示（幂等，重复不计）。
  // 十二味全开在拖动时就地提示、撞名在起名时提示、复刻类走横幅，都不在此列。
  let newEggCount = 0
  const sealEgg = (key) => { if (achieveEgg(key)) newEggCount++ }
  if (isPureWater) sealEgg('pure_water')
  // 挑战只在「挑战模式」下计完成：challengeTarget 只有接受挑战的入口会写
  // （首页 / 我的页的每日挑战卡），平时直接进工坊封存时它是 null，
  // 正常封存不计入今日挑战。wasDone 保证当天只弹一次完成提示，
  // 完成后再封存不重复祝贺。
  let challengeJustDone = false
  let challengeDoneScore = 0
  if (challengeTarget.value) {
    challengeDoneScore = challengeScore.value
    challengeJustDone = !isChallengeDone()
    markChallengeDone()
    // 「主题正解」：以正解级契合（≥95，即评分封顶的满分）完成当日挑战
    if (challengeDoneScore >= 95) sealEgg('perfect')
  }

  // 阶梯递进：封存数 +1，拿到当前层级（印章大小/角度/称号）
  const { tier, leveledUp, unlock } = bumpSealCount()
  // 同一次封存共用一个时间戳；提前到这里，让 drawCard 也能拿到真实封存时间
  // （否则旧卡片隔几天重开，卡面会印出重绘当天的日期，信息错误）。
  const sealTime = Date.now()
  // 时辰 / 连签彩蛋：卡面小字只印优先级最高的一个，登记互不排斥
  const sealHour = new Date(sealTime).getHours()
  const streakNow = getStreak()
  if (sealHour < 5) sealEgg('midnight')
  if (streakNow >= 7) sealEgg('streak7')
  const sealLabelText = sealLabelOf({
    tierLabel: tier.sealLabel, streak: streakNow, hour: sealHour, pureWater: isPureWater
  })
  // 合并提示：一枚单数、多枚 ×N，整条封存链路只有这一处静默型彩蛋提示。
  // 若本次封存同时弹挑战完成弹窗，彩蛋行并入弹窗文案——
  // toast 会被原生弹窗盖住，单独弹等于白弹（用户拍板）。
  const eggToast = newEggCount === 1
    ? '✦ 新彩蛋已收入「我的 · 彩蛋收藏」'
    : (newEggCount > 1 ? `✦ 新彩蛋 ×${newEggCount} 已收入「我的 · 彩蛋收藏」` : '')
  const eggLine = eggToast ? '\n' + eggToast : ''
  if (eggToast && !challengeJustDone) {
    uni.showToast({ title: eggToast, icon: 'none' })
  }
  const rarity = getRarity(computeRadarValues(getAccordValues()))

  // 画带印章的封存卡（含稀有度徽章 + 层级称号），用该层级的 stampScale/stampRotate
  if (card) {
    const vals = getAccordValues()
    const formula = generateFormula(vals)
    recompute()
    // 一瓶留白：卡片台词不用随机语录，念留白专属这句
    if (isPureWater) quote.value = '你封存了一杯水。留白也是一种配方，我收下了。'
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
      // 封存小字（留白/深夜/七日/层级）：cardData 会带到 card 页重绘，两处一致
      sealLabel: sealLabelText,
      origin: originRef.value,
      accent: mainAccordColor(vals),
      // 真实封存时间，旧卡片重绘不会变（drawCardBase 优先用它，否则回退当天）
      sealTime,
      canvas: card.canvas,
      qrCode: true,
      qrSrc  // 真小程序码路径
    })
    cardDrawn = true
    cardSealed.value = true
  }

  // 历史持久化（供配方库页读取）。埋点/连签/挑战判定已提前到画卡之前：
  // 记录不该依赖画卡是否成功。
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
      origin: originRef.value || '',
      note: note.value  // 调香感言随封存记录入库（已过审查）
    })
    uni.setStorageSync(key, arr.slice(0, 50))
  } catch (e) { /* 忽略 */ }

  // 本次封存时间戳记入会话并刷新比对缓存：「旧作重现」要剔除刚封的这瓶，
  // 否则封存完原地拖回原配方会自己触发自己
  sessionSealTimes.push(sealTime)
  loadSelfHistory()

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
    sealLabel: sealLabelText,
    // 接力链印记与挑战成绩：卡页据此印「改编自 ××」并给出「发起对决」入口
    origin: originRef.value || '',
    challenge: challengeJustDone ? { score: challengeDoneScore, theme: challengeInfo.value ? challengeInfo.value.theme : '' } : null,
    radarMode: radarMode.value  // 跨页一致：card 页读它重算雷达，不再回退默认 relative
  }
  try { uni.setStorageSync('isabella_card_data', cardData) } catch (e) { /* 忽略 */ }
  uni.navigateTo({ url: '/pages/card/card?from=seal' })

  // 弹提示：挑战完成优先于层级解锁（同一次封存两者都触发时，
  // 先报挑战成绩，用户确认后再看封存成就，避免两个原生弹窗打架）。
  if (challengeJustDone) {
    // 挑战已完成，收起横幅回到自由调香。文案分级：≥85 是漂亮收尾，
    // 低于 85 诚实说「已提交」——不打击但也不硬夸（85 与提示语「很接近」的档位一致）
    exitChallenge()
    const verdict = challengeDoneScore >= 85
      ? `今日挑战成功完成！你的得分是 ${challengeDoneScore} 分。`
      : `今日挑战已提交，得分 ${challengeDoneScore} 分。练练手感，明天再来。`
    uni.showModal({
      title: '今日挑战',
      content: verdict + eggLine,
      showCancel: false,
      confirmText: '好的',
      success: () => { if (leveledUp && unlock) showUnlockModal(unlock) }
    })
  } else if (leveledUp && unlock) {
    showUnlockModal(unlock)
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
  // 「十二味全开」按「同一次进工坊」计：每次进入都从零重新收集。
  // 注意 onShow 在切回小程序后台时也会触发，收集进度会重开——
  // 宁可重收一遍也不让条件跨天累积（登记条件写的是哪次就算哪次）。
  touchedAccords.clear()
  // 「旧作重现」比对源刷新：历史可能被配方库/收藏页的删除按钮改过
  loadSelfHistory()
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
  if (eggTimer) clearTimeout(eggTimer)
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
/* 字体：统一跟随系统默认（Georgia 衬线栈已移除，见 home.vue 顶部说明） */
.lab {
  min-height: 100vh;
  background: #f0eee5;
  padding: 24rpx 28rpx 60rpx;
  box-sizing: border-box;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
}
.lab-header { margin: 12rpx 0 20rpx; }
.lab-title { font-size: 40rpx; font-weight: 700; color: #2e5c45; display: block; font-family: inherit; letter-spacing: 1rpx; }
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
  font-family: inherit; letter-spacing: 0.5rpx;
}
.panel-title-row { display: flex; align-items: center; justify-content: space-between; }
.radar-mode { display: flex; align-items: center; gap: 8rpx; }
.rm-label { font-size: 22rpx; color: #9a958a; }
.rm-label.on { color: #2e5c45; font-weight: 600; }
.rm-switch { transform: scale(0.72); }
/* 画布下方留出呼吸：canvas 底部本身还压着轴标签，间距太小下面的文案会像糊在图上 */
.canvas-wrap { padding-top: 28rpx; padding-bottom: 6rpx; }
.rcanvas, .mcanvas { width: 600rpx; height: 600rpx; display: block; margin: 0 auto; }

/* 对比名香：从画布里搬出来单独成行，和雷达图明确分开。
   前面那段金色虚线与雷达里的虚线多边形呼应，一眼知道这是谁。 */
/* 不用 flex gap：老版本微信 webview 对 flex 的 gap 支持不齐，用 margin 更稳 */
.ref-perfume {
  margin-top: 30rpx;
  display: flex; align-items: center; justify-content: center;
}
.ref-dash {
  width: 28rpx; height: 0; flex-shrink: 0;
  border-top: 3rpx dashed #a97826;
}
.ref-name {
  margin-left: 12rpx;
  font-size: 23rpx; color: #a97826; font-weight: 600; letter-spacing: 1rpx;
}

/* 极端反馈/相似名香/彩蛋横幅已合并进常驻状态行 .panel-status（防抖动），旧样式随 v-if 一并移除 */
.ccanvas { width: 600rpx; height: 900rpx; display: block; margin: 0 auto; background: #f6f3ea; }
/* 离屏画布：移出视口而不是 display:none，避免部分基础库拿不到 node */
.lab-share-wrap {
  position: fixed; left: -9999px; top: 0;
  width: 0; height: 0; overflow: hidden; pointer-events: none;
}
.lab-share-canvas { width: 750px; height: 600px; }

.slider-item { margin-bottom: 10rpx; }
/* 纯水：单独占一段，用一条淡线把它和下面的香调区分开。
   它不是一种气味，视觉上也不该被当成第 13 个香调。 */
.solvent-item {
  padding-bottom: 16rpx; margin-bottom: 20rpx;
  border-bottom: 2rpx dashed rgba(46, 92, 69, 0.18);
}
.solvent-item .slider-name { color: #6f8a7d; }
.solvent-item .slider-val { color: #6f8a7d; }
.strength-line { display: flex; align-items: center; margin-top: 6rpx; }
.strength-name {
  font-size: 21rpx; color: #2e5c45; letter-spacing: 1rpx;
  border: 2rpx solid rgba(46, 92, 69, 0.35); border-radius: 20rpx;
  padding: 2rpx 14rpx; margin-right: 12rpx; flex-shrink: 0;
}
.strength-desc { font-size: 20rpx; color: #7a7970; }
.slider-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rpx; }
.slider-name { font-size: 26rpx; color: #2b2b2e; font-family: inherit; }
.slider-val { font-size: 24rpx; color: #a97826; font-weight: 600; font-family: inherit; min-width: 70rpx; text-align: center; }
/* ± 步进：44rpx 触控目标（全站触控标准），数值列定宽，位数变化不左右顶腾 */
.slider-stepper { display: flex; align-items: center; gap: 10rpx; flex-shrink: 0; }
.step-btn {
  width: 44rpx; height: 44rpx; line-height: 40rpx; text-align: center;
  border: 2rpx solid rgba(46,92,69,0.35); border-radius: 50%;
  font-size: 30rpx; font-weight: 600; color: #2e5c45; background: #fff;
  box-sizing: border-box;
}
.step-btn:active { background: #e7ede9; }
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
.adv-toggle { font-size: 24rpx; color: #7a7970; }
.adv-list { margin-top: 16rpx; }

.quote-panel { display: flex; flex-direction: column; gap: 14rpx; }
.quote { font-size: 28rpx; color: #6b6a6a; line-height: 1.6; font-family: inherit; }
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
  font-size: 40rpx; color: #7a7970; flex-shrink: 0;
  width: 48rpx; height: 48rpx; line-height: 44rpx; text-align: center;
}

/* 提示降级：标题即谜面，「看提示」挂在标题正下方（点击开合），
   展开后的提示内容显示在右侧介绍行之下 */
.cb-intro { font-size: 22rpx; color: #6b6a6a; line-height: 1.4; }
.cb-hint-toggle {
  font-size: 22rpx; color: #a97826; font-weight: 600;
  align-self: flex-start; text-decoration: underline;
}

/* 挑战吸顶条：滚过横幅后从顶端淡入的一行紧凑条。
   fixed 定位不碰文档流；底色不透明，盖得住原生 canvas；
   层级低于释义 sheet（50）与引导蒙层（300），不会压住弹层。 */
.cb-sticky {
  position: fixed; top: 0; left: 0; right: 0; z-index: 40;
  display: flex; align-items: center; gap: 14rpx;
  padding: 16rpx 28rpx; box-sizing: border-box;
  background: #f6f3ea;
  border-bottom: 2rpx solid rgba(46,92,69,0.18);
  opacity: 0; transform: translateY(-100%);
  transition: opacity 0.22s ease, transform 0.22s ease;
  pointer-events: none;
}
.cb-sticky.show { opacity: 1; transform: translateY(0); pointer-events: auto; }
.cb-sticky-tag {
  font-size: 20rpx; color: #fff; background: #2e5c45;
  border-radius: 20rpx; padding: 2rpx 12rpx; flex-shrink: 0;
}
.cb-sticky-theme {
  flex: 1; min-width: 0; font-size: 26rpx; font-weight: 700; color: #2b2b2e;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cb-sticky-score { font-size: 28rpx; font-weight: 700; color: #a97826; flex-shrink: 0; }
.cb-sticky-close {
  font-size: 36rpx; color: #7a7970; flex-shrink: 0;
  width: 44rpx; height: 44rpx; line-height: 44rpx; text-align: center;
}

/* 工坊雷达下方的气息特征字幕：把六个坐标轴翻译成人话。
   常驻占一行（空态给引导文案），高度固定——纯水起步第一次拖动时
   内容出现不会再把下面的面板顶下去（真机反馈的抖动来源之一）。 */
.radar-caption {
  height: 40rpx; line-height: 40rpx; margin-top: 20rpx; text-align: center;
  font-size: 24rpx; color: #2e5c45; letter-spacing: 1rpx;
}
.radar-caption.dim { color: #b0ae9f; }

/* 常驻状态行：彩蛋横幅 / 极端反馈 / 相似名香 共用，高度固定防抖 */
.panel-status {
  height: 64rpx; margin-top: 14rpx;
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  font-size: 24rpx; overflow: hidden;
}
.panel-status .status-text {
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.panel-status.is-egg .status-text {
  color: #8a5f18; font-weight: 700; letter-spacing: 2rpx;
}
.panel-status.is-egg .status-star { color: #a97826; font-size: 22rpx; }
.panel-status.is-feedback .status-text { color: #3a3a38; }
.panel-status.is-near .status-text {
  color: #a97826; letter-spacing: 1rpx;
  background: rgba(169, 120, 38, 0.09);
  border-radius: 30rpx; padding: 6rpx 24rpx;
}
.sheet-note {
  margin-top: 20rpx; padding: 14rpx 18rpx;
  background: rgba(46, 92, 69, 0.06); border-radius: 12rpx;
  font-size: 22rpx; color: #7a7970; line-height: 1.7;
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
  font-size: 22rpx; color: #a97826; border: 2rpx solid rgba(169,120,38,0.4);
  border-radius: 50%; width: 44rpx; height: 44rpx; line-height: 40rpx;
  box-sizing: border-box; text-align: center; flex-shrink: 0; font-family: inherit;
  font-style: italic;
}

/* 实时气味播报：拖动时把动作翻译成大白话。
   常驻占一行，出现/消失只做透明度渐变——背景色也随之淡入淡出，
   高度不变，拖动时上下的面板不再被顶得跳动（真机反馈）。 */
.scent-broadcast {
  height: 44rpx; line-height: 44rpx; margin-bottom: 14rpx; border-radius: 12rpx;
  background: rgba(46,92,69,0.08); color: #2e5c45;
  font-size: 25rpx; text-align: center;
  opacity: 0; transition: opacity 0.25s ease;
}
.scent-broadcast.show { opacity: 1; }

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
.sheet-sub { font-size: 24rpx; color: #7a7970; margin: 22rpx 0 12rpx; }
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
/* 「摇一瓶」是生成动作，不是编辑动作，用金色和「撤销/重置」区分开 */
.tool-btn-cta {
  color: #a97826; border-color: rgba(169,120,38,0.45);
}
.tool-btn-cta:active { background: rgba(169,120,38,0.1); }

/* 一键气味模板 */
.tpl-tip {
  font-size: 22rpx; color: #7a7970; line-height: 1.5; margin-bottom: 10rpx;
  text-align: center;
}
.tpl-row { display: flex; gap: 14rpx; margin-bottom: 12rpx; }
.tpl-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx;
  background: #fff; border: 2rpx solid rgba(46,92,69,0.16);
  border-radius: 14rpx; padding: 16rpx 6rpx;
}
.tpl-btn:active { background: rgba(46,92,69,0.06); }
.tpl-label { font-size: 22rpx; color: #2b2b2e; font-family: inherit; }

/* 归一化解释 */
.normalize-hint { font-size: 21rpx; color: #7a7970; margin-bottom: 12rpx; }

/* 靠近名香提示 / 复刻名香彩蛋横幅：已合并进常驻状态行 .panel-status（防抖动） */

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
