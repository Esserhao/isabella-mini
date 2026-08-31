import { reactive } from 'vue'

// 手把手教程步骤。
// page：该步骤高亮发生在哪个 tabBar 页（home / gallery / lab）。
// target：目标元素的选择器（对应各页模板里加的 id），用于取包围盒画聚光灯。
// title / text：侧边注解，要求「简洁不失明确」，小白不反感。
export const TUTORIAL_STEPS = [
  // 首页：两个入口，对应「想尝试一下 / 不想动太多手」
  { page: 'home',    target: '#coachHeroBtn',     title: '想尝试一下',        text: '点这个按钮，进工坊亲手调一瓶只属于你的香。' },
  { page: 'home',    target: '#coachRandomBtn',   title: '不想动太多手',      text: '懒得想配方？让它随机帮你挑一瓶，进去微调就行。' },
  // 图鉴：对香水、香料的简单介绍
  { page: 'gallery', target: '#coachGalleryCard', title: '图鉴',              text: '这里是对香水、香料的简单介绍。挑一款点进去看它的气息结构，喜欢就「以这瓶为基调去调香」。' },
  // 工坊（最重点）：先讲雷达，再讲滑块
  { page: 'lab',     target: '#coachRadar',       title: '这是你的香气画像',  text: '中间这张六维雷达，实时反映你现在的味道。下面滑块一动，它就跟着变。' },
  { page: 'lab',     target: '#coachSliders',     title: '拖动滑块，调出你的香', text: '最上面是纯水，下面是 12 个香调。上下拖动加香调，就是从纯水里置换——水让完了香调才互让，总和一直是 100%，不会调坏。' }
]

// page key → tabBar 页真实路径，用于跨页 switchTab
const PAGE_URL = {
  home: '/pages/home/home',
  gallery: '/pages/gallery/gallery',
  lab: '/pages/lab/lab'
}

export const tut = reactive({
  active: false,
  index: 0,
  // 复位信号：图鉴页把教程目标所在的 tab / 滚动 / 横滑复位后，
  // 自增一下，让 CoachMask 在「复位真正生效」之后重新量一次位置。
  // 不这么做的话，用户提前逛过图鉴（列表被滚下去 / 停在别的 tab），
  // 教程跳到第 3 步时 CoachMask 可能在上次缓存的坐标上量到屏幕外，
  // 一路兜底到屏幕中段的错误亮框。
  coachBump: 0
})

// 图鉴页复位完成后调用：触发 CoachMask 重新取位
export function bumpCoach() {
  tut.coachBump++
}

export function startTour() {
  tut.active = true
  tut.index = 0
}

export function finishTour() {
  tut.active = false
  try { uni.setStorageSync('gu_tour_done', 1) } catch (e) { /* 忽略 */ }
  // 第 4/5 步在工坊，已经讲过雷达和滑块。若是在这两步完成或跳过的，
  // 就别再让工坊弹「第一次来工坊？」把同样的内容重复一遍——
  // 教程结束那一刻 tut.active 已置 false，下次进工坊 onShow 就会弹。
  // 在首页/图鉴就早早退出的（index < 3）不算，那种情况工坊蒙层还有价值。
  // 注意 tut.index 此时还没被重置，可以放心读。
  if (tut.index >= 3) {
    try { uni.setStorageSync('gu_lab_guided', 1) } catch (e) { /* 忽略 */ }
  }
}

export function nextStep() {
  if (tut.index < TUTORIAL_STEPS.length - 1) tut.index++
  else finishTour()
}

export function prevStep() {
  if (tut.index > 0) tut.index--
}

export function currentStep() {
  return TUTORIAL_STEPS[tut.index]
}

export function stepTotal() {
  return TUTORIAL_STEPS.length
}

export function goToPage(page) {
  const url = PAGE_URL[page]
  if (url) uni.switchTab({ url })
}
