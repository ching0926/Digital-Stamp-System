import mongoose, { Schema, type InferSchemaType } from 'mongoose'

// Tenant = 商圈 / 市集擁有者（多租戶最上層）
const tenantSchema = new Schema(
  {
    name: { type: String, required: true },
    contact: { type: String, default: '' },
    liffId: { type: String, default: '' },
    lineChannelId: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true },
)

export type Tenant = InferSchemaType<typeof tenantSchema>

export const TenantModel =
  mongoose.models.Tenant || mongoose.model('Tenant', tenantSchema)
