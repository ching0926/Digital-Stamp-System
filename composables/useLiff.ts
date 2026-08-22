// LINE LIFF 身分：拿得到 LINE ID token 就回傳，拿不到一律回 null 由呼叫端退回匿名訪客。
// 刻意不做成 Nuxt plugin —— 開站流程要能 await 它（可能整頁導去 LINE 登入）才繼續載活動。

// 同一次載入只 init 一次；快取的是 promise，兩處同時呼叫也只會跑一輪
let pending: Promise<string | null> | null = null

export interface LiffStatus {
  configured: boolean // 有沒有設 LIFF ID
  usable: boolean // canUseLiff() 的結果（localhost 與網域不符時為 false）
  inClient: boolean | null // 是否在 LINE 內建瀏覽器
  loggedIn: boolean | null
  hasIdToken: boolean | null
  error: string // 出錯時的訊息，供 ?debug=1 面板顯示
}

// 診斷用的共用狀態。手機上沒有 devtools，出事時只能靠 ?debug=1 把這些印在畫面上
export function useLiffStatus() {
  return useState<LiffStatus>('liffStatus', () => ({
    configured: false,
    usable: false,
    inClient: null,
    loggedIn: null,
    hasIdToken: null,
    error: '',
  }))
}

export function useLiffIdToken(): Promise<string | null> {
  if (!import.meta.client) return Promise.resolve(null)
  if (!pending) pending = resolveIdToken()
  return pending
}

// LIFF 的 redirectUri 只能落在 LINE 後台註冊的 Endpoint URL 網域。
// localhost 與 cloudflared 通道打過去必定失敗，先擋掉才不會卡住本機開發與驗收
function canUseLiff(siteUrl: string): boolean {
  const { hostname, origin } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') return false
  if (!siteUrl) return true // 沒設站台網址就賭一把，失敗會被下面 catch 接住
  try {
    return new URL(siteUrl).origin === origin
  } catch {
    return false
  }
}

async function resolveIdToken(): Promise<string | null> {
  const { public: pub } = useRuntimeConfig()
  const status = useLiffStatus()
  const liffId = String(pub.liffId || '')

  status.value.configured = Boolean(liffId)
  status.value.usable = Boolean(liffId) && canUseLiff(String(pub.siteUrl || ''))
  if (!status.value.usable) return null

  // liff.init() 會用 history.replaceState 改寫網址，所以要在 init 之前先抓一份。
  // 等一下若需要導去 LINE 登入，用它組 redirectUri，讓 ?s= / ?c= 盡量活著回來
  const originalSearch = window.location.search

  try {
    // 動態載入：沒設 LIFF ID 的部署不必為此多背一份 SDK
    const liff = (await import('@line/liff')).default
    await liff.init({ liffId })

    status.value.inClient = liff.isInClient()
    status.value.loggedIn = liff.isLoggedIn()

    if (!liff.isLoggedIn()) {
      // 外部瀏覽器才會走到這裡（LINE 內開啟的 LIFF 一定已登入）。
      // init 之後網址可能已經被改寫掉參數，所以優先用 init 前那一份組回去
      liff.login({ redirectUri: loginRedirectUri(originalSearch) })
      // 導轉進行中，停在這裡別讓呼叫端繼續往下跑
      await new Promise<never>(() => {})
    }

    const idToken = liff.getIDToken()
    status.value.hasIdToken = Boolean(idToken)
    // LIFF app 沒勾 openid scope 時登入會成功但拿不到 ID token，
    // 症狀是「明明登入了卻還是訪客身分」，留一行訊息才查得出來
    if (!idToken) console.warn('[liff] 已登入但取不到 ID token，請確認 LIFF app 有勾選 openid scope')
    return idToken
  } catch (err) {
    // LIFF 掛掉不該讓整個活動打不開，退回匿名訪客即可
    status.value.error = err instanceof Error ? err.message : String(err)
    console.warn('[liff] 初始化失敗，改用匿名身分', err)
    return null
  }
}

// 登入導轉要帶回哪個網址：init 前後的 query 取「有內容的那一份」，
// 兩邊都空才退回當下網址（例如從 OA 圖文選單點進來、本來就沒有參數）
function loginRedirectUri(originalSearch: string): string {
  const { origin, pathname, search } = window.location
  const keep = search || originalSearch
  return `${origin}${pathname}${keep}`
}
