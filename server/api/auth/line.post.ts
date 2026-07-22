import { UserModel } from '../../models/User'

interface LineVerifyResponse {
  sub: string // LINE userId
  name?: string
  picture?: string
}

// POST /api/auth/line
// 正式：body { idToken } → 向 LINE 驗證 → upsert User → 發 session cookie
// 開發：body { dev: true } → 建立/取用開發用假使用者（僅 import.meta.dev）
export default defineEventHandler(async (event) => {
  await useMongoose()
  const body = await readBody<{ idToken?: string; dev?: boolean }>(event)
  const { lineChannelId } = useRuntimeConfig()

  let lineUserId: string
  let displayName = ''
  let pictureUrl = ''

  if (body?.dev && import.meta.dev) {
    lineUserId = 'DEV_USER'
    displayName = '開發測試者'
  } else {
    if (!body?.idToken) {
      throw createError({ statusCode: 400, message: '缺少 idToken' })
    }
    // 注意：純數字的 NUXT_LINE_CHANNEL_ID 會被 Nuxt(destr) 解析成 number，需先轉字串
    const clientId = String(lineChannelId ?? '').trim()
    let profile: LineVerifyResponse
    try {
      profile = await $fetch<LineVerifyResponse>('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ id_token: body.idToken, client_id: clientId }).toString(),
      })
    } catch (err: unknown) {
      // 診斷：解出 idToken 的 aud（= 正確 channel ID）與 exp，並帶出 LINE 的錯誤
      let hint = ''
      try {
        const p = JSON.parse(Buffer.from(body.idToken.split('.')[1], 'base64url').toString())
        hint = `aud=${p.aud} 我方client_id=${clientId} exp=${new Date(p.exp * 1000).toISOString()} now=${new Date().toISOString()}`
      } catch {
        hint = '(無法解析 idToken)'
      }
      const lineErr = (err as { data?: unknown }).data
      console.error('[auth/line] LINE 驗證失敗', hint, lineErr)
      throw createError({
        statusCode: 401,
        message: `LINE 驗證失敗｜${hint}｜LINE:${typeof lineErr === 'object' ? JSON.stringify(lineErr) : String(lineErr)}`,
      })
    }
    lineUserId = profile.sub
    displayName = profile.name ?? ''
    pictureUrl = profile.picture ?? ''
  }

  const user = await UserModel.findOneAndUpdate(
    { lineUserId },
    { lineUserId, displayName, pictureUrl },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  setSessionCookie(event, user._id.toString())

  return {
    id: user._id.toString(),
    lineUserId: user.lineUserId,
    displayName: user.displayName,
    pictureUrl: user.pictureUrl,
  }
})
