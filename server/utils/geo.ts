// Haversine 距離（公尺）
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// 地理圍籬檢查：未提供座標或超出半徑則丟錯（GPS 防作弊，P2）。
export function assertWithinGeofence(
  stationGeo: { lat: number; lng: number },
  userGeo: { lat?: number; lng?: number } | undefined,
) {
  const { geofenceEnforce, geofenceRadiusM } = useRuntimeConfig()
  if (!geofenceEnforce) return

  if (!userGeo || typeof userGeo.lat !== 'number' || typeof userGeo.lng !== 'number') {
    throw createError({ statusCode: 400, message: '請開啟定位權限，並在集章點現場完成集章' })
  }
  const dist = haversineMeters(stationGeo, { lat: userGeo.lat, lng: userGeo.lng })
  if (dist > geofenceRadiusM) {
    throw createError({
      statusCode: 400,
      message: `距離集章點約 ${Math.round(dist)} 公尺，請靠近至 ${geofenceRadiusM} 公尺內再集章`,
    })
  }
}
