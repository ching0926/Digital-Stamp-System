import { UserModel } from '../../models/User'

// POST /api/auth/login
// 本機測試用：不需任何授權，直接建立/取用一個固定的本機測試使用者並發 session。
export default defineEventHandler(async (event) => {
  await useMongoose()

  const user = await UserModel.findOneAndUpdate(
    { lineUserId: 'LOCAL' },
    { lineUserId: 'LOCAL', displayName: '本機測試者' },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  setSessionCookie(event, user._id.toString())

  return {
    id: user._id.toString(),
    displayName: user.displayName,
    pictureUrl: user.pictureUrl,
  }
})
