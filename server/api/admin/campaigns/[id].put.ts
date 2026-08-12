import { CampaignModel } from '../../../models/Campaign'

// PUT /api/admin/campaigns/:id
// 更新活動。只套用 body 內出現的欄位，讓「僅改狀態」這種局部更新也能用同一支。
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await useMongoose()

  const id = getRouterParam(event, 'id')
  const body = await readBody<Record<string, unknown>>(event)

  const campaign = await CampaignModel.findById(id)
  if (!campaign) throw createError({ statusCode: 404, message: '查無此活動' })

  if (body.title !== undefined) {
    const title = String(body.title).trim()
    if (!title) throw createError({ statusCode: 400, message: '請填寫活動名稱' })
    campaign.title = title
  }
  if (body.description !== undefined) campaign.description = String(body.description)
  if (body.startAt !== undefined) campaign.startAt = new Date(String(body.startAt))
  if (body.endAt !== undefined) campaign.endAt = new Date(String(body.endAt))
  if (body.theme !== undefined) campaign.theme = String(body.theme)
  if (body.type !== undefined) campaign.type = body.type === 'market' ? 'market' : 'district'
  if (body.targetStampCount !== undefined) campaign.targetStampCount = Number(body.targetStampCount)
  if (body.marketMapUrl !== undefined) campaign.marketMapUrl = String(body.marketMapUrl)
  if (body.status !== undefined) {
    if (!['active', 'draft', 'ended'].includes(String(body.status))) {
      throw createError({ statusCode: 400, message: '活動狀態不正確' })
    }
    campaign.status = body.status
  }

  await campaign.save()
  return { campaign: campaignDto(campaign) }
})
