import { RewardModel } from '../../../models/Reward'
import { RedemptionModel } from '../../../models/Redemption'

// DELETE /api/admin/rewards/:id
// 已被領取的獎項擋下不刪 —— 已發出的核銷碼會查不到對應獎項。
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await useMongoose()

  const id = getRouterParam(event, 'id')
  const reward = await RewardModel.findById(id)
  if (!reward) throw createError({ statusCode: 404, message: '查無此獎項' })

  const claimed = await RedemptionModel.countDocuments({ rewardId: reward._id })
  if (claimed > 0) {
    throw createError({
      statusCode: 409,
      message: `此獎項已被領取 ${claimed} 次，無法刪除`,
    })
  }

  await reward.deleteOne()
  return { ok: true }
})
