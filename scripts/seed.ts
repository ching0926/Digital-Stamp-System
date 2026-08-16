// 種子腳本：建立加蚋仔商圈 Tenant + 一檔 Campaign + 10 個集章點 + 3 個獎項。
// 執行： npm run seed
// 需要環境變數 NUXT_MONGODB_URI（會嘗試從專案根目錄 .env 載入）。

import { randomBytes } from 'node:crypto'
import mongoose from 'mongoose'

import { TenantModel } from '../server/models/Tenant'
import { CampaignModel } from '../server/models/Campaign'
import { StationModel } from '../server/models/Station'
import { RewardModel } from '../server/models/Reward'
import { KALADZIAH_STATIONS, KALADZIAH_REWARDS } from '../server/data/kaladziah'

// 載入 .env（Node 20.12+ 內建），失敗則沿用既有 process.env
try {
  ;(process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env')
} catch {
  // 忽略：可能沒有 .env 檔或執行環境不支援
}

const uri = process.env.NUXT_MONGODB_URI
if (!uri) {
  console.error('✗ 缺少 NUXT_MONGODB_URI，請先設定 .env')
  process.exit(1)
}

async function seed() {
  await mongoose.connect(uri!)
  console.log('✓ 已連線 MongoDB')

  // 1) Tenant
  const tenant = await TenantModel.findOneAndUpdate(
    { name: '加蚋仔商圈' },
    { name: '加蚋仔商圈', contact: '', status: 'active' },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  console.log(`✓ Tenant: ${tenant.name} (${tenant._id})`)

  // 2) Campaign
  const campaign = await CampaignModel.findOneAndUpdate(
    { tenantId: tenant._id, title: '加蚋仔集章地圖' },
    {
      tenantId: tenant._id,
      title: '加蚋仔集章地圖',
      description: '探索加蚋仔商圈 5 大歷史景點，實地掃碼集章、兌換在地好禮。',
      startAt: new Date(),
      endAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90), // 90 天
      theme: 'kaladziah',
      status: 'active',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  console.log(`✓ Campaign: ${campaign.title} (${campaign._id})`)

  // 3) Stations（依 name 去重 upsert，qrSecret 首次建立時產生）
  for (const s of KALADZIAH_STATIONS) {
    await StationModel.findOneAndUpdate(
      { campaignId: campaign._id, name: s.name },
      {
        $set: {
          campaignId: campaign._id,
          name: s.name,
          title: s.title,
          description: s.description,
          address: s.address,
          geo: s.geo,
          imgUrl: s.imgUrl,
          type: s.type,
          specialty: s.specialty,
          phone: s.phone ?? '',
          hours: s.hours ?? '',
          order: s.order,
          noStamp: s.noStamp ?? false,
        },
        $setOnInsert: { qrSecret: randomBytes(24).toString('hex') },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }
  console.log(`✓ Stations: ${KALADZIAH_STATIONS.length} 筆`)

  // 4) Rewards
  for (const r of KALADZIAH_REWARDS) {
    await RewardModel.findOneAndUpdate(
      { campaignId: campaign._id, title: r.title },
      { campaignId: campaign._id, ...r },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }
  console.log(`✓ Rewards: ${KALADZIAH_REWARDS.length} 筆`)

  await mongoose.disconnect()
  console.log('✓ 完成，已斷線')
}

seed().catch((err) => {
  console.error('✗ 種子失敗：', err)
  process.exit(1)
})
