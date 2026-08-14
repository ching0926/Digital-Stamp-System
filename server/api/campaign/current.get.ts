import { CampaignModel } from '../../models/Campaign'
import { StationModel } from '../../models/Station'
import { RewardModel } from '../../models/Reward'
import { StampRecordModel } from '../../models/StampRecord'
import { RedemptionModel } from '../../models/Redemption'

// GET /api/campaign/current
// 回傳目前進行中的活動 + 集章點 + 獎項 +（若已登入）該使用者的集章/兌換狀態。
// 注意：qrSecret 等敏感欄位不外流。
export default defineEventHandler(async (event) => {
  await useMongoose()

  const campaign = await CampaignModel.findOne({ status: 'active' }).sort({ createdAt: -1 })
  if (!campaign) {
    throw createError({ statusCode: 404, message: '目前沒有進行中的活動' })
  }

  const [stations, rewards] = await Promise.all([
    StationModel.find({ campaignId: campaign._id }).sort({ order: 1 }),
    RewardModel.find({ campaignId: campaign._id }).sort({ requirementCount: 1 }),
  ])

  // 使用者狀態（未登入則為空）
  const uid = getSessionUserId(event)
  let collectedStationIds: string[] = []
  let claimedRewardIds: string[] = []
  let redemptions: { id: string; rewardId: string; code: string; status: string }[] = []
  if (uid) {
    const [stamps, reds] = await Promise.all([
      StampRecordModel.find({ userId: uid, campaignId: campaign._id }).select('stationId'),
      RedemptionModel.find({ userId: uid, campaignId: campaign._id }).select('rewardId code status'),
    ])
    collectedStationIds = stamps.map((s) => s.stationId.toString())
    claimedRewardIds = reds.map((r) => r.rewardId.toString())
    redemptions = reds.map((r) => ({
      id: r._id.toString(),
      rewardId: r.rewardId.toString(),
      code: r.code,
      status: r.status,
    }))
  }

  return {
    campaign: {
      id: campaign._id.toString(),
      title: campaign.title,
      description: campaign.description,
      startAt: campaign.startAt,
      endAt: campaign.endAt,
      theme: campaign.theme,
      // 前台據此決定要渲染 Google 地圖還是市集平面圖
      type: campaign.type,
      marketMapUrl: campaign.marketMapUrl,
    },
    stations: stations.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      title: s.title,
      description: s.description,
      address: s.address,
      geo: s.geo,
      mapCoord: s.mapCoord,
      imgUrl: s.imgUrl,
      type: s.type,
      specialty: s.specialty,
      phone: s.phone,
      hours: s.hours,
      order: s.order,
      noStamp: s.noStamp,
    })),
    rewards: rewards.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      requirementCount: r.requirementCount,
      rewardName: r.rewardName,
      iconType: r.iconType,
      stock: r.stock,
      perUserLimit: r.perUserLimit,
    })),
    collectedStationIds,
    claimedRewardIds,
    redemptions,
  }
})
