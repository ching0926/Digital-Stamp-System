import { CampaignModel } from '../../models/Campaign'
import { TenantModel } from '../../models/Tenant'

// POST /api/admin/campaigns
// 建立活動。目前為單租戶，tenantId 取現有第一筆 Tenant。
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await useMongoose()

  const body = await readBody<Record<string, unknown>>(event)
  const title = String(body.title ?? '').trim()
  if (!title) throw createError({ statusCode: 400, message: '請填寫活動名稱' })

  const tenant = await TenantModel.findOne().sort({ createdAt: 1 })
  if (!tenant) {
    throw createError({ statusCode: 400, message: '尚無租戶資料，請先執行 npm run seed' })
  }

  const created = await CampaignModel.create({
    tenantId: tenant._id,
    title,
    description: String(body.description ?? ''),
    startAt: body.startAt ? new Date(String(body.startAt)) : new Date(),
    endAt: body.endAt ? new Date(String(body.endAt)) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    theme: String(body.theme ?? ''),
    type: body.type === 'market' ? 'market' : 'district',
    targetStampCount: Number(body.targetStampCount ?? 0),
    marketMapUrl: String(body.marketMapUrl ?? ''),
    staffPasscode: normalizeStaffPasscode(body.staffPasscode),
    status: ['active', 'draft', 'ended'].includes(String(body.status)) ? body.status : 'draft',
  })

  return { campaign: { ...campaignDto(created), participantsCount: 0 } }
})
