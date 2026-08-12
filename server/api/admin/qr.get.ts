import { StationModel } from '../../models/Station'

// GET /api/admin/qr?campaignId=xxx
// 回傳各集章點的 QR token。內容必須是 `v1.<stationId>.<hmac>` 格式，
// 與 /api/stamp/collect 及前台 Scanner 的解析一致（不是網址），否則掃了不會過。
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await useMongoose()

  const { campaignId } = getQuery(event)
  if (!campaignId) throw createError({ statusCode: 400, message: '缺少 campaignId' })

  const stations = await StationModel.find({ campaignId: String(campaignId) }).sort({ order: 1 })

  return {
    stations: stations.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      type: s.type,
      noStamp: s.noStamp,
      token: makeQrToken(s._id.toString(), s.qrSecret),
    })),
  }
})
