import mongoose, { Schema, type InferSchemaType } from 'mongoose'

// Reward = 獎項（達到 requirementCount 個章即可兌換）
const rewardSchema = new Schema(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    title: { type: String, required: true },
    requirementCount: { type: Number, required: true, min: 1 },
    rewardName: { type: String, required: true },
    iconType: {
      type: String,
      enum: ['postcard', 'coffee', 'bag'],
      default: 'postcard',
    },
    // 總庫存 / 限量，-1 表示不限量
    stock: { type: Number, default: -1 },
    // 每位使用者可兌換次數
    perUserLimit: { type: Number, default: 1 },
  },
  { timestamps: true },
)

export type Reward = InferSchemaType<typeof rewardSchema>

export const RewardModel =
  mongoose.models.Reward || mongoose.model('Reward', rewardSchema)
