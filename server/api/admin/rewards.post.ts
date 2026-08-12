import { RewardModel } from '../../models/Reward'
import { CampaignModel } from '../../models/Campaign'

const ICON_TYPES = ['postcard', 'coffee', 'bag']

// POST /api/admin/rewards
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await useMongoose()

  const body = await readBody<Record<string, any>>(event)
  const campaignId = String(body.campaignId ?? '')
  const title = String(body.title ?? '').trim()
  const rewardName = String(body.rewardName ?? '').trim()
  const requirementCount = Number(body.requirementCount ?? 0)

  if (!campaignId) throw createError({ statusCode: 400, message: '缺少 campaignId' })
  if (!title) throw createError({ statusCode: 400, message: '請填寫獎項名稱' })
  if (!rewardName) throw createError({ statusCode: 400, message: '請填寫兌換品項' })
  if (!Number.isFinite(requirementCount) || requirementCount < 1) {
    throw createError({ statusCode: 400, message: '兌換門檻至少為 1 章' })
  }

  const campaign = await CampaignModel.findById(campaignId)
  if (!campaign) throw createError({ statusCode: 404, message: '查無此活動' })

  const created = await RewardModel.create({
    campaignId,
    title,
    requirementCount,
    rewardName,
    iconType: ICON_TYPES.includes(String(body.iconType)) ? body.iconType : 'postcard',
    stock: body.stock !== undefined ? Number(body.stock) : -1,
    perUserLimit: body.perUserLimit !== undefined ? Number(body.perUserLimit) : 1,
  })

  return { reward: rewardDto(created) }
})
