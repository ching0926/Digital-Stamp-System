// POST /api/admin/login  body: { passcode: string }
// 驗證後台通行碼並簽發 httpOnly cookie。
// 這支與 logout 是 server/api/admin/** 底下唯二不呼叫 requireAdmin 的端點——
// 它們正是用來取得憑證的。
export default defineEventHandler(async (event) => {
  const body = await readBody<{ passcode?: string }>(event).catch(() => null)
  loginAdmin(event, String(body?.passcode ?? '').trim())
  return { ok: true }
})
