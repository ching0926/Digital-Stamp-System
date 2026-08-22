import { StationModel } from '../../models/Station'
import { CampaignModel } from '../../models/Campaign'
import { StampRecordModel } from '../../models/StampRecord'

// POST /api/stamp/collect
// body: { token: string, lat?: number, lng?: number }
// 掃描 QR 後呼叫。驗證 QR 簽章 + GPS 圍籬 → 確認活動進行中、可集章、未重複 → 寫入 StampRecord。
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ token?: string; lat?: number; lng?: number }>(event)

  if (!body?.token) {
    throw createError({ statusCode: 400, message: '缺少 QR token' })
  }

  const parsed = parseQrToken(body.token)
  if (!parsed) {
    throw createError({ statusCode: 400, message: 'QR 格式不正確' })
  }

  const station = await StationModel.findById(parsed.stationId).catch(() => null)
  if (!station) {
    throw createError({ statusCode: 404, message: '找不到此集章點' })
  }

  if (!verifyQrToken(body.token, station.qrSecret)) {
    throw createError({ statusCode: 400, message: 'QR 驗證失敗（偽造或已失效）' })
  }

  // 這一行之後的錯誤都已經知道 QR 屬於哪一檔活動了，一律把 campaignId 附在 data 上：
  // 前台要能「就算集章失敗也切到 QR 所屬的活動」，否則民眾會停在別檔活動上不知所措
  const campaignId = station.campaignId.toString()
  const fail = (message: string) =>
    createError({ statusCode: 400, message, data: { campaignId } })

  if (station.noStamp) {
    throw fail('此景點無須集章')
  }

  // 活動須進行中
  const campaign = await CampaignModel.findById(station.campaignId)
  const now = new Date()
  if (!campaign || campaign.status !== 'active' || now < campaign.startAt || now > campaign.endAt) {
    throw fail('活動未在進行中')
  }

  // GPS 地理圍籬（P2 防作弊）。圍籬錯誤由 server/utils/geo.ts 丟出，
  // 補上 campaignId 才能跟上面幾種一樣讓前台切過去
  try {
    assertWithinGeofence(station.geo, { lat: body.lat, lng: body.lng })
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string }
    throw fail(e.message ?? '不在集章範圍內')
  }

  const verifiedGeo =
    typeof body.lat === 'number' && typeof body.lng === 'number'
      ? { lat: body.lat, lng: body.lng }
      : undefined

  // 靠唯一索引 (userId, stationId) 防重複；重複時回友善訊息
  let alreadyCollected = false
  try {
    await StampRecordModel.create({
      userId: user._id,
      campaignId: station.campaignId,
      stationId: station._id,
      collectedAt: now,
      verifiedGeo,
    })
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      alreadyCollected = true
    } else {
      throw err
    }
  }

  const collected = await StampRecordModel.find({
    userId: user._id,
    campaignId: station.campaignId,
  }).select('stationId')

  return {
    ok: true,
    alreadyCollected,
    // 前台可能正停在另一檔活動（兩檔同時進行時），要靠這個切過去
    campaignId: station.campaignId.toString(),
    stationId: station._id.toString(),
    stationName: station.name,
    collectedStationIds: collected.map((s) => s.stationId.toString()),
  }
})
