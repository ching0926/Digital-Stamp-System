// QR 內容自 2026-08 起改編成網址（`<站台網址>/?s=v1.<stationId>.<hmac>`），
// 手機內建相機掃到才有東西可開。掃描器可能拿到網址、也可能拿到舊版印製的純 token，
// 一律在這裡還原成後端要驗的 token。
export function extractQrToken(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  if (value.startsWith('v1.')) return value // 舊版已印製的 QR 仍要能掃
  try {
    return new URL(value).searchParams.get('s')
  } catch {
    return null
  }
}
