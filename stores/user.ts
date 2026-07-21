import { defineStore } from 'pinia'

export interface CurrentUser {
  id: string
  lineUserId: string
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

    // 用 LINE idToken 登入
    async loginWithIdToken(idToken: string) {
      this.loading = true
      try {
        this.user = await $fetch<CurrentUser>('/api/auth/line', {
          method: 'POST',
          body: { idToken },
        })
        return this.user
      } finally {
        this.loading = false
      }
    },

    // 開發用假登入（僅開發環境後端會接受）
    async devLogin() {
      this.loading = true
      try {
        this.user = await $fetch<CurrentUser>('/api/auth/line', {
          method: 'POST',
          body: { dev: true },
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
