// 核銷碼縮成 4 碼（1 萬組）後，「工作人員點選核銷」的按鈕又長在民眾自己手機上，
// 所以對同一個使用者的連續錯誤加一層節流。
// 注意：serverless 每個 instance 各有一份記憶體，這只是提高暴力破解成本的緩解措施，
// 不是完整防護；要做確實的防護需改存 DB 或外部快取。

const MAX_FAILS = 5
const LOCK_MS = 5 * 60 * 1000

const attempts = new Map<string, { fails: number; lockedUntil: number }>()

// 已被鎖就直接擋下（順便清掉過期紀錄，避免 Map 無限長大）
export function assertRedeemNotLocked(userId: string) {
  const rec = attempts.get(userId)
  if (!rec) return
  if (rec.lockedUntil > Date.now()) {
    const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60000)
    throw createError({ statusCode: 429, message: `通行碼錯誤次數過多，請 ${mins} 分鐘後再試` })
  }
  if (rec.lockedUntil) attempts.delete(userId)
}

export function recordRedeemFailure(userId: string) {
  const rec = attempts.get(userId) ?? { fails: 0, lockedUntil: 0 }
  rec.fails += 1
  if (rec.fails >= MAX_FAILS) {
    rec.fails = 0
    rec.lockedUntil = Date.now() + LOCK_MS
  }
  attempts.set(userId, rec)
}

export function clearRedeemFailures(userId: string) {
  attempts.delete(userId)
}
