import mongoose, { Schema, type InferSchemaType } from 'mongoose'

// User = LINE 使用者（以 lineUserId 唯一識別）
const userSchema = new Schema(
  {
    lineUserId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, default: '' },
    pictureUrl: { type: String, default: '' },
  },
  { timestamps: true },
)

export type User = InferSchemaType<typeof userSchema>

export const UserModel =
  mongoose.models.User || mongoose.model('User', userSchema)
