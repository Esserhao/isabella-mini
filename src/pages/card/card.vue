<template>
  <view class="card-page">
    <view class="cp-head">
      <text class="cp-no">{{ subtitle }}</text>
      <text class="cp-name">{{ data.name || '未命名香氛' }}</text>
      <!-- 稀有度徽章 + 层级称号 -->
      <view class="cp-badge" v-if="data.rarity">
        <text class="cp-badge-text">{{ data.rarity }}</text>
        <text class="cp-badge-sep" v-if="data.tierTitle">·</text>
        <text class="cp-badge-text" v-if="data.tierTitle">{{ data.tierTitle }}</text>
      </view>
      <text class="cp-rarity-desc" v-if="data.rarityText">{{ data.rarityText }}</text>
    </view>

    <!-- 对决条：从「发起对决」分享进来的好友可见——同一天打开即同一道题 -->
    <view class="duel-banner" v-if="duelInfo">
      <text class="duel-line"><text class="duel-name">{{ duelInfo.name }}</text> 在「{{ duelInfo.theme }}」拿下</text>
      <text class="duel-score">{{ duelInfo.score }}<text class="duel-unit"> 分</text></text>
      <button class="cp-duel-accept" @tap="acceptDuel">用今天的题目应战 →</button>
    </view>

    <!-- 封存卡：与工坊同一份 drawCard，避免三处复制 canvas 代码 -->
    <view class="cp-canvas-wrap">
      <canvas type="2d" id="cardPageCanvas" class="cp-canvas"></canvas>
    </view>

    <!-- 分享图：转发好友 5:4、朋友圈 1:1。离屏绘制，只为导出图片，不展示 -->
    <view class="cp-share-wrap">
      <canvas type="2d" id="shareFriendCanvas" class="cp-share-canvas"></canvas>
      <canvas type="2d" id="shareTimelineCanvas" class="cp-share-canvas"></canvas>
    </view>

    <!-- 感言只印在卡面画布上（金线下方），页面不再重复展示——同一屏两遍是噪音 -->
    <view class="cp-btn-row">
      <button class="cp-btn fav" :class="{ on: faved }" @tap="toggleFav">
        {{ faved ? '♥ 已收藏' : '♡ 收藏' }}
      </button>
      <button class="cp-btn primary" @tap="saveCard">保存到相册</button>
      <button class="cp-btn gold" open-type="share" @tap="onShareTap">分享</button>
    </view>
    <!-- 发起对决：挑战完成的卡才有——分享出去的卡带分数与题名，好友同题应战 -->
    <button class="cp-duel-btn" v-if="data.challenge" open-type="share" @tap="onDuelShareTap">
      ⚔ 发起对决 · 让好友用同一道题应战
    </button>
    <!-- 扫码进入的人：把这瓶香搬到工坊里接着调 -->
    <button class="cp-blend" @tap="blendThis">我也调一瓶 · 去工坊</button>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onReady, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { ACCORDS, RADAR_LABELS } from '@/utils/data.js'
import { computeRadarValues, generateFormula, getGuQuote, topAccordDesc, getDailyChallenge, setDailyChallengeTarget } from '@/utils/mix.js'
import { drawCard, drawShareCard, SHARE_SIZE, mainAccordColor } from '@/utils/canvas-draw.js'
import { THEME } from '@/utils/theme.js'
import { isFaved, toggleFav as toggleFavStore, stableFavId } from '@/utils/favorites.js'
import { track } from '@/utils/analytics.js'
import { currentTier } from '@/utils/progress.js'
import { getWxacodePath, decodeAccordParams, setPendingBlend } from '@/utils/wxacode.js'

// 入参：{ time, name, accords, quote, formula, note, rarity, rarityText, tierTitle, tierKey, sealLabel }
// accords 是唯一必需项，其余缺失时现场补算，保证任何调用方（历史/收藏/封存）都能画出卡
const data = ref({
  name: '', accords: {}, quote: '', formula: [], note: '',
  time: 0, rarity: '', rarityText: '', tierTitle: '', tierKey: 'novice', sealLabel: '已封存',
  origin: '', challenge: null
})
// 对决视图：从「发起对决」分享卡进来的好友可见（分数/题名/发起人走 query 参数）
const duelInfo = ref(null)
const faved = ref(false)
// 收藏用的主键时间戳。正常封存卡等于 data.time；分享/扫码进来的卡 time 为 0，
// 首次点收藏时现场生成一个，避免 favorites.js 因缺 time 直接 return false。
const favTime = ref(0)
// 卡面封存小字只有「真封存」的卡才带（lab 的 cardData）。
// 扫码/分享/历史还原的卡没有这个字段——不能拿层级兜底去画「已封存」，
// 收卡人并没有封存过，卡面小字维持「扫码调香 · 调出你的味道」默认文案。
const sealLabelFromSeal = ref(false)
const tempPath = ref('')
// 分享图：微信要求转发好友 5:4、朋友圈 1:1，直接用 600×900 的卡会被居中裁掉香名和感言
const tempPathFriend = ref('')
const tempPathTimeline = ref('')
let card = null

const subtitle = computed(() => {
  if (!data.value.time) return '已封存'
  const d = new Date(data.value.time)
  const p = (n) => ('' + n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} · 已封存`
})

function normalizeAccords(raw) {
  const vals = {}
  ACCORDS.forEach((a) => { vals[a.key] = Number((raw || {})[a.key]) || 0 })
  return vals
}

function safeDecode(s) {
  try { return decodeURIComponent(s) } catch (e) { return s }
}

// 四种进入方式：
//   1. 站内跳转（from=seal）：从 Storage 读取完整数据
//   2. 分享进入（s参数）：从 URL 解析简化数据
//   3. 站内跳转（q参数）：从 URL 解析 JSON（兼容旧版）
//   4. 扫专属小程序码：p=逗号分隔的 12 香调比例 & n=香名
onLoad((option) => {
  let parsed = {}

  // 方式1：从 Storage 读取（封存跳转）
  if (option.from === 'seal') {
    try {
      parsed = uni.getStorageSync('isabella_card_data') || {}
      uni.removeStorageSync('isabella_card_data') // 读取后清除
    } catch (e) {
      console.error('[card] storage read error:', e)
    }
  }

  // 方式2：从 URL s 参数解析（分享链接，简化数据）
  // 仅在尚未解析出有效数据时尝试，避免覆盖方式1的结果
  if (!parsed.accords && !parsed.time && option.s) {
    try {
      const decoded = decodeURIComponent(option.s)
      parsed = JSON.parse(decoded)
    } catch (e) {
      console.error('[card] parse s error:', e)
    }
  }

  // 方式3：从 URL q 参数解析（兼容旧版）
  // 仅在尚未解析出 accords 时尝试，避免覆盖方式1/2的结果
  if (!parsed.accords && option.q) {
    try {
      const decoded = decodeURIComponent(option.q)
      parsed = JSON.parse(decoded)
    } catch (e) {
      console.error('[card] parse q error:', e)
    }
  }

  // 方式4：扫码进入（p/n 参数）
  if (option && option.p) {
    const scanned = decodeAccordParams(safeDecode(option.p))
    if (scanned) {
      parsed = {
        accords: scanned,
        name: option.n ? safeDecode(option.n) : parsed.name || ''
      }
      track('scan_restore')
    }
  }

  const accords = normalizeAccords(parsed.accords)
  // radarMode 跨页一致：lab 封存时把模式写进 cardData，这里读它，
  // 否则 lab 切「对比名香」封存后，card 页一律按默认 relative 重算，
  // 同一瓶香两页雷达图形状不同。
  const radarMode = parsed.radarMode || 'relative'
  const radarValues = computeRadarValues(accords, radarMode)
  const tier = currentTier()

  data.value = {
    time: parsed.time || 0,
    name: parsed.name || '未命名香氛',
    accords,
    radarMode,
    quote: parsed.quote || getGuQuote(radarValues, { voice: tier.voice }),
    formula: parsed.formula && parsed.formula.length ? parsed.formula : generateFormula(accords),
    note: parsed.note || '',
    rarity: parsed.rarity || '',
    rarityText: parsed.rarityText || '',
    tierTitle: parsed.tierTitle || tier.title,
    tierKey: parsed.tierKey || tier.key,
    sealLabel: parsed.sealLabel || tier.sealLabel,
    origin: parsed.origin || '',
    challenge: parsed.challenge || null
  }
  favTime.value = data.value.time || 0
  faved.value = isFaved(data.value.time)
  sealLabelFromSeal.value = !!parsed.sealLabel
  // 对决参数（发起人分数/名字/题名走 query，配方走 s 参数）：
  // 同一天打开是同一道题（按日期取模选题），跨天则题名仅作参照
  if (option.ds) {
    duelInfo.value = {
      score: Number(option.ds) || 0,
      name: option.dn ? safeDecode(option.dn) : '',
      theme: option.dt ? safeDecode(option.dt) : ''
    }
  }
})

function initCanvas(sel, designW, designH) {
  return new Promise((resolve) => {
    let done = false
    const finish = (val) => { if (!done) { done = true; resolve(val) } }
    try {
      uni.createSelectorQuery().select(sel).fields({ node: true, size: true }).exec((res) => {
        try {
          // res[0] 存在但 node 为空（canvas 尚未挂载）时同样要兜住，否则 getContext 直接抛错
          if (!res || !res[0] || !res[0].node) return finish(null)
          const cvs = res[0].node
          const ctx = cvs.getContext('2d')
          if (!ctx) return finish(null)
          // dpr 取像素比：uni.getWindowInfo 在部分旧基础库/开发者工具里不存在，
          // 必须回退 uni.getSystemInfoSync，否则 GetWindowInfo is not a function 会抛错、
          // 让 exec 回调崩在 resolve 之前 → Promise 永不 resolve → onReady 挂死。
          let dpr = 1
          try {
            dpr = (uni.getWindowInfo && uni.getWindowInfo().pixelRatio) ||
                  (uni.getSystemInfoSync && uni.getSystemInfoSync().pixelRatio) || 1
          } catch (e) { dpr = 1 }
          const w = designW || res[0].width || 300
          const h = designH || res[0].height || 450
          cvs.width = Math.max(1, Math.round(w * dpr))
          cvs.height = Math.max(1, Math.round(h * dpr))
          ctx.scale(dpr, dpr)
          finish({ canvas: cvs, ctx, w, h })
        } catch (e) { finish(null) }
      })
    } catch (e) { finish(null) }
  })
}

onReady(async () => {
  card = await initCanvas('#cardPageCanvas', 600, 900)
  if (!card) return
  // 这瓶香专属的真小程序码：扫码直达封存卡并还原配方。
  // 云开发未开通/生成失败时 qrSrc 为空串，drawCard 会跳过码图（不阻塞画卡）。
  const qrSrc = await getWxacodePath(data.value.accords, data.value.name)
  // 卡面画稀有度徽章 + 层级称号
  await drawCard(card.ctx, {
    width: card.w, height: card.h,
    name: data.value.name,
    radarValues: computeRadarValues(data.value.accords, data.value.radarMode),
    labels: RADAR_LABELS,
    quote: data.value.quote,
    formula: data.value.formula,
    // 用户封存时填的调香感言，画在金线下方；未填则不显示该区块
    note: data.value.note,
    accords: ACCORDS,
    accordValues: data.value.accords,
    theme: THEME,
    rarity: data.value.rarity,
    tierTitle: data.value.tierTitle,
    // 只在真封存的卡上画封存小字（留白/深夜/七日/层级）；
    // 其余进入方式留空，drawCardBase 回退「扫码调香 · 调出你的味道」
    sealLabel: sealLabelFromSeal.value ? data.value.sealLabel : '',
    // 接力链印记 + 主调金线
    origin: data.value.origin,
    accent: mainAccordColor(data.value.accords),
    // 真实封存时间（data.time）；分享/扫码进来的卡 time 为 0，drawCardBase 回退当天
    sealTime: data.value.time,
    canvas: card.canvas,
    qrCode: true,
    qrSrc
  })
  ensureTemp()
  ensureShareTemp()  // 不 await：分享图晚一点好也没关系，别拖慢首屏
})

function ensureTemp() {
  return new Promise((resolve) => {
    if (!card) { resolve(); return }
    // 2D canvas 不传 x/y/width/height，避免物理像素错配；dest 用物理像素保证清晰
    uni.canvasToTempFilePath({
      canvas: card.canvas,
      destWidth: card.canvas.width,
      destHeight: card.canvas.height,
      success: (res) => { tempPath.value = res.tempFilePath; resolve() },
      fail: (err) => { console.warn('[card] canvasToTempFilePath fail', err); resolve() }
    })
  })
}

// 把一张离屏 canvas 导出成临时文件
function exportTemp(cvs) {
  return new Promise((resolve) => {
    if (!cvs) { resolve(''); return }
    uni.canvasToTempFilePath({
      canvas: cvs,
      destWidth: cvs.width,
      destHeight: cvs.height,
      success: (res) => resolve(res.tempFilePath || ''),
      fail: (err) => { console.warn('[card] share canvasToTempFilePath fail', err); resolve('') }
    })
  })
}

// 分享图单独画一版：香名 + 雷达色块 + 一句话，不放小程序码。
// 分享出去的是小程序卡片，点开直接进小程序，码只在「存到相册」那张图上才有意义。
// 进页面就生成好，避免用户点分享时才开始画（会卡一下甚至超时）。
async function ensureShareTemp() {
  const base = {
    name: data.value.name,
    radarValues: computeRadarValues(data.value.accords, data.value.radarMode),
    quote: data.value.quote,
    accords: ACCORDS,
    accordValues: data.value.accords,
    theme: THEME
  }
  // 挑战完成的卡：分享图标题下印对决行（图自己会喊话），普通分享不带
  if (data.value.challenge) {
    base.duel = { score: data.value.challenge.score, theme: data.value.challenge.theme }
  }
  const friend = await initCanvas('#shareFriendCanvas', SHARE_SIZE.friend.w, SHARE_SIZE.friend.h)
  if (friend) {
    drawShareCard(friend.ctx, { ...base, width: friend.w, height: friend.h })
    tempPathFriend.value = await exportTemp(friend.canvas)
    // 导出后把离屏 canvas 缩到 1×1 释放显存：dpr=3 下一张 750×600 约 16MB，两张 32MB。
    // card 页分享图只画一次，缩掉无副作用（temp 文件已是位图快照）。
    friend.canvas.width = 1
    friend.canvas.height = 1
  }
  const timeline = await initCanvas('#shareTimelineCanvas', SHARE_SIZE.timeline.w, SHARE_SIZE.timeline.h)
  if (timeline) {
    drawShareCard(timeline.ctx, { ...base, width: timeline.w, height: timeline.h })
    tempPathTimeline.value = await exportTemp(timeline.canvas)
    timeline.canvas.width = 1
    timeline.canvas.height = 1
  }
}

// 检查并申请相册写入权限，返回是否已授权（已授权或本次刚授权都算 true）
function authorizeAlbum() {
  return new Promise((resolve) => {
    uni.getSetting({
      success: (res) => {
        // res.authSetting 在极端情况下可能缺失，直接下标会抛错
        const auth = (res && res.authSetting) ? res.authSetting['scope.writePhotosAlbum'] : undefined
        if (auth === true) return resolve(true)
        if (auth === false) {
          // 之前拒绝过 → 引导去设置
          uni.showModal({
            title: '需要相册权限',
            content: '保存图片需要相册权限，请在设置中开启后重试。',
            confirmText: '去设置', cancelText: '稍后',
            success: (m) => {
              if (m.confirm) {
                uni.openSetting({
                  success: (s) => resolve(!!(s && s.authSetting && s.authSetting['scope.writePhotosAlbum'])),
                  fail: () => resolve(false)
                })
              } else resolve(false)
            },
            fail: () => resolve(false)
          })
          return
        }
        // 未询问过 → 申请授权
        uni.authorize({
          scope: 'scope.writePhotosAlbum',
          success: () => resolve(true),
          fail: () => {
            uni.showModal({
              title: '需要相册权限',
              content: '保存图片需要相册权限，请在设置中开启后重试。',
              confirmText: '去设置', cancelText: '稍后',
              success: (m) => {
                if (m.confirm) {
                  uni.openSetting({
                    success: (s) => resolve(!!(s && s.authSetting && s.authSetting['scope.writePhotosAlbum'])),
                    fail: () => resolve(false)
                  })
                } else resolve(false)
              },
              fail: () => resolve(false)
            })
          }
        })
      },
      fail: () => resolve(false)
    })
  })
}

function toggleFav() {
  // 分享链接（s 参数）/ 扫码（p 参数）进来的卡片没有 time，
  // 而 favorites.js 的 toggleFav 用 time 当主键、缺失就 return false，
  // 会导致点收藏静默失败还提示「已取消收藏」。这里补一个只用于收藏主键的时间戳，
  // 不写回 data.value.time——否则 subtitle 会把"今天"当成封存日期显示，反而误导。
  if (!favTime.value) {
    // 长周期雷修复：主键若是「当场生成的随机时间戳」，同一瓶扫码香每次收藏
    // 都会生成新条目，收藏列表会随使用越攒越多——改用稳定派生主键，
    // 同一瓶重复收藏只命中同一条
    favTime.value = data.value.time || stableFavId(data.value.name, data.value.accords)
  }
  const wasFaved = isFaved(favTime.value)
  const nowFaved = toggleFavStore({
    time: favTime.value,
    name: data.value.name,
    accords: data.value.accords,
    quote: data.value.quote,
    formula: data.value.formula,
    note: data.value.note,
    origin: data.value.origin
  })
  faved.value = nowFaved
  track(nowFaved ? 'fav_add' : 'fav_remove')
  // 满仓提示：把「静默挤掉最早」变成知情选择
  if (nowFaved && !wasFaved && getFavorites().length >= 100) {
    uni.showToast({ title: '收藏已满 100 件，最早的将被挤出', icon: 'none', duration: 2500 })
  } else {
    uni.showToast({ title: nowFaved ? '已收藏' : '已取消收藏', icon: 'none' })
  }
}

async function saveCard() {
  if (!card) {
    uni.showToast({ title: '卡片未就绪', icon: 'none' })
    return
  }
  await ensureTemp()
  if (!tempPath.value) {
    uni.showToast({ title: '图片导出失败，请重试', icon: 'none' })
    return
  }
  // 先确保相册权限（首次会弹系统授权；被拒过则引导去设置），再保存
  const ok = await authorizeAlbum()
  if (!ok) return
  uni.saveImageToPhotosAlbum({
    filePath: tempPath.value,
    success: () => {
      track('save_card')
      uni.showToast({ title: '已保存到相册', icon: 'success' })
    },
    fail: (err) => {
      const msg = (err && err.errMsg) || ''
      if (/auth|deny/i.test(msg)) {
        uni.showModal({
          title: '需要相册权限',
          content: '保存图片需要相册权限，请在设置中开启后重试。',
          confirmText: '去设置', cancelText: '稍后',
          success: (m) => { if (m.confirm) uni.openSetting() }
        })
      } else {
        uni.showToast({ title: '保存失败：' + msg, icon: 'none' })
      }
    }
  })
}

// 「我也调一瓶」：把当前配方暂存后跳工坊（lab 是 tab 页，参数走 storage 接力）
function blendThis() {
  // 来源印记 = 这张卡自己的名字：好友改编后再封存，卡面会印「改编自 ××」
  setPendingBlend(data.value.accords, data.value.name, data.value.name)
  track('blend_from_card')
  uni.switchTab({ url: '/pages/lab/lab' })
}

// 分享按钮点击：确保缩略图就绪 + 埋点（open-type="share" 自动触发 onShareAppMessage）
async function onShareTap() {
  await ensureTemp()
  track('share')
}

// 对决分享点击：埋点（open-type="share" 自动触发对决分支的 onShareAppMessage）
function onDuelShareTap() {
  track('duel_share')
}

// 好友应战：接受今天的题目进工坊（选题按日期取模，同一天打开即同一道题）
function acceptDuel() {
  setDailyChallengeTarget(getDailyChallenge())
  track('duel_accept')
  uni.showToast({ title: '去工坊应战', icon: 'none' })
  uni.switchTab({ url: '/pages/lab/lab' })
}

// 分享标题：未起名时改用主香调描述（如「柑橘调·木质调」），
// 避免分享出去印着「未命名香氛」这种占位文案。
function shareTitleOf() {
  return (data.value.name && data.value.name !== '未命名香氛')
    ? `「${data.value.name}」我调了一瓶属于我的香水`
    : `我调了一瓶属于我的${topAccordDesc(data.value.accords, 2)}香水`
}

// 微信原生分享：好友/群聊点击卡片进来，直接看到这瓶香
// 只传递核心数据（name, accords, radarMode），其他数据在接收端重新计算
// 注意：path 不能以 / 开头，否则部分微信版本会丢弃 query 参数
onShareAppMessage(() => {
  // 对决模式：挑战完成的卡分享出去自带分数与题名，好友同题应战
  if (data.value.challenge) {
    const c = data.value.challenge
    const duelShare = { name: data.value.name, accords: data.value.accords, radarMode: data.value.radarMode }
    const obj = {
      title: `我在「${c.theme}」拿下 ${c.score} 分，敢来应战吗`,
      path: `pages/card/card?s=${encodeURIComponent(JSON.stringify(duelShare))}&ds=${c.score}&dn=${encodeURIComponent(data.value.name)}&dt=${encodeURIComponent(c.theme)}`
    }
    if (tempPathFriend.value) obj.imageUrl = tempPathFriend.value
    return obj
  }
  const shareData = {
    name: data.value.name,
    accords: data.value.accords,
    radarMode: data.value.radarMode
  }
  const obj = {
    title: shareTitleOf(),
    path: `pages/card/card?s=${encodeURIComponent(JSON.stringify(shareData))}`
  }
  // 用 5:4 的分享图，不是 600×900 的封存卡——后者会被居中裁掉香名和调香感言
  if (tempPathFriend.value) obj.imageUrl = tempPathFriend.value
  return obj
})

// 朋友圈：图片规范 1:1，同样不能用封存卡
onShareTimeline(() => {
  const obj = {
    title: shareTitleOf()
  }
  if (tempPathTimeline.value) obj.imageUrl = tempPathTimeline.value
  return obj
})
</script>

<style scoped>
.card-page {
  min-height: 100vh; background: #f0eee5;
  padding: 28rpx 28rpx calc(40rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.cp-head { display: flex; flex-direction: column; align-items: center; margin-bottom: 22rpx; }
.cp-no { font-size: 21rpx; color: #a97826; letter-spacing: 3rpx; }
.cp-name { font-size: 38rpx; font-weight: 700; color: #2e5c45; margin-top: 8rpx; letter-spacing: 2rpx; }

/* 稀有度徽章 + 层级称号 */
.cp-badge {
  margin-top: 10rpx;
  display: flex; align-items: center; gap: 8rpx;
}
.cp-badge-text {
  font-size: 22rpx; color: #a97826; font-weight: 600;
  letter-spacing: 2rpx;
}
.cp-badge-sep {
  font-size: 22rpx; color: #a97826; opacity: 0.5;
}
.cp-rarity-desc {
  margin-top: 6rpx;
  font-size: 21rpx; color: #6b6a6a; line-height: 1.5;
  text-align: center;
}

/* 离屏画布：移出视口而不是 display:none，避免部分基础库拿不到 node */
.cp-share-wrap {
  position: fixed; left: -9999px; top: 0;
  width: 0; height: 0; overflow: hidden; pointer-events: none;
}
.cp-share-canvas { width: 750px; height: 600px; }
.cp-canvas-wrap { display: flex; justify-content: center; }
.cp-canvas {
  width: 600rpx; height: 900rpx; display: block; background: #f6f3ea;
  border-radius: 8rpx; box-shadow: 0 12rpx 36rpx rgba(46,92,69,0.12);
}

.cp-btn-row { display: flex; gap: 16rpx; margin-top: 30rpx; }
.cp-btn {
  flex: 1; font-size: 26rpx; border-radius: 14rpx; padding: 18rpx 0; margin: 0; line-height: 1.4;
}
.cp-btn::after { border: none; }
.cp-btn.fav { background: #fff; color: #a97826; border: 2rpx solid rgba(169,120,38,0.45); }
.cp-btn.fav.on { background: #a97826; color: #fff; border-color: #a97826; }
.cp-btn.primary { background: #2e5c45; color: #fff; }
.cp-btn.gold { background: #a97826; color: #fff; }

/* 对决条：好友从「发起对决」分享进来时的应战入口 */
.duel-banner {
  margin-bottom: 20rpx;
  background: linear-gradient(120deg, #eef3ee, #f6f3ea);
  border: 2rpx solid rgba(169,120,38,0.45);
  border-left: 8rpx solid #a97826;
  border-radius: 16rpx; padding: 20rpx 24rpx;
  display: flex; flex-direction: column; gap: 8rpx;
}
.duel-line { font-size: 25rpx; color: #3a3a38; line-height: 1.5; }
.duel-name { font-weight: 700; color: #2e5c45; }
.duel-score { font-size: 40rpx; font-weight: 700; color: #a97826; }
.duel-unit { font-size: 22rpx; font-weight: 400; color: #7a7970; }
.cp-duel-accept {
  margin: 0; font-size: 27rpx; font-weight: 600; color: #fff;
  background: #a97826; border-radius: 14rpx; padding: 18rpx 0; line-height: 1.4;
}
.cp-duel-accept::after { border: none; }
.cp-duel-accept:active { background: #8f651c; }

/* 发起对决：挑战完成的卡独有，金色次级按钮（open-type=share 走对决分支） */
.cp-duel-btn {
  margin-top: 16rpx; width: 100%; box-sizing: border-box;
  font-size: 26rpx; font-weight: 600; color: #a97826;
  background: rgba(169,120,38,0.08);
  border: 2rpx solid rgba(169,120,38,0.45); border-radius: 14rpx;
  padding: 18rpx 0; line-height: 1.4; letter-spacing: 1rpx;
}
.cp-duel-btn::after { border: none; }
.cp-duel-btn:active { background: #f3ead8; }

/* 扫码者复刻入口：弱化的第二行动，不与分享按钮抢焦点 */
.cp-blend {
  margin-top: 20rpx; width: 100%; box-sizing: border-box;
  font-size: 26rpx; color: #2e5c45; background: rgba(46,92,69,0.08);
  border: 2rpx solid rgba(46,92,69,0.35); border-radius: 14rpx;
  padding: 18rpx 0; line-height: 1.4; letter-spacing: 2rpx;
}
.cp-blend::after { border: none; }
</style>
