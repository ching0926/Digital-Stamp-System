import liff from '@line/liff'

// 在 client 端初始化 LIFF，並以 $liff 提供給整個 app 使用。
// LIFF 只能在瀏覽器執行，所以檔名以 .client 結尾（Nuxt 只在 client 載入）。
export default defineNuxtPlugin(async () => {
  const {
    public: { liffId: rawLiffId },
  } = useRuntimeConfig()
  // 防呆：環境變數值可能夾帶前後空白，會讓 liff.init 失敗
  const liffId = (rawLiffId || '').trim()

  let ready = false

  if (!liffId) {
    console.warn('[liff] NUXT_PUBLIC_LIFF_ID 未設定，略過 liff.init')
  } else {
    try {
      await liff.init({ liffId })
      ready = true
    } catch (err) {
      console.error('[liff] init 失敗：', err)
    }
  }

  return {
    provide: {
      liff,
      liffReady: ready,
    },
  }
})
