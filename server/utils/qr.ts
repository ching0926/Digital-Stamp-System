import { createHmac, timingSafeEqual } from 'node:crypto'

// 半靜態簽章 QR（v1）：QR 內容為穩定字串 `v1.<stationId>.<hmac>`，
// hmac = HMAC-SHA256(qrSecret, stationId)。不含時效，可印製成貼紙/立牌。
// 防遠端代掃由 GPS 地理圍籬負責（P2）。

const PREFIX = 'v1'

export function makeQrToken(stationId: string, qrSecret: string): string {
  const sig = createHmac('sha256', qrSecret).update(stationId).digest('base64url')
  return `${PREFIX}.${stationId}.${sig}`
}

// 解析 QR，回傳 stationId（格式錯誤回 null）。實際簽章驗證需搭配該 station 的 qrSecret。
export function parseQrToken(token: string): { stationId: string; sig: string } | null {
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== PREFIX) return null
  return { stationId: parts[1], sig: parts[2] }
}

export function verifyQrToken(token: string, qrSecret: string): boolean {
  const parsed = parseQrToken(token)
  if (!parsed) return false
  const expected = createHmac('sha256', qrSecret).update(parsed.stationId).digest('base64url')
  const a = Buffer.from(parsed.sig)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
