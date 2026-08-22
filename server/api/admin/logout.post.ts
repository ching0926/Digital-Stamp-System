// POST /api/admin/logout
// 清掉後台 session cookie。不需要先驗身分——沒登入的人呼叫它也只是清一個不存在的 cookie。
export default defineEventHandler((event) => {
  logoutAdmin(event)
  return { ok: true }
})
