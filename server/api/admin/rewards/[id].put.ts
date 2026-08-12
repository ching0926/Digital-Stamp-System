import { RewardModel } from '../../../models/Reward'

const ICON_TYPES = ['postcard', 'coffee', 'bag']

// PUT /api/admin/rewards/:id
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await useMongoose()

  const id = getRouterParam(event, 'id')
  const body = await readBody<Record<string, any>>(event)

  const reward = await RewardModel.findById(id)
  if (!reward) throw createError({ statusCode: 404, message: '查無此獎項' })

  if (body.title !== undefined) {
    const title = String(body.title).trim()
    if (!title) throw createError({ statusCode: 400, message: '請填寫獎項名稱' })
    reward.title = title
  }
  if (body.rewardName !== undefined) {
    const rewardName = String(body.rewardName).trim()
    if (!rewardName) throw createError({ statusCode: 400, message: '請填寫兌換品項' })
    reward.rewardName = rewardName
  }
  if (body.requirementCount !== undefined) {
    const count = Number(body.requirementCount)
    if (!Number.isFinite(count) || count < 1) {
      throw createError({ statusCode: 400, message: '兌換門檻至少為 1 章' })
    }
    reward.requirementCount = count
  }
  if (body.iconType !== undefined && ICON_TYPES.includes(String(body.iconType))) {
    reward.iconType = body.iconType
  }
  if (body.stock !== undefined) reward.stock = Number(body.stock)
  if (body.perUserLimit !== undefined) reward.perUserLimit = Number(body.perUserLimit)

  await reward.save()
  return { reward: rewardDto(reward) }
})
