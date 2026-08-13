// 網域層防護：前後台分開網域部署時，確保 /admin、/api/admin/** 絕對不會被
// 一般使用者網域回應（即使繞過通行碼直接打網址，也回 404 而非 401）。
// 檔名加 "0." 前綴確保比未來其他 middleware 更早執行。
// NUXT_ADMIN_HOSTNAMES 留空（本機開發預設）時完全不啟用，
// 不影響現有「單一 host、/admin 直接可訪問」的本機開發流程。
export default defineEventHandler((event) => {
  const { adminHostnames } = useRuntimeConfig()
  const allowlist = String(adminHostnames ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)

  // 未設定白名單 = 尚未走網域分離部署，不啟用
  if (allowlist.length === 0) return

  const rawPath = event.path.split('?')[0]
  const isAdminRoute = rawPath === '/admin' || rawPath.startsWith('/admin/') || rawPath.startsWith('/api/admin/')
  if (!isAdminRoute) return

  // xForwardedHost 用於 proxy/LB 後方部署情境
  const url = getRequestURL(event, { xForwardedHost: true })
  const hostWithPort = url.host.toLowerCase() // 含 port，本機用「同 host 不同 port」模擬兩網域時需要
  const hostname = url.hostname.toLowerCase() // 不含 port，正式網域比對用
  const isAllowedHost = allowlist.includes(hostWithPort) || allowlist.includes(hostname)

  if (!isAllowedHost) {
    // 回 404 而非 401/403：不透露「這裡本來有後台」
    throw createError({ statusCode: 404, message: '找不到頁面' })
  }
})
