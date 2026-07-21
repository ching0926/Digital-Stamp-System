import type { Liff } from '@line/liff'

// 封裝常用的 LIFF 操作，讓元件不必直接碰 $liff。
export function useLiff() {
  const { $liff, $liffReady } = useNuxtApp() as unknown as {
    $liff: Liff
    $liffReady: boolean
  }

  const isReady = () => !!$liffReady
  const isInClient = () => isReady() && $liff.isInClient()
  const isLoggedIn = () => isReady() && $liff.isLoggedIn()

  const login = () => {
    if (isReady() && !$liff.isLoggedIn()) $liff.login()
  }

  const getIdToken = () => (isReady() ? $liff.getIDToken() : null)

  const getProfile = async () => {
    if (!isReady() || !$liff.isLoggedIn()) return null
    return $liff.getProfile()
  }

  // 掃描 QR（LINE App 內建掃碼；外部瀏覽器需另用 html5-qrcode 備援，P1 處理）
  const scanCode = async () => {
    if (!isReady()) return null
    return $liff.scanCodeV2()
  }

  return { $liff, isReady, isInClient, isLoggedIn, login, getIdToken, getProfile, scanCode }
}
