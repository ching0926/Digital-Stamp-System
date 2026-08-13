import { randomUUID } from 'node:crypto'
import { UserModel } from '../../models/User'

// POST /api/auth/login
// 目前為匿名裝置身分：每個瀏覽器第一次進來就開一個專屬帳號，之後靠 session cookie 認人。
//
// === 之後要接 LINE LIFF 就改這裡 ===
// 把下面 externalId / displayName / pictureUrl 三個值換成 LINE 回傳的
// userId / displayName / pictureUrl（並在此驗證前端傳來的 idToken）即可。
// session、集章、領獎、防重複領取全部不必動，因為它們認的是 User._id 而非 lineUserId。
export default defineEventHandler(async (event) => {
  await useMongoose()

  // 已經有有效 session 就沿用，避免同一個人被重複開帳號
  const uid = getSessionUserId(event)
  if (uid) {
    const existing = await UserModel.findById(uid)
    if (existing) {
      return {
        id: existing._id.toString(),
        displayName: existing.displayName,
        pictureUrl: existing.pictureUrl,
      }
    }
  }

  // 尚無身分 → 開一個新的匿名帳號
  const externalId = `anon:${randomUUID()}`
  // 取末 4 碼當識別碼，核銷時工作人員畫面才分得出是不同人
  const suffix = externalId.slice(-4).toUpperCase()

  const user = await UserModel.create({
    lineUserId: externalId,
    displayName: `訪客 ${suffix}`,
  })

  setSessionCookie(event, user._id.toString())

  return {
    id: user._id.toString(),
    displayName: user.displayName,
    pictureUrl: user.pictureUrl,
  }
})
