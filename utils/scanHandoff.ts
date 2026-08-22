import type { ScanTarget } from './scanTarget'

// 掃碼目標的「跨導轉」暫存。
//
// 為什麼需要：LIFF 在外部瀏覽器（手機內建相機掃碼會落在 Safari，不是 LINE 內建瀏覽器）
// 偵測到未登入時會呼叫 liff.login() 把整頁導去 LINE，導回來時網址上的 `?s=` / `?c=`
// 可能已經不見了。所以進站的第一時間就要把解析結果存下來，導轉回來再撿，
// 否則整趟掃碼會靜默失敗——使用者只看到「什麼都沒發生」。
//
// 用 localStorage 而非 sessionStorage：LINE 登入可能開新分頁／webview，
// sessionStorage 帶不過去。
const KEY = 'jiuli-hai:scan-handoff'

// 只涵蓋導轉往返這段時間。留太久的話，上次沒用掉的殘留會在下次進站時誤集章
const TTL_MS = 5 * 60 * 1000

interface Stashed {
  target: ScanTarget
  at: number
}

export function stashScanTarget(target: ScanTarget) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ target, at: Date.now() } satisfies Stashed))
  } catch {
    /* 無痕模式或封鎖 storage 時不該讓前台整個掛掉 */
  }
}

// 判斷邏輯抽成純函式，才測得到（localStorage 在 Node 下不存在）
export function decodeStash(raw: string | null, now: number): ScanTarget | null {
  if (!raw) return null
  try {
    const { target, at } = JSON.parse(raw) as Stashed
    if (!target || typeof at !== 'number' || now - at > TTL_MS) return null
    if (target.kind !== 'stamp' && target.kind !== 'entry') return null
    return target
  } catch {
    return null // 內容壞掉就當作沒有，不值得為它中斷開站
  }
}

// 讀完即刪：同一個掃碼目標只該生效一次，否則重新整理會再集一次章
export function takeScanTarget(): ScanTarget | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(KEY)
    localStorage.removeItem(KEY)
    return decodeStash(raw, Date.now())
  } catch {
    return null
  }
}
