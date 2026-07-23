// POST /api/auth/logout — 清除 session cookie
export default defineEventHandler((event) => {
  deleteCookie(event, 'jh_session', { path: '/', sameSite: 'lax' })
  return { ok: true }
})
