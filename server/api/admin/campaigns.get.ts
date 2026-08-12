import { CampaignModel } from '../../models/Campaign'
import { StampRecordModel } from '../../models/StampRecord'

// GET /api/admin/campaigns
// 列出所有活動（含即時計算的參與人數）。
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await useMongoose()

  const campaigns = await CampaignModel.find().sort({ createdAt: -1 })

  // 參與人數 = 該活動有集章紀錄的不重複使用者數。一次聚合算完，避免逐檔查詢
  const counts = await StampRecordModel.aggregate<{ _id: unknown; participants: number }>([
    { $group: { _id: { campaignId: '$campaignId', userId: '$userId' } } },
    { $group: { _id: '$_id.campaignId', participants: { $sum: 1 } } },
  ])
  const countMap = new Map(counts.map((c) => [String(c._id), c.participants]))

  return {
    campaigns: campaigns.map((c) => ({
      ...campaignDto(c),
      participantsCount: countMap.get(c._id.toString()) ?? 0,
    })),
  }
})
