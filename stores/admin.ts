import { defineStore } from 'pinia'

const KEY_STORAGE = 'jh_admin_key'

export interface AdminCampaign {
  id: string
  title: string
  description: string
  startAt: string
  endAt: string
  theme: string
  type: 'district' | 'market'
  targetStampCount: number
  marketMapUrl: string
  // 現場核銷用的 4 碼數字通行碼；空字串 = 沿用系統預設（env）
  staffPasscode: string
  status: 'draft' | 'active' | 'ended'
  participantsCount: number
}

export interface AdminStation {
  id: string
  campaignId: string
  name: string
  title: string
  description: string
  address: string
  geo: { lat: number; lng: number }
  imgUrl: string
  type: string
  specialty: string
  phone: string
  hours: string
  order: number
  noStamp: boolean
}

export interface AdminReward {
  id: string
  campaignId: string
  title: string
  requirementCount: number
  rewardName: string
  iconType: 'postcard' | 'coffee' | 'bag'
  stock: number
  perUserLimit: number
}

export interface AdminQrStation {
  id: string
  name: string
  type: string
  noStamp: boolean
  token: string
}

export const useAdminStore = defineStore('admin', {
  state: () => ({
    // 通行碼。存 localStorage，重整後仍保持登入（同 /verify 的做法）
    passcode: '' as string,
    authed: false,
    campaigns: [] as AdminCampaign[],
    activeCampaignId: '' as string,
    stations: [] as AdminStation[],
    rewards: [] as AdminReward[],
    qrStations: [] as AdminQrStation[],
    loading: false,
  }),
  getters: {
    activeCampaign: (state) =>
      state.campaigns.find((c) => c.id === state.activeCampaignId) ?? null,
    // 市集活動的點位在介面上叫「攤位」，商圈叫「景點」
    unitLabel(): string {
      return this.activeCampaign?.type === 'market' ? '攤位' : '景點'
    },
  },
  actions: {
    // 所有後台請求共用：帶上 x-admin-key，並在 401 時自動登出回通行碼畫面
    async request<T>(url: string, opts: Record<string, unknown> = {}): Promise<T> {
      try {
        // $fetch 會依路由推導回傳型別，泛型包裝時需明確斷言回 T
        return (await $fetch(url, {
          ...opts,
          headers: { 'x-admin-key': this.passcode },
        })) as T
      } catch (err: unknown) {
        const e = err as { statusCode?: number; status?: number }
        if (e.statusCode === 401 || e.status === 401) this.logout()
        throw err
      }
    },

    restoreSession() {
      const saved = localStorage.getItem(KEY_STORAGE) ?? ''
      if (saved) {
        this.passcode = saved
        this.authed = true
      }
    },

    // 用一次 campaigns 查詢驗證通行碼是否正確，正確才寫入 localStorage
    async login(passcode: string) {
      this.passcode = passcode.trim()
      await this.loadCampaigns()
      this.authed = true
      localStorage.setItem(KEY_STORAGE, this.passcode)
    },

    logout() {
      this.passcode = ''
      this.authed = false
      this.campaigns = []
      this.stations = []
      this.rewards = []
      this.qrStations = []
      this.activeCampaignId = ''
      localStorage.removeItem(KEY_STORAGE)
    },

    // === 活動 ===
    async loadCampaigns() {
      const data = await this.request<{ campaigns: AdminCampaign[] }>('/api/admin/campaigns')
      this.campaigns = data.campaigns
    },

    async createCampaign(payload: Partial<AdminCampaign>) {
      const data = await this.request<{ campaign: AdminCampaign }>('/api/admin/campaigns', {
        method: 'POST',
        body: payload,
      })
      this.campaigns.unshift(data.campaign)
      return data.campaign
    },

    async updateCampaign(id: string, payload: Partial<AdminCampaign>) {
      const data = await this.request<{ campaign: AdminCampaign }>(`/api/admin/campaigns/${id}`, {
        method: 'PUT',
        body: payload,
      })
      const idx = this.campaigns.findIndex((c) => c.id === id)
      // API 不回傳 participantsCount（那是列表才算的），故保留原值
      if (idx !== -1) {
        this.campaigns[idx] = {
          ...data.campaign,
          participantsCount: this.campaigns[idx].participantsCount,
        }
      }
      return data.campaign
    },

    async deleteCampaign(id: string) {
      await this.request(`/api/admin/campaigns/${id}`, { method: 'DELETE' })
      this.campaigns = this.campaigns.filter((c) => c.id !== id)
      if (this.activeCampaignId === id) this.activeCampaignId = ''
    },

    // 進入某活動的管理畫面，載入其集章點與獎項
    async selectCampaign(id: string) {
      this.activeCampaignId = id
      await Promise.all([this.loadStations(), this.loadRewards()])
    },

    // === 集章點 ===
    async loadStations() {
      if (!this.activeCampaignId) return
      const data = await this.request<{ stations: AdminStation[] }>('/api/admin/stations', {
        query: { campaignId: this.activeCampaignId },
      })
      this.stations = data.stations
    },

    async createStation(payload: Partial<AdminStation>) {
      const data = await this.request<{ station: AdminStation }>('/api/admin/stations', {
        method: 'POST',
        body: { ...payload, campaignId: this.activeCampaignId },
      })
      this.stations.push(data.station)
      return data.station
    },

    async updateStation(id: string, payload: Partial<AdminStation>) {
      const data = await this.request<{ station: AdminStation }>(`/api/admin/stations/${id}`, {
        method: 'PUT',
        body: payload,
      })
      const idx = this.stations.findIndex((s) => s.id === id)
      if (idx !== -1) this.stations[idx] = data.station
      // QR 分頁的 noStamp 狀態要跟著更新
      const qrIdx = this.qrStations.findIndex((s) => s.id === id)
      if (qrIdx !== -1) {
        this.qrStations[qrIdx] = {
          ...this.qrStations[qrIdx],
          name: data.station.name,
          type: data.station.type,
          noStamp: data.station.noStamp,
        }
      }
      return data.station
    },

    async deleteStation(id: string) {
      await this.request(`/api/admin/stations/${id}`, { method: 'DELETE' })
      this.stations = this.stations.filter((s) => s.id !== id)
      this.qrStations = this.qrStations.filter((s) => s.id !== id)
    },

    // === 獎項 ===
    async loadRewards() {
      if (!this.activeCampaignId) return
      const data = await this.request<{ rewards: AdminReward[] }>('/api/admin/rewards', {
        query: { campaignId: this.activeCampaignId },
      })
      this.rewards = data.rewards
    },

    async createReward(payload: Partial<AdminReward>) {
      const data = await this.request<{ reward: AdminReward }>('/api/admin/rewards', {
        method: 'POST',
        body: { ...payload, campaignId: this.activeCampaignId },
      })
      this.rewards.push(data.reward)
      this.rewards.sort((a, b) => a.requirementCount - b.requirementCount)
      return data.reward
    },

    async updateReward(id: string, payload: Partial<AdminReward>) {
      const data = await this.request<{ reward: AdminReward }>(`/api/admin/rewards/${id}`, {
        method: 'PUT',
        body: payload,
      })
      const idx = this.rewards.findIndex((r) => r.id === id)
      if (idx !== -1) this.rewards[idx] = data.reward
      this.rewards.sort((a, b) => a.requirementCount - b.requirementCount)
      return data.reward
    },

    async deleteReward(id: string) {
      await this.request(`/api/admin/rewards/${id}`, { method: 'DELETE' })
      this.rewards = this.rewards.filter((r) => r.id !== id)
    },

    // === QR ===
    async loadQrStations() {
      if (!this.activeCampaignId) return
      const data = await this.request<{ stations: AdminQrStation[] }>('/api/admin/qr', {
        query: { campaignId: this.activeCampaignId },
      })
      this.qrStations = data.stations
    },

    // === 圖片上傳 ===
    async uploadImage(file: File): Promise<string> {
      const form = new FormData()
      form.append('file', file)
      const data = await this.request<{ url: string }>('/api/admin/upload', {
        method: 'POST',
        body: form,
      })
      return data.url
    },
  },
})
