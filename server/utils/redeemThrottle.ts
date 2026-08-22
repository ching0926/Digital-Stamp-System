// 核銷碼縮成 4 碼（1 萬組）後，「工作人員點選核銷」的按鈕又長在民眾自己手機上，
// 所以對同一個使用者的連續錯誤加一層節流。
// 實作抽在 attemptLimiter.ts（與後台登入共用），這裡只保留核銷專用的匯出名稱，
// 呼叫端 server/api/reward/redeem.post.ts 不需更動。
const limiter = createAttemptLimiter({ maxFails: 5, lockMs: 5 * 60 * 1000 })

export function assertRedeemNotLocked(userId: string) {
  limiter.assertNotLocked(userId)
}

export function recordRedeemFailure(userId: string) {
  limiter.recordFailure(userId)
}

export function clearRedeemFailures(userId: string) {
  limiter.clear(userId)
}
