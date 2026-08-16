import { CampaignModel } from '../../models/Campaign'
import { StationModel } from '../../models/Station'
import { RewardModel } from '../../models/Reward'
import { StampRecordModel } from '../../models/StampRecord'
import { RedemptionModel } from '../../models/Redemption'

// GET /api/campaign/current?campaignId=<選填>&preview=<選填 1>
// 回傳指定（或最新一檔）進行中的活動 + 集章點 + 獎項 +（若已登入）該使用者的集章/兌換狀態。
// 帶 campaignId 是為了「兩檔活動同時進行時，掃了哪一檔的 QR 就切到哪一檔」。
//
// preview=1 = 前台網址明確帶了 `?c=`（後台產的活動入口連結），此時**不限狀態**都給，
// 草稿活動才預覽得到、已結束的舊連結也才會顯示「已結束」而不是默默換一檔。
// 不帶 preview = 前台沿用 localStorage 記著的活動，這時只接受進行中的，
// 否則會停在一檔早就結束的活動上。
// 注意：qrSecret 等敏感欄位不外流。
export default defineEventHandler(async (event) => {
  await useMongoose()

  const { campaignId, preview } = getQuery(event)
  const allowInactive = String(preview ?? '') === '1'
  const requested = campaignId
    ? await CampaignModel.findOne(
        allowInactive
          ? { _id: String(campaignId) }
          : { _id: String(campaignId), status: 'active' },
      ).catch(() => null)
    : null
  // 指定的 id 查無（亂碼、已刪）一律退回最新一檔，前台才不會整個載不出來
  const campaign =
    requested ?? (await CampaignModel.findOne({ status: 'active' }).sort({ createdAt: -1 }))
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
      // 前台用來顯示「預覽中・尚未開始」／「已結束」橫幅
      status: campaign.status,
    },
    stations: stations.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      title: s.title,
      description: s.description,
      address: s.address,
      geo: s.geo,
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
