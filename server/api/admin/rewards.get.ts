import { RewardModel } from '../../models/Reward'

// GET /api/admin/rewards?campaignId=xxx
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await useMongoose()

  const { campaignId } = getQuery(event)
  if (!campaignId) throw createError({ statusCode: 400, message: '缺少 campaignId' })

  const rewards = await RewardModel.find({ campaignId: String(campaignId) }).sort({
    requirementCount: 1,
  })
  return { rewards: rewards.map(rewardDto) }
})
