// 進站網址記錄。手機上沒有 devtools，掃碼進來時網址到底長什麼樣、參數是在
// 哪一跳掉的（LINE 的 liff.line.me？還是 liff.login() 的 OAuth 往返？），
// 只能靠回頭查這份記錄——搭配 `?debug=1` 的診斷面板看。
const KEY = 'jiuli-hai:boot-log'

// 只留最近幾筆：一次掃碼可能經過兩三次導轉，5 筆足以還原整條路徑
const MAX = 5

export interface BootEntry {
  url: string
  at: string
}

export function recordBoot(url: string) {
  if (!import.meta.client) return
  try {
    const log = readBootLog()
    log.unshift({ url, at: new Date().toISOString() })
    localStorage.setItem(KEY, JSON.stringify(log.slice(0, MAX)))
  } catch {
    /* 存不進去就算了，診斷用的東西不該影響正常流程 */
  }
}

export function readBootLog(): BootEntry[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as BootEntry[]) : []
  } catch {
    return []
  }
}
