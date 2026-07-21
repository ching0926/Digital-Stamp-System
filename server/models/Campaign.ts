import mongoose, { Schema, type InferSchemaType } from 'mongoose'

// Campaign = 一檔集章活動，隸屬某個 Tenant
const campaignSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    theme: { type: String, default: '' },
    // 前端自繪地圖用的設定（背景圖、外框等），彈性欄位
    mapConfig: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['draft', 'active', 'ended'],
      default: 'draft',
    },
  },
  { timestamps: true },
)

export type Campaign = InferSchemaType<typeof campaignSchema>

export const CampaignModel =
  mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema)
