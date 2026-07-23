import { UserModel } from '../../models/User'

// GET /api/auth/me — 回傳目前登入使用者（未登入回 null）
export default defineEventHandler(async (event) => {
  await useMongoose()
  const uid = getSessionUserId(event)
  if (!uid) return { user: null }

  const user = await UserModel.findById(uid)
  if (!user) return { user: null }

  return {
    user: {
      id: user._id.toString(),
      displayName: user.displayName,
      pictureUrl: user.pictureUrl,
    },
  }
})
