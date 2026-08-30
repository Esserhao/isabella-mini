// ============================================================
// 云函数 submitFeedback
// 作用：
//   1. action='check'  —— 仅做内容安全审查（msgSecCheck），不落库
//   2. action='submit' —— 审查通过后把「留言建议」写入云数据库
//
// 留言只有店主能在云开发控制台看到，前端不开放读取接口。
// 数据库集合：feedbacks（首次使用需在云开发控制台手动创建，
// 权限建议设为「仅创建者可读写」或「所有用户可读，仅管理员可写」——
// 用 callFunction 写入不受前端权限限制，控制台查看不受影响）
// ============================================================
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 内容安全审查：微信官方 msgSecCheck
// 返回 { pass: true } 或 { pass: false, errMsg }
async function secCheck(content, openid) {
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      version: 2,
      scene: 4, // 4 = 评论/留言场景
      openid: openid || '',
      content
    })
    // result.suggest: 'pass' 通过 / 'risky' 违规 / 'review' 需人工复审
    const suggest = res && res.result && res.result.suggest
    if (suggest === 'pass') return { pass: true }
    if (suggest === 'risky') return { pass: false, errMsg: '内容审核未通过' }
    // review：先收下但打标，店主在控制台人工看一眼
    return { pass: true, needReview: true }
  } catch (e) {
    // 87014 = 内容含违规信息（部分版本直接抛错而非返回 risky）
    if (e && (e.errCode === 87014 || e.errcode === 87014)) {
      return { pass: false, errMsg: '内容审核未通过' }
    }
    // 其他异常（接口限频等）：不阻塞用户，打标放行
    return { pass: true, needReview: true, checkError: (e && (e.errMsg || e.message)) || 'unknown' }
  }
}

// 简单频控：同一 openid 10 秒内只放行一条 submit，防止脚本灌库。
// 用最近一条留言的 createdAt 判断，不需要额外集合；查询失败不阻塞正常提交。
async function tooFrequent(openid) {
  if (!openid) return false
  try {
    const recent = await db.collection('feedbacks')
      .where({ openid })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()
    const last = recent && recent.data && recent.data[0]
    if (!last || !last.createdAt) return false
    return Date.now() - new Date(last.createdAt).getTime() < 10 * 1000
  } catch (e) {
    return false
  }
}

exports.main = async (event = {}) => {
  const { action = 'submit', content = '' } = event
  const openid = cloud.getWXContext().OPENID || ''

  const text = String(content || '').trim()
  if (!text) return { ok: false, errCode: 400, errMsg: '内容为空' }
  if (text.length > 500) return { ok: false, errCode: 414, errMsg: '内容过长（最多 500 字）' }

  // 写入前频控（check 不落库，不限）
  if (action === 'submit' && await tooFrequent(openid)) {
    return { ok: false, errCode: 429, errMsg: '发送太频繁，歇口气再寄' }
  }

  // 无论 check 还是 submit，都先过官方审查
  const check = await secCheck(text, openid)
  if (!check.pass) {
    return { ok: false, errCode: 87014, errMsg: check.errMsg || '内容审核未通过' }
  }

  // 仅审查模式：前端提交感言前可单独调用
  if (action === 'check') {
    return { ok: true, needReview: !!check.needReview }
  }

  // 写入留言（submit）
  try {
    await db.collection('feedbacks').add({
      data: {
        content: text,
        openid,
        needReview: !!check.needReview,
        checkError: check.checkError || '',
        createdAt: db.serverDate()
      }
    })
    return { ok: true }
  } catch (e) {
    // 常见：集合不存在（-502005）。提示店主去控制台建 feedbacks 集合
    return {
      ok: false,
      errCode: e.errCode !== undefined ? e.errCode : -1,
      errMsg: (e && e.errMsg) || '留言写入失败'
    }
  }
}
