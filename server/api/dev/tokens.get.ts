import { CampaignModel } from '../../models/Campaign'
import { StationModel } from '../../models/Station'

// GET /api/dev/tokens — 僅開發環境：回傳各集章點的 QR token，供瀏覽器測試集章流程。
// 正式環境會 404（QR 由 P3 後台產生印製）。
export default defineEventHandler(async () => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }
  await useMongoose()

  const campaign = await CampaignModel.findOne({ status: 'active' }).sort({ createdAt: -1 })
  if (!campaign) return { tokens: [] }

  const stations = await StationModel.find({ campaignId: campaign._id, noStamp: { $ne: true } }).sort({
    order: 1,
  })

  return {
    tokens: stations.map((s) => ({
      stationId: s._id.toString(),
      name: s.name,
      token: makeQrToken(s._id.toString(), s.qrSecret),
      geo: s.geo, // 供開發面板送出「現場」座標以通過圍籬
    })),
  }
})
