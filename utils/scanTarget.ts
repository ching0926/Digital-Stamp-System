// 掃到的 QR（或掃碼落地時網址上的參數）→ 它指向哪一件事。
// QR 內容自 2026-08 起編成網址，設了 LIFF ID 後外面又多包一層 liff.line.me，
// 再加上更早印製的純 token，形態有好幾種，一律在這裡收斂成同一個型別，
// 掃描器與落地流程才不會各自解析、各漏各的。
export type ScanTarget =
  | { kind: 'stamp'; token: string } // 集章點 QR（?s=）
  | { kind: 'entry'; campaignId: string } // 活動入口連結（?c=）

// 純 token QR 的前綴，格式 v1.<stationId>.<hmac>
const TOKEN_PREFIX = 'v1.'

// liff.state 理論上只會包一層，設上限純粹是不讓惡意內容把這裡拖進深遞迴
const MAX_LIFF_STATE_DEPTH = 3

// LIFF 會把原本的 query 包成 `?liff.state=%3Fs%3D<token>` 才導回 Endpoint URL，
// 正常情況由 SDK 在 init 之後還原。但 SDK 沒載到／init 失敗時就沒有人還原它，
// `?s=` 會靜默消失、掃了完全沒反應也沒錯誤訊息，所以這裡自己再拆一次。
function fromParams(params: URLSearchParams, depth = 0): ScanTarget | null {
  const token = params.get('s')
  if (token) return { kind: 'stamp', token }

  const campaignId = params.get('c')
  if (campaignId) return { kind: 'entry', campaignId }

  const state = params.get('liff.state')
  if (!state || depth >= MAX_LIFF_STATE_DEPTH) return null
  return fromParams(new URLSearchParams(state.replace(/^\?/, '')), depth + 1)
}

// 掃描器解到的原始字串：純 token、站台網址或 LIFF 網址都吃得下
export function parseScanTarget(raw: string): ScanTarget | null {
  const value = raw.trim()
  if (!value) return null
  if (value.startsWith(TOKEN_PREFIX)) return { kind: 'stamp', token: value }

  try {
    return fromParams(new URL(value).searchParams)
  } catch {
    return null // 不是網址也不是 token，鏡頭裡混到別的 QR
  }
}

// 掃碼落地用：直接餵 window.location.search
export function parseScanQuery(search: string): ScanTarget | null {
  return fromParams(new URLSearchParams(search))
}
