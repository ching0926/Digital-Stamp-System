// 產生「集章點 QR 測試表」HTML，供上機測試時用手機 LINE 掃描。
// 執行： npm run qrsheet  → 產出 qr-test-sheet.html（在專案根目錄，開啟後可掃）
// 注意：QR 內含各點簽章 token；測試期 geofence 關閉時任何人掃到即可集章，勿外流。

import { writeFileSync } from 'node:fs'
import mongoose from 'mongoose'
import QRCode from 'qrcode'

import { CampaignModel } from '../server/models/Campaign'
import { StationModel } from '../server/models/Station'
import { makeQrToken } from '../server/utils/qr'

try {
  ;(process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env')
} catch {
  /* ignore */
}

const uri = process.env.NUXT_MONGODB_URI
if (!uri) {
  console.error('✗ 缺少 NUXT_MONGODB_URI')
  process.exit(1)
}

async function main() {
  await mongoose.connect(uri!)
  const campaign = await CampaignModel.findOne({ status: 'active' }).sort({ createdAt: -1 })
  if (!campaign) throw new Error('查無進行中的活動')

  const stations = await StationModel.find({ campaignId: campaign._id, noStamp: { $ne: true } }).sort({
    order: 1,
  })

  // QR 編的是掃碼網址（與後台 AdminQrCodes.vue 一致）：有設 LIFF ID 就編 LIFF 網址，
  // 掃到會先過 LINE 登入；沒設則退回站台網址
  const liffId = process.env.NUXT_PUBLIC_LIFF_ID || ''
  const siteBase = (process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const base = liffId ? `https://liff.line.me/${liffId}` : `${siteBase}/`

  const cards: string[] = []
  for (const s of stations) {
    const token = makeQrToken(s._id.toString(), s.qrSecret)
    const dataUrl = await QRCode.toDataURL(`${base}?s=${token}`, { margin: 1, width: 260 })
    cards.push(
      `<div class="card"><img src="${dataUrl}" alt="${s.name}"><div class="name">${s.name}</div></div>`,
    )
  }

  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>加蚋仔集章 QR 測試表</title>
<style>
  body{font-family:system-ui,"Microsoft JhengHei",sans-serif;background:#f0f2f5;margin:0;padding:24px;color:#1f2937}
  h1{font-size:20px;text-align:center}
  p.note{text-align:center;color:#6b7280;font-size:13px;max-width:560px;margin:8px auto 24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px;max-width:960px;margin:0 auto}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:16px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.04)}
  .card img{width:100%;max-width:220px;height:auto}
  .name{font-weight:800;margin-top:10px;font-size:14px}
</style></head><body>
<h1>加蚋仔集章 — QR 測試表</h1>
<p class="note">上機測試用：在電腦螢幕開啟本頁，用手機內建相機或站內掃描器掃描下方任一 QR 即可完成該點集章。（QR 指向 ${base}；測試期地理圍籬已關閉，正式上線前請改回開啟並校正座標。）</p>
<div class="grid">${cards.join('\n')}</div>
</body></html>`

  writeFileSync('qr-test-sheet.html', html, 'utf8')
  console.log(`✓ 已產生 qr-test-sheet.html（${stations.length} 個集章點）`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('✗ 失敗：', err)
  process.exit(1)
})
