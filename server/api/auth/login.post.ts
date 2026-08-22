import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import { UserModel } from '../../models/User'

// 匿名帳號的 lineUserId 前綴，用來分辨「還沒接上 LINE 的裝置身分」
const ANON_PREFIX = 'anon:'

// POST /api/auth/login  body: { idToken?: string }
//
// 有 idToken（前端 LIFF 取得）→ 向 LINE 驗證後以 lineUserId 認人，換瀏覽器／換裝置都是同一個帳號。
// 沒有 idToken（本機開發、未設 LIFF ID、LIFF 初始化失敗）→ 沿用匿名裝置身分，靠 session cookie 認人。
// 兩條路徑產出的都是同一種 User，集章／領獎認的是 User._id，不受身分來源影響。
export default defineEventHandler(async (event) => {
  await useMongoose()

  const body = await readBody<{ idToken?: string }>(event).catch(() => null)
  const idToken = String(body?.idToken ?? '').trim()
  const uid = getSessionUserId(event)

  return idToken ? await loginWithLine(event, idToken, uid) : await loginAnonymously(event, uid)
})

interface UserDoc {
  _id: { toString(): string }
  lineUserId: string
  displayName: string
  pictureUrl: string
  save(): Promise<unknown>
}

function toDto(user: UserDoc) {
  return {
    id: user._id.toString(),
    displayName: user.displayName,
    pictureUrl: user.pictureUrl,
  }
}

// lineUserId 有 unique index：多分頁同時首次登入時會有一個撞上，
// 這時不該報錯，改用先建好的那個帳號即可
function isDuplicateKey(err: unknown) {
  return (err as { code?: number })?.code === 11000
}

async function adoptExisting(event: H3Event, lineUserId: string) {
  const winner = (await UserModel.findOne({ lineUserId })) as UserDoc | null
  if (!winner) return null
  setSessionCookie(event, winner._id.toString())
  return toDto(winner)
}

async function loginWithLine(event: H3Event, idToken: string, uid: string | null) {
  const profile = await verifyLineIdToken(idToken)
  const displayName = profile.displayName || `LINE ${profile.lineUserId.slice(-4).toUpperCase()}`

  // 1) 這個 LINE 身分已經有帳號 → 直接切過去。跨瀏覽器、跨裝置認的就是這條
  const linked = (await UserModel.findOne({ lineUserId: profile.lineUserId })) as UserDoc | null
  if (linked) {
    // 暱稱／頭像可能在 LINE 那邊改過，每次登入順手更新
    linked.displayName = displayName
    linked.pictureUrl = profile.pictureUrl || linked.pictureUrl
    await linked.save()
    setSessionCookie(event, linked._id.toString())
    return toDto(linked)
  }

  // 2) 這個 LINE 身分第一次出現。當下若是匿名帳號就地升級——集章與兌換紀錄
  //    都掛在 User._id 上，只換 lineUserId 不會動到既有進度
  const current = uid ? ((await UserModel.findById(uid)) as UserDoc | null) : null
  if (current && String(current.lineUserId).startsWith(ANON_PREFIX)) {
    current.lineUserId = profile.lineUserId
    current.displayName = displayName
    current.pictureUrl = profile.pictureUrl || current.pictureUrl
    try {
      await current.save()
      setSessionCookie(event, current._id.toString())
      return toDto(current)
    } catch (err) {
      if (!isDuplicateKey(err)) throw err
      const adopted = await adoptExisting(event, profile.lineUserId)
      if (adopted) return adopted
      throw err
    }
  }

  // 3) 完全沒有可承接的身分 → 開新帳號
  try {
    const user = (await UserModel.create({
      lineUserId: profile.lineUserId,
      displayName,
      pictureUrl: profile.pictureUrl,
    })) as UserDoc
    setSessionCookie(event, user._id.toString())
    return toDto(user)
  } catch (err) {
    if (!isDuplicateKey(err)) throw err
    const adopted = await adoptExisting(event, profile.lineUserId)
    if (adopted) return adopted
    throw err
  }
}

async function loginAnonymously(event: H3Event, uid: string | null) {
  // 已經有有效 session 就沿用，避免同一個人被重複開帳號
  if (uid) {
    const existing = (await UserModel.findById(uid)) as UserDoc | null
    if (existing) return toDto(existing)
  }

  const externalId = `${ANON_PREFIX}${randomUUID()}`
  // 取末 4 碼當識別碼，核銷時工作人員畫面才分得出是不同人
  const suffix = externalId.slice(-4).toUpperCase()

  const user = (await UserModel.create({
    lineUserId: externalId,
    displayName: `訪客 ${suffix}`,
  })) as UserDoc

  setSessionCookie(event, user._id.toString())
  return toDto(user)
}
