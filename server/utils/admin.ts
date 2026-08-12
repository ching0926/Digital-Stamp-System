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
