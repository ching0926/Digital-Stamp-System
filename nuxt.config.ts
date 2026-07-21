import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  devtools: { enabled: true },

  // 舊 React 原型僅供參考，排除於 Nuxt / 型別掃描之外
  ignore: ['prototype/**', 'myenv/**'],

  modules: ['@pinia/nuxt'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  // Values are injected from env at runtime.
  // Server-only secrets are top-level; client-exposed values go under `public`.
  // env mapping: NUXT_MONGODB_URI, NUXT_SESSION_SECRET, NUXT_LINE_CHANNEL_ID, NUXT_PUBLIC_LIFF_ID
  runtimeConfig: {
    mongodbUri: '',
    sessionSecret: '',
    lineChannelId: '',
    // 商家核銷通行碼
    staffPasscode: '',
    // GPS 地理圍籬（型別由預設值推斷：boolean / number）
    geofenceEnforce: true,
    geofenceRadiusM: 300,
    public: {
      liffId: '',
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
