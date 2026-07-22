import mongoose from 'mongoose'

// Cache the connection across hot-reloads / serverless invocations so we don't
// open a new pool on every request.
let connectPromise: Promise<typeof mongoose> | null = null

export async function useMongoose(): Promise<typeof mongoose> {
  // 1 = connected, 2 = connecting
  if (mongoose.connection.readyState === 1) return mongoose

  if (!connectPromise) {
    const { mongodbUri } = useRuntimeConfig()
    if (!mongodbUri) {
      throw createError({
        statusCode: 500,
        message: 'NUXT_MONGODB_URI is not configured',
      })
    }
    connectPromise = mongoose.connect(mongodbUri).catch((err) => {
      // Reset so the next request can retry a fresh connection.
      connectPromise = null
      throw err
    })
  }

  return connectPromise
}
