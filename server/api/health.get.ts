import mongoose from 'mongoose'

// GET /api/health — 確認伺服器與 MongoDB 連線狀態（P0 驗證用）
export default defineEventHandler(async () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
  let dbState = 'disconnected'
  let ok = false

  try {
    await useMongoose()
    dbState = states[mongoose.connection.readyState] ?? 'unknown'
    ok = mongoose.connection.readyState === 1
  } catch (err) {
    dbState = `error: ${(err as Error).message}`
  }

  return {
    ok,
    service: 'jiuli-hai-stamp',
    db: dbState,
    time: new Date().toISOString(),
  }
})
