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

  // 1) 清空所有測試進度。
  // 身分改為匿名裝置身分後已無固定的測試帳號，且每個瀏覽器都會開一個，
  // 所以直接把集章／兌換紀錄與匿名帳號全部清掉，回到「沒有人參加過」的狀態。
  const s = await StampRecordModel.deleteMany({})
  const r = await RedemptionModel.deleteMany({})
  const u = await UserModel.deleteMany({ lineUserId: /^anon:/ })
  console.log(`✓ 已清除：集章 ${s.deletedCount} 筆、兌換 ${r.deletedCount} 筆、匿名帳號 ${u.deletedCount} 個`)

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
