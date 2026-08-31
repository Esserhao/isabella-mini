<script>
export default {
  onLaunch: function () {
    // #ifdef MP-WEIXIN
    // 云开发初始化：留言建议（submitFeedback）、小程序码（getWxacode）都依赖它。
    // 未开通云开发时 init 失败仅告警，相关功能自动降级，不影响主流程。
    if (wx.cloud) {
      try {
        wx.cloud.init({
          env: 'cloud1-d1gtgc2ay5625e4b4', // 你的云开发环境 ID
          traceUser: true
        })
      } catch (e) {
        console.warn('[cloud] 初始化失败（可能未开通云开发）', e)
      }
    }
    // #endif
  },
  onShow: function () {
  },
  onHide: function () {
  },
}
</script>

<style>
/*每个页面公共css */

/* 手写感字体：系统楷体，不引字体文件（省包体、免域名白名单）。
   图鉴拍立得短句、详情贴图短句、收藏/历史感言三处共用。
   别加 font-style: italic —— 中文没有真正的 italic 字形，iOS/Android 都是
   把方块字机械倾斜约 12°，观感是「字歪了」而不是「手写」。 */
page {
  --font-hand: 'STKaiti', 'Kaiti SC', 'KaiTi', 'Songti SC', serif;
}

/* 六维视角切换：图鉴详情与工坊「香气画像」共用同一套 pill 控件。
   放全局而不是两页 scoped 各写一份 —— 两份定义迟早会漂移，
   而这个 pill 的任务恰恰是让两页气质统一。
   别用原生 switch：它是表单控件气质，且「按结构 / 按数值」是两个并列选项，
   不是开关的开与关，语义上就错了。 */
.radar-mode { display: flex; align-items: center; gap: 8rpx; }
.rm-pill {
  font-size: 21rpx; color: #9a958a; background: #fff;
  border: 2rpx solid rgba(46,92,69,0.14); border-radius: 20rpx;
  padding: 4rpx 16rpx; line-height: 1.4;
}
.rm-pill.on { color: #fff; background: #2e5c45; border-color: #2e5c45; }
</style>
