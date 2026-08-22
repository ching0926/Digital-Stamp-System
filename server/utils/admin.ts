import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const ADMIN_COOKIE = 'jh_admin'

// 刻意比使用者 session（30 天）短很多——這是管理員憑證，活動一個工作天就夠
const ADMIN_TTL_MS = 1000 * 60 * 60 * 12

// 後台登入節流：/admin 與民眾前台同網域，端點是公開打得到的，
// 沒有節流等於任人慢慢猜通行碼
const loginLimiter = createAttemptLimiter({ maxFails: 5, lockMs: 5 * 60 * 1000 })

// 通行碼可能是純數字，會被 destr 解析成 number，比對前統一轉字串
function expectedPasscode(): string {
  const { adminPasscode } = useRuntimeConfig()
  return String(adminPasscode ?? '')
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

// 長度不同時 timingSafeEqual 會丟例外，先擋掉；長度本身洩漏的資訊無關緊要
function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

// 比照 server/utils/auth.ts 的 session token 格式：base64url(json).signature
function createAdminToken(secret: string): string {
  const body = Buffer.from(JSON.stringify({ adm: 1, exp: Date.now() + ADMIN_TTL_MS })).toString('base64url')
  return `${body}.${sign(body, secret)}`
}

function verifyAdminToken(token: string, secret: string): boolean {
  const [body, sig] = token.split('.')
  if (!body || !sig || !safeEqual(sig, sign(body, secret))) return false
  try {
    const { adm, exp } = JSON.parse(Buffer.from(body, 'base64url').toString())
    return adm === 1 && typeof exp === 'number' && exp >= Date.now()
  } catch {
    return false
  }
}

// 驗證通行碼並簽發 cookie。連錯會被節流擋下（429）
export function loginAdmin(event: H3Event, passcode: string) {
  const key = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  loginLimiter.assertNotLocked(key)

  const expected = expectedPasscode()
  if (!expected || !safeEqual(String(passcode ?? ''), expected)) {
    loginLimiter.recordFailure(key)
    throw createError({ statusCode: 401, message: '管理員通行碼錯誤' })
  }
  loginLimiter.clear(key)

  const { sessionSecret } = useRuntimeConfig()
  // secure 依協定：http/區網不加 Secure 才存得住（同 setSessionCookie）
  setCookie(event, ADMIN_COOKIE, createAdminToken(sessionSecret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: getRequestProtocol(event) === 'https',
    path: '/',
    maxAge: ADMIN_TTL_MS / 1000,
  })
}

export function logoutAdmin(event: H3Event) {
  deleteCookie(event, ADMIN_COOKIE, { path: '/' })
}

// 營運後台驗證。server/api/admin/** 每支端點開頭一律先呼叫本函式
// （login / logout 兩支例外，它們正是用來取得憑證的）。
//
// 以 httpOnly cookie 為主：通行碼只在登入那一次送出，不再留在瀏覽器裡供 XSS 讀取。
// x-admin-key header 保留為後備，讓 curl／維運腳本仍打得動後台 API。
export function requireAdmin(event: H3Event) {
  const { sessionSecret } = useRuntimeConfig()
  const token = getCookie(event, ADMIN_COOKIE)
  if (token && verifyAdminToken(token, sessionSecret)) return

  const expected = expectedPasscode()
  const key = getHeader(event, 'x-admin-key') ?? ''
  if (!expected || !safeEqual(key, expected)) {
    throw createError({ statusCode: 401, message: '管理員通行碼錯誤' })
  }
}

// 活動層級的現場核銷碼：限 4 碼數字，空字串代表沿用 env 的 NUXT_STAFF_PASSCODE。
// 純數字會被 destr 解析成 number（且吃掉前導 0），故一律轉字串後再驗
export function normalizeStaffPasscode(value: unknown): string {
  const code = String(value ?? '').trim()
  if (!code) return ''
  if (!/^\d{4}$/.test(code)) {
    throw createError({ statusCode: 400, message: '核銷碼請設定 4 位數字' })
  }
  return code
}
