// ============================================================
// 云函数 getWxacode
// 作用：生成「真·小程序码」，微信扫一扫可直接打开本小程序并复原配方。
// 前端调用：wx.cloud.callFunction({ name: 'getWxacode', data: { path } })
// 文档：https://developers.weixin.qq.com/miniprogram/dev/server/API/qrcode-link/qr-code/api_getqrcode.html
//
// envVersion 降级链：release → trial → develop
//   未发布正式版时 449 错误会自动降级，开发/体验期也能出码。
// ============================================================
const cloud = require('wx-server-sdk')

// DYNAMIC_CURRENT_ENV：自动使用当前云函数所在环境，无需手填环境 ID
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 调一次 wxacode.get；成功返回图片结果，失败抛出带 errCode 的错误
async function fetchCode(path, width, envVersion) {
  return cloud.openapi.wxacode.get({
    path,
    width,
    autoColor: false,
    lineColor: { r: 46, g: 92, b: 69 }, // 森林绿，贴合品牌色
    isHyaline: false,
    envVersion
  })
}

exports.main = async (event = {}) => {
  // path 形如 'pages/lab/lab?p=60,0,0...&n=雨夜图书馆'（最长 1024 字符，可带 query）
  const { path, width = 430, envVersion = 'release' } = event

  if (!path || typeof path !== 'string') {
    return { ok: false, errCode: 400, errMsg: '缺少 path 参数' }
  }
  if (path.length > 1024) {
    return { ok: false, errCode: 414, errMsg: 'path 超过 1024 字符' }
  }

  const w = Math.min(1280, Math.max(280, Number(width) || 430))
  // 降级链：release 449（未发布）→ trial → develop，保证开发期也能出码
  const chain = envVersion === 'release'
    ? ['release', 'trial', 'develop']
    : [envVersion]

  let lastErr = null
  for (const ev of chain) {
    try {
      const res = await fetchCode(path, w, ev)
      if (res && res.buffer) {
        return {
          ok: true,
          // base64 返回给前端，前端写入本地文件后绘制/保存相册
          base64: res.buffer.toString('base64'),
          mime: res.contentType || 'image/jpeg',
          envVersion: ev
        }
      }
      // 非 buffer 返回（JSON 错误体）：记录后继续降级
      lastErr = {
        errCode: res && res.errCode !== undefined ? res.errCode : -1,
        errMsg: (res && res.errMsg) || '未知错误'
      }
      // 仅 449（未发布）值得降级，其他错误直接返回
      if (lastErr.errCode !== 449) break
    } catch (e) {
      lastErr = {
        errCode: e.errCode !== undefined ? e.errCode : (e.errcode || -1),
        errMsg: e.errMsg || e.errmsg || (e && e.message) || '云函数异常'
      }
      // 449 = 未发布无法生成 release 码 → 降级重试；
      // 85014 = 未开通云开发、40001 = token 无效等 → 直接返回
      if (lastErr.errCode !== 449 && lastErr.errCode !== 41001) break
    }
  }
  return { ok: false, errCode: lastErr ? lastErr.errCode : -1, errMsg: lastErr ? lastErr.errMsg : '生成失败' }
}
