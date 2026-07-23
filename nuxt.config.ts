import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  devtools: { enabled: true },

  // 關閉 app manifest（本機測試不需要；避免 dev 的 #app-manifest 解析錯誤導致前端載不起來）
  experimental: { appManifest: false },

  // 舊 React 原型僅供參考，排除於 Nuxt / 型別掃描之外
  ignore: ['prototype/**', 'myenv/**'],

  modules: ['@pinia/nuxt'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
    // 啟動時預先打包這些相依，避免執行期才最佳化造成整頁重載/空白
    optimizeDeps: { include: ['vue3-google-map', 'lucide-vue-next'] },
    // 允許透過 cloudflared tunnel 的網域存取（手機 HTTPS 測試用）
    server: { allowedHosts: ['.trycloudflare.com'] },
  },

  // 由 env 於執行期注入。env 對應：NUXT_MONGODB_URI, NUXT_SESSION_SECRET, NUXT_STAFF_PASSCODE …
  runtimeConfig: {
    mongodbUri: '',
    sessionSecret: '',
    // 商家核銷通行碼
    staffPasscode: '',
    // GPS 地理圍籬（型別由預設值推斷：boolean / number）
    geofenceEnforce: true,
    geofenceRadiusM: 300,
    public: {
      // 前端 Google Maps JavaScript API key（env: NUXT_PUBLIC_GOOGLE_MAPS_API_KEY）
      googleMapsApiKey: '',
    },
  },

  app: {
    head: {
      title: '揪裡嗨 集章',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
        },
        { name: 'format-detection', content: 'telephone=no' },
      ],
    },
  },
})
