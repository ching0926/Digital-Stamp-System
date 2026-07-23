// 重置本機測試者的進度：清空集章紀錄 + 兌換紀錄，並還原獎項庫存。
// 執行： npm run reset  （之後在 App 重新整理即可看到進度歸零）

import mongoose from 'mongoose'

import { UserModel } from '../server/models/User'
import { CampaignModel } from '../server/models/Campaign'
import { RewardModel } from '../server/models/Reward'
import { StampRecordModel } from '../server/models/StampRecord'
import { RedemptionModel } from '../server/models/Redemption'
import { KALADZIAH_REWARDS } from '../server/data/kaladziah'

try {
  ;(process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env')
} catch {
  /* ignore */
}

const uri = process.env.NUXT_MONGODB_URI
if (!uri) {
  console.error('✗ 缺少 NUXT_MONGODB_URI，請先設定 .env')
  process.exit(1)
}

async function reset() {
  await mongoose.connect(uri!)

  // 1) 清空本機測試者的集章 / 兌換紀錄
  const user = await UserModel.findOne({ lineUserId: 'LOCAL' })
  if (user) {
    const s = await StampRecordModel.deleteMany({ userId: user._id })
    const r = await RedemptionModel.deleteMany({ userId: user._id })
    console.log(`✓ 已清除本機測試者：集章 ${s.deletedCount} 筆、兌換 ${r.deletedCount} 筆`)
  } else {
    console.log('（目前沒有本機測試者資料，略過）')
  }

  // 2) 還原獎項庫存（兌換會扣庫存，重置一併還原）
  const campaign = await CampaignModel.findOne({ status: 'active' }).sort({ createdAt: -1 })
  if (campaign) {
    for (const rw of KALADZIAH_REWARDS) {
      await RewardModel.updateOne(
        { campaignId: campaign._id, title: rw.title },
        { $set: { stock: rw.stock } },
      )
    }
    console.log('✓ 已還原獎項庫存')
  }

  await mongoose.disconnect()
  console.log('✓ 重置完成，請在 App 重新整理')
}

reset().catch((err) => {
  console.error('✗ 重置失敗：', err)
  process.exit(1)
})
