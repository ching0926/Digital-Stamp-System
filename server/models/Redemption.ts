import mongoose, { Schema, type InferSchemaType } from 'mongoose'

// Redemption = 獎項兌換/核銷紀錄
const redemptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    rewardId: { type: Schema.Types.ObjectId, ref: 'Reward', required: true },
    // 核銷碼（給商家掃描 / 輸入）
    code: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'redeemed'],
      default: 'pending',
    },
    claimedAt: { type: Date, default: () => new Date() },
    redeemedAt: { type: Date },
    // 核銷操作者（商家帳號 / 攤位識別）
    redeemedBy: { type: String, default: '' },
  },
  { timestamps: true },
)

export type Redemption = InferSchemaType<typeof redemptionSchema>

export const RedemptionModel =
  mongoose.models.Redemption || mongoose.model('Redemption', redemptionSchema)
