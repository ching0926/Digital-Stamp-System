import { RedemptionModel } from '../../models/Redemption'
import { RewardModel } from '../../models/Reward'
import { UserModel } from '../../models/User'

// POST /api/reward/redeem  body: { code, staffKey, staffLabel? }
// 商家核銷：驗證工作人員通行碼 → 依核銷碼找 Redemption → 標記 redeemed（防重複）。
export default defineEventHandler(async (event) => {
  await useMongoose()
  const { code, staffKey, staffLabel } = await readBody<{
    code?: string
    staffKey?: string
    staffLabel?: string
  }>(event)

  const { staffPasscode } = useRuntimeConfig()
  if (!staffPasscode || staffKey !== staffPasscode) {
    throw createError({ statusCode: 401, message: '工作人員通行碼錯誤' })
  }
  if (!code) throw createError({ statusCode: 400, message: '缺少核銷碼' })

  const normalized = code.trim().toUpperCase()
  const redemption = await RedemptionModel.findOne({ code: normalized })
  if (!redemption) throw createError({ statusCode: 404, message: '查無此核銷碼' })

  const [reward, user] = await Promise.all([
    RewardModel.findById(redemption.rewardId),
    UserModel.findById(redemption.userId),
  ])

  if (redemption.status === 'redeemed') {
    throw createError({
      statusCode: 409,
      message: `此券已於 ${redemption.redeemedAt?.toLocaleString('zh-TW') ?? '先前'} 核銷`,
      data: { rewardName: reward?.rewardName, redeemedAt: redemption.redeemedAt },
    })
  }

  redemption.status = 'redeemed'
  redemption.redeemedAt = new Date()
  redemption.redeemedBy = staffLabel?.trim() || '商家'
  await redemption.save()

  return {
    ok: true,
    code: redemption.code,
    rewardName: reward?.rewardName ?? '',
    rewardTitle: reward?.title ?? '',
    memberName: user?.displayName ?? '',
    redeemedAt: redemption.redeemedAt,
  }
})
