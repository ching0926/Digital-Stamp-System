import type { H3Event } from 'h3'

// 營運後台通行碼驗證。前端把通行碼放在 x-admin-key header，
// server/api/admin/** 每支端點開頭一律先呼叫本函式。
export function requireAdmin(event: H3Event) {
  const { adminPasscode } = useRuntimeConfig()
  // 純數字通行碼會被 destr 解析成 number，比對前統一轉字串
  const expected = String(adminPasscode ?? '')
  const key = getHeader(event, 'x-admin-key') ?? ''
  if (!expected || key !== expected) {
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
