import { RewardModel } from '../../models/Reward'
import { CampaignModel } from '../../models/Campaign'
import { StampRecordModel } from '../../models/StampRecord'
import { RedemptionModel } from '../../models/Redemption'

// POST /api/reward/claim  body: { rewardId }
// 使用者達門檻後領取獎項 → 建立 Redemption（含核銷碼，狀態 pending）。
// 檢查：門檻、每人上限、庫存（原子扣庫存）。
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { rewardId } = await readBody<{ rewardId?: string }>(event)
  if (!rewardId) throw createError({ statusCode: 400, message: '缺少 rewardId' })

  const reward = await RewardModel.findById(rewardId).catch(() => null)
  if (!reward) throw createError({ statusCode: 404, message: '找不到此獎項' })

  const campaign = await CampaignModel.findById(reward.campaignId)
  const now = new Date()
  if (!campaign || campaign.status !== 'active' || now < campaign.startAt || now > campaign.endAt) {
    throw createError({ statusCode: 400, message: '活動未在進行中' })
  }

  // 門檻檢查
  const collectedCount = await StampRecordModel.countDocuments({
    userId: user._id,
    campaignId: reward.campaignId,
  })
  if (collectedCount < reward.requirementCount) {
    throw createError({
      statusCode: 400,
      message: `尚未達標，需集滿 ${reward.requirementCount} 章（目前 ${collectedCount}）`,
    })
  }

  // 每人兌換上限
  const claimedCount = await RedemptionModel.countDocuments({ userId: user._id, rewardId: reward._id })
  if (claimedCount >= reward.perUserLimit) {
    throw createError({ statusCode: 409, message: '您已領取過此獎項' })
  }

  // 原子扣庫存（stock = -1 表示不限量）
  if (reward.stock !== -1) {
    const dec = await RewardModel.findOneAndUpdate(
      { _id: reward._id, stock: { $gt: 0 } },
      { $inc: { stock: -1 } },
    )
    if (!dec) throw createError({ statusCode: 409, message: '此獎項已被兌換完畢' })
  }

  // 產生唯一核銷碼（碰撞極少，重試數次）
  let redemption = null
  for (let i = 0; i < 5 && !redemption; i++) {
    try {
      redemption = await RedemptionModel.create({
        userId: user._id,
        campaignId: reward.campaignId,
        rewardId: reward._id,
        code: generateRedemptionCode(),
        status: 'pending',
        claimedAt: now,
      })
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) continue // code 重複，重試
      throw err
    }
  }
  if (!redemption) throw createError({ statusCode: 500, message: '核銷碼產生失敗，請再試一次' })

  return {
    id: redemption._id.toString(),
    rewardId: reward._id.toString(),
    rewardName: reward.rewardName,
    code: redemption.code,
    status: redemption.status,
  }
})
