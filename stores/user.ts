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

    // 本機測試登入（不需授權，直接取得測試帳號）
    async login() {
      this.loading = true
      try {
        this.user = await $fetch<CurrentUser>('/api/auth/login', { method: 'POST' })
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
