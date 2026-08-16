import { randomBytes } from 'node:crypto'
import { StationModel } from '../../models/Station'
import { CampaignModel } from '../../models/Campaign'

// POST /api/admin/stations
// 建立集章點。qrSecret 於此產生後就不再變動，QR 才能印製成貼紙長期使用。
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await useMongoose()

  const body = await readBody<Record<string, any>>(event)
  const campaignId = String(body.campaignId ?? '')
  const name = String(body.name ?? '').trim()
  if (!campaignId) throw createError({ statusCode: 400, message: '缺少 campaignId' })
  if (!name) throw createError({ statusCode: 400, message: '請填寫名稱' })

  const campaign = await CampaignModel.findById(campaignId)
  if (!campaign) throw createError({ statusCode: 404, message: '查無此活動' })

  // 排序值接在現有最後一個之後
  const last = await StationModel.findOne({ campaignId }).sort({ order: -1 }).select('order')
  const nextOrder = (last?.order ?? 0) + 1

  const created = await StationModel.create({
    campaignId,
    name,
    title: String(body.title ?? ''),
    description: String(body.description ?? ''),
    address: String(body.address ?? ''),
    geo: { lat: Number(body.geo?.lat ?? 0), lng: Number(body.geo?.lng ?? 0) },
    imgUrl: String(body.imgUrl ?? ''),
    type: String(body.type ?? ''),
    specialty: String(body.specialty ?? ''),
    phone: String(body.phone ?? ''),
    hours: String(body.hours ?? ''),
    qrSecret: randomBytes(16).toString('hex'),
    order: body.order !== undefined ? Number(body.order) : nextOrder,
    noStamp: Boolean(body.noStamp ?? false),
  })

  return { station: stationDto(created) }
})
