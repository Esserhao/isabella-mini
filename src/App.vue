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
</style>
