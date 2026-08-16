// POST /api/admin/resolve-map-link  body: { url: string } → { lat, lng }
// 後台「貼上 Google 地圖連結」用。手機在 Google 地圖按分享得到的是
// maps.app.goo.gl 短網址，前端展不開（CORS，且拿不到轉址後的網址），
// 只能由伺服器代為展開再抽座標。

// 允許連出去的網域。比對方式是「完全相等或為其子網域」——
// 不可改成 includes/endsWith(裸字串)，否則 google.com.evil.tw 會被當成合法網域，
// 這個端點就成了對內網發請求的跳板（SSRF）。
const ALLOWED_HOSTS = ['google.com', 'google.com.tw', 'goo.gl']

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
}

// 依精確度排序：place 的 !3d/!4d 是地點本身的座標，@ 只是當下視野中心會偏掉
const PATTERNS = [
  /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  /[?&](?:q|ll|sll|daddr|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
]

function extractCoords(url: string): { lat: number; lng: number } | null {
  for (const re of PATTERNS) {
    const m = url.match(re)
    if (!m) continue
    const lat = Number(m[1])
    const lng = Number(m[2])
    // 抽到的數字未必是座標（網址裡什麼都有），超出範圍就當作沒抽到
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng }
    }
  }
  return null
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const { url } = await readBody<{ url?: string }>(event)
  const raw = String(url ?? '').trim()
  if (!raw) throw createError({ statusCode: 400, message: '請貼上 Google 地圖連結' })

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw createError({ statusCode: 400, message: '這不是有效的網址' })
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw createError({ statusCode: 400, message: '只接受 http/https 連結' })
  }
  if (!isAllowedHost(parsed.hostname)) {
    throw createError({ statusCode: 400, message: '只接受 Google 地圖的連結' })
  }

  // 長網址通常直接就抽得到，先試一次，省掉一次對外請求
  const direct = extractCoords(raw)
  if (direct) return direct

  // 抽不到才展開短網址（maps.app.goo.gl 這類）
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  let expanded: string
  try {
    const res = await fetch(parsed.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // 不帶 UA 時 Google 有時會回精簡頁，轉址結果較不穩定
        'user-agent': 'Mozilla/5.0 (compatible; jiuli-hai-stamp/1.0)',
      },
    })
    expanded = res.url
  } catch {
    throw createError({ statusCode: 400, message: '無法開啟這個連結，請確認後再試' })
  } finally {
    clearTimeout(timer)
  }

  // 展開後仍要在白名單內，避免被轉址帶去別的地方
  try {
    if (!isAllowedHost(new URL(expanded).hostname)) {
      throw createError({ statusCode: 400, message: '連結轉址到非 Google 網域，已中止' })
    }
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode) throw err
    throw createError({ statusCode: 400, message: '無法解析轉址後的網址' })
  }

  const coords = extractCoords(expanded)
  if (!coords) {
    throw createError({
      statusCode: 400,
      message: '無法從這個連結取得座標，請改用地圖點選',
    })
  }
  return coords
})
