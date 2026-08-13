import { RewardModel } from '../../models/Reward'
import { CampaignModel } from '../../models/Campaign'
import { StampRecordModel } from '../../models/StampRecord'
import { RedemptionModel } from '../../models/Redemption'

// POST /api/reward/redeem  body: { rewardId, staffKey }
// 現場核銷：民眾把手機交給工作人員，工作人員輸入通行碼按下確認 → 一次完成領取與核銷。
// （舊版是「領券拿核銷碼 + QR → 商家在 /verify 輸入碼」兩段式，已取消）
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { rewardId, staffKey } = await readBody<{ rewardId?: string; staffKey?: string }>(event)

  // 先擋身分：這顆按鈕長在民眾自己的手機上，沒有通行碼就等於人人可自助核銷
  const { staffPasscode } = useRuntimeConfig()
  if (!staffPasscode || staffKey !== String(staffPasscode)) {
    throw createError({ statusCode: 401, message: '工作人員通行碼錯誤' })
  }

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

  // 每人兌換上限：不分狀態計算，核銷過就不能再核銷
  const claimedCount = await RedemptionModel.countDocuments({ userId: user._id, rewardId: reward._id })
  if (claimedCount >= reward.perUserLimit) {
    throw createError({ statusCode: 409, message: '此獎項已核銷過' })
  }

  // 原子扣庫存（stock = -1 表示不限量）
  if (reward.stock !== -1) {
    const dec = await RewardModel.findOneAndUpdate(
      { _id: reward._id, stock: { $gt: 0 } },
      { $inc: { stock: -1 } },
    )
    if (!dec) throw createError({ statusCode: 409, message: '此獎項已被兌換完畢' })
  }

  // 產生唯一紀錄編號（不再給民眾掃，但保留作為對帳／客訴查詢依據）
  let redemption = null
  for (let i = 0; i < 5 && !redemption; i++) {
    try {
      redemption = await RedemptionModel.create({
        userId: user._id,
        campaignId: reward.campaignId,
        rewardId: reward._id,
        code: generateRedemptionCode(),
        // 領取與核銷同時發生，直接寫成已核銷
        status: 'redeemed',
        claimedAt: now,
        redeemedAt: now,
        redeemedBy: '現場核銷',
      })
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) continue // code 重複，重試
      throw err
    }
  }
  if (!redemption) throw createError({ statusCode: 500, message: '核銷失敗，請再試一次' })

  return {
    id: redemption._id.toString(),
    rewardId: reward._id.toString(),
    rewardName: reward.rewardName,
    code: redemption.code,
    status: redemption.status,
    redeemedAt: redemption.redeemedAt,
  }
})
