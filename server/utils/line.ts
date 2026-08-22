// LINE ID token 驗證。前端送上來的 token 一律要在這裡向 LINE 驗過才算數——
// 若直接相信前端給的 lineUserId，任何人都能冒充別人領走他的獎。

interface LineVerifyResponse {
  iss: string
  sub: string
  aud: string
  exp: number
  name?: string
  picture?: string
}

export interface LineProfile {
  lineUserId: string
  displayName: string
  pictureUrl: string
}

// LIFF ID 格式為 <channelId>-<hash>，前綴就是 LINE Login channel ID，
// 所以一般只要設 NUXT_PUBLIC_LIFF_ID；要覆寫才設 NUXT_LINE_CHANNEL_ID
function resolveChannelId(): string {
  const { lineChannelId, public: pub } = useRuntimeConfig()
  const explicit = String(lineChannelId || '').trim()
  if (explicit) return explicit
  return String(pub.liffId || '').split('-')[0] ?? ''
}

export async function verifyLineIdToken(idToken: string): Promise<LineProfile> {
  const clientId = resolveChannelId()
  if (!clientId) {
    throw createError({ statusCode: 500, message: '伺服器尚未設定 LINE LIFF' })
  }

  let data: LineVerifyResponse
  try {
    data = await $fetch<LineVerifyResponse>('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
    })
  } catch {
    throw createError({ statusCode: 401, message: 'LINE 身分驗證失敗，請重新登入' })
  }

  // LINE 已經驗過簽章與 aud，這裡再自己確認一次，避免哪天參數傳錯就整個放行
  if (data.iss !== 'https://access.line.me' || data.aud !== clientId || !data.sub) {
    throw createError({ statusCode: 401, message: 'LINE 身分驗證失敗，請重新登入' })
  }

  return {
    lineUserId: data.sub,
    displayName: data.name ?? '',
    pictureUrl: data.picture ?? '',
  }
}
