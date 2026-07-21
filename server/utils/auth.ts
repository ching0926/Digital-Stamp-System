import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { UserModel } from '../models/User'

const COOKIE_NAME = 'jh_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 天

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

// 產生 session cookie 值： base64url(json).signature
export function createSessionToken(userId: string, secret: string): string {
  const body = b64url(JSON.stringify({ uid: userId, exp: Date.now() + SESSION_TTL_MS }))
  return `${body}.${sign(body, secret)}`
}

function verifySessionToken(token: string, secret: string): string | null {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = sign(body, secret)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const { uid, exp } = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (!uid || typeof exp !== 'number' || exp < Date.now()) return null
    return uid as string
  } catch {
    return null
  }
}

export function setSessionCookie(event: H3Event, userId: string) {
  const { sessionSecret } = useRuntimeConfig()
  setCookie(event, COOKIE_NAME, createSessionToken(userId, sessionSecret), {
    httpOnly: true,
    sameSite: 'none', // LIFF 在 LINE 的 iframe/webview 內，需 None
    secure: true,
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

// 從 cookie 取出使用者 id（未登入回 null）
export function getSessionUserId(event: H3Event): string | null {
  const { sessionSecret } = useRuntimeConfig()
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null
  return verifySessionToken(token, sessionSecret)
}

// 需要登入的端點使用；未登入直接丟 401
export async function requireUser(event: H3Event) {
  await useMongoose()
  const uid = getSessionUserId(event)
  if (!uid) throw createError({ statusCode: 401, statusMessage: '尚未登入' })
  const user = await UserModel.findById(uid)
  if (!user) throw createError({ statusCode: 401, statusMessage: '使用者不存在' })
  return user
}
