import { defineStore } from 'pinia'

export interface CurrentUser {
  id: string
  displayName: string
  pictureUrl: string
}

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as CurrentUser | null,
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => state.user !== null,
  },
  actions: {
    // 讀取現有 session（開 App 時呼叫）
    async fetchMe() {
      const { user } = await $fetch<{ user: CurrentUser | null }>('/api/auth/me')
      this.user = user
      return user
    },

    // 帶 LINE ID token = 以 LINE 身分登入（跨瀏覽器都是同一個帳號）；
    // 不帶 = 沿用／開一個匿名裝置身分
    async login(idToken?: string) {
      this.loading = true
      try {
        this.user = await $fetch<CurrentUser>('/api/auth/login', {
          method: 'POST',
          body: idToken ? { idToken } : {},
        })
        return this.user
      } finally {
        this.loading = false
      }
    },

    async logout() {
      await $fetch('/api/auth/logout', { method: 'POST' })
      this.user = null
    },
  },
})
