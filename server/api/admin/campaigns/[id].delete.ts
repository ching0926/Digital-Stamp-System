import { CampaignModel } from '../../../models/Campaign'
import { StationModel } from '../../../models/Station'
import { RewardModel } from '../../../models/Reward'
import { StampRecordModel } from '../../../models/StampRecord'

// DELETE /api/admin/campaigns/:id
// 刪除活動並連帶清掉其集章點與獎項。
// 已有集章紀錄的活動一律擋下 —— 刪掉會留下指不到集章點的孤兒紀錄，且是不可逆的營運資料。
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await useMongoose()

  const id = getRouterParam(event, 'id')
  const campaign = await CampaignModel.findById(id)
  if (!campaign) throw createError({ statusCode: 404, message: '查無此活動' })

  const stampCount = await StampRecordModel.countDocuments({ campaignId: campaign._id })
  if (stampCount > 0) {
    throw createError({
      statusCode: 409,
      message: `此活動已有 ${stampCount} 筆集章紀錄，無法刪除。請改為將狀態設為「已封存」`,
    })
  }

  await Promise.all([
    StationModel.deleteMany({ campaignId: campaign._id }),
    RewardModel.deleteMany({ campaignId: campaign._id }),
  ])
  await campaign.deleteOne()

  return { ok: true }
})
