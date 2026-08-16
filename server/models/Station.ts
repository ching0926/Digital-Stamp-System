import mongoose, { Schema, type InferSchemaType } from 'mongoose'

// Station = 集章點（對齊原型的 StampLocation 結構，另加 geo / qrSecret 供防作弊）
const stationSchema = new Schema(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    name: { type: String, required: true },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    address: { type: String, default: '' },
    // GPS 座標，供地理圍籬驗證
    geo: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    imgUrl: { type: String, default: '' },
    type: { type: String, default: '' },
    specialty: { type: String, default: '' },
    phone: { type: String, default: '' },
    hours: { type: String, default: '' },
    // HMAC 簽章密鑰，用於產生 / 驗證此點的 QR
    qrSecret: { type: String, required: true },
    order: { type: Number, default: 0 },
    // true 表示此點僅供地圖展示、不可集章
    noStamp: { type: Boolean, default: false },
  },
  { timestamps: true },
)

export type Station = InferSchemaType<typeof stationSchema>

export const StationModel =
  mongoose.models.Station || mongoose.model('Station', stationSchema)
