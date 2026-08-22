// 通用的「連續錯誤就鎖一段時間」節流。key 是什麼由呼叫端決定
//（核銷用 userId、後台登入用來源 IP）。
//
// 注意：serverless 每個 instance 各有一份記憶體，這只是提高暴力破解成本的緩解措施，
// 不是完整防護；要做確實的防護需改存 DB 或外部快取。
export function createAttemptLimiter(opts: { maxFails: number; lockMs: number }) {
  const attempts = new Map<string, { fails: number; lockedUntil: number }>()

  // 已被鎖就直接擋下（順便清掉過期紀錄，避免 Map 無限長大）
  function assertNotLocked(key: string) {
    const rec = attempts.get(key)
    if (!rec) return
    if (rec.lockedUntil > Date.now()) {
      const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60000)
      throw createError({ statusCode: 429, message: `通行碼錯誤次數過多，請 ${mins} 分鐘後再試` })
    }
    if (rec.lockedUntil) attempts.delete(key)
  }

  function recordFailure(key: string) {
    const rec = attempts.get(key) ?? { fails: 0, lockedUntil: 0 }
    rec.fails += 1
    if (rec.fails >= opts.maxFails) {
      rec.fails = 0
      rec.lockedUntil = Date.now() + opts.lockMs
    }
    attempts.set(key, rec)
  }

  function clear(key: string) {
    attempts.delete(key)
  }

  return { assertNotLocked, recordFailure, clear }
}
