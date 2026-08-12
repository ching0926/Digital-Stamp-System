import { StationModel } from '../../models/Station'

// GET /api/admin/stations?campaignId=xxx
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await useMongoose()

  const { campaignId } = getQuery(event)
  if (!campaignId) throw createError({ statusCode: 400, message: '缺少 campaignId' })

  const stations = await StationModel.find({ campaignId: String(campaignId) }).sort({ order: 1 })
  return { stations: stations.map(stationDto) }
})
