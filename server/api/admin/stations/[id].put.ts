import { StationModel } from '../../../models/Station'

// PUT /api/admin/stations/:id
// 更新集章點。只套用 body 內出現的欄位，QR 分頁的 noStamp 開關也走這支。
// qrSecret 不開放修改，否則既有印製的 QR 會全部失效。
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await useMongoose()

  const id = getRouterParam(event, 'id')
  const body = await readBody<Record<string, any>>(event)

  const station = await StationModel.findById(id)
  if (!station) throw createError({ statusCode: 404, message: '查無此集章點' })

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) throw createError({ statusCode: 400, message: '請填寫名稱' })
    station.name = name
  }
  if (body.title !== undefined) station.title = String(body.title)
  if (body.description !== undefined) station.description = String(body.description)
  if (body.address !== undefined) station.address = String(body.address)
  if (body.geo !== undefined) {
    station.geo = { lat: Number(body.geo?.lat ?? 0), lng: Number(body.geo?.lng ?? 0) }
  }
  if (body.mapCoord !== undefined) {
    station.mapCoord = { x: Number(body.mapCoord?.x ?? 50), y: Number(body.mapCoord?.y ?? 50) }
  }
  if (body.imgUrl !== undefined) station.imgUrl = String(body.imgUrl)
  if (body.type !== undefined) station.type = String(body.type)
  if (body.specialty !== undefined) station.specialty = String(body.specialty)
  if (body.phone !== undefined) station.phone = String(body.phone)
  if (body.hours !== undefined) station.hours = String(body.hours)
  if (body.order !== undefined) station.order = Number(body.order)
  if (body.noStamp !== undefined) station.noStamp = Boolean(body.noStamp)

  await station.save()
  return { station: stationDto(station) }
})
