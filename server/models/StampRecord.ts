import mongoose, { Schema, type InferSchemaType } from 'mongoose'

// StampRecord = 一次成功集章紀錄
const stampRecordSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    stationId: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    collectedAt: { type: Date, default: () => new Date() },
    // 集章當下驗證通過的使用者座標
    verifiedGeo: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  { timestamps: true },
)

// 同一使用者對同一集章點只能有一筆紀錄（防重複集章）
stampRecordSchema.index({ userId: 1, stationId: 1 }, { unique: true })

export type StampRecord = InferSchemaType<typeof stampRecordSchema>

export const StampRecordModel =
  mongoose.models.StampRecord || mongoose.model('StampRecord', stampRecordSchema)
