import { StationModel } from '../../../models/Station'
import { StampRecordModel } from '../../../models/StampRecord'

// DELETE /api/admin/stations/:id
// 已有集章紀錄的點擋下不刪 —— 使用者的進度會憑空少一章。改建議關閉集章功能（noStamp）。
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await useMongoose()

  const id = getRouterParam(event, 'id')
  const station = await StationModel.findById(id)
  if (!station) throw createError({ statusCode: 404, message: '查無此集章點' })

  const stampCount = await StampRecordModel.countDocuments({ stationId: station._id })
  if (stampCount > 0) {
    throw createError({
      statusCode: 409,
      message: `此點已有 ${stampCount} 筆集章紀錄，無法刪除。請改用「關閉集章功能」`,
    })
  }

  await station.deleteOne()
  return { ok: true }
})
