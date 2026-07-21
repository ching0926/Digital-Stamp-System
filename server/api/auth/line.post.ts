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
      throw createError({ statusCode: 400, statusMessage: '缺少 idToken' })
    }
    let profile: LineVerifyResponse
    try {
      profile = await $fetch<LineVerifyResponse>('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ id_token: body.idToken, client_id: lineChannelId }).toString(),
      })
    } catch {
      throw createError({ statusCode: 401, statusMessage: 'LINE idToken 驗證失敗' })
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
