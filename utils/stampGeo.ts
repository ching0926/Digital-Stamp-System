// 集章時要送的 GPS 座標。圍籬關閉時就不要跟使用者要定位權限
// （少一個彈窗、也省掉 timeout 等待）。Scanner 與掃碼落地流程共用。
export async function getStampGeo(): Promise<{ lat: number; lng: number } | undefined> {
  const { public: publicConfig } = useRuntimeConfig()
  if (!publicConfig.geofenceEnforce) return undefined
  if (!navigator.geolocation) return undefined
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(undefined),
      { timeout: 4000 },
    )
  })
}
