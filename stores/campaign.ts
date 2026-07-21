import { defineStore } from 'pinia'

export interface Station {
  id: string
  name: string
  title: string
  description: string
  address: string
  geo: { lat: number; lng: number }
  mapCoord: { x: number; y: number }
  imgUrl: string
  type: string
  specialty: string
  phone?: string
  hours?: string
  order: number
  noStamp: boolean
}

export interface Reward {
  id: string
  title: string
  requirementCount: number
  rewardName: string
  iconType: 'postcard' | 'coffee' | 'bag'
  stock: number
  perUserLimit: number
}

export interface Redemption {
  id: string
  rewardId: string
  code: string
  status: 'pending' | 'redeemed'
}

interface CampaignPayload {
  campaign: { id: string; title: string; description: string }
  stations: Station[]
  rewards: Reward[]
  collectedStationIds: string[]
  claimedRewardIds: string[]
  redemptions: Redemption[]
}

export const useCampaignStore = defineStore('campaign', {
  state: () => ({
    campaignId: '' as string,
    title: '' as string,
    stations: [] as Station[],
    rewards: [] as Reward[],
    collectedStationIds: [] as string[],
    claimedRewardIds: [] as string[],
    redemptions: [] as Redemption[],
    loading: false,
    loaded: false,
  }),
  getters: {
    stampableStations: (state) => state.stations.filter((s) => !s.noStamp),
    collectedCount: (state) => state.collectedStationIds.length,
    totalCount(): number {
      return this.stampableStations.length
    },
    progressPercent(): number {
      return this.totalCount === 0
        ? 0
        : Math.round((this.collectedCount / this.totalCount) * 100)
    },
    isCollected: (state) => (stationId: string) =>
      state.collectedStationIds.includes(stationId),
    isClaimed: (state) => (rewardId: string) =>
      state.claimedRewardIds.includes(rewardId),
    redemptionFor: (state) => (rewardId: string) =>
      state.redemptions.find((r) => r.rewardId === rewardId) ?? null,
  },
  actions: {
    async load() {
      this.loading = true
      try {
        const data = await $fetch<CampaignPayload>('/api/campaign/current')
        this.campaignId = data.campaign.id
        this.title = data.campaign.title
        this.stations = data.stations
        this.rewards = data.rewards
        this.collectedStationIds = data.collectedStationIds
        this.claimedRewardIds = data.claimedRewardIds
        this.redemptions = data.redemptions ?? []
        this.loaded = true
      } finally {
        this.loading = false
      }
    },

    // 掃碼集章。回傳結果供 UI 顯示 toast。
    async collect(token: string, geo?: { lat: number; lng: number }) {
      const res = await $fetch<{
        ok: boolean
        alreadyCollected: boolean
        stationName: string
        collectedStationIds: string[]
      }>('/api/stamp/collect', {
        method: 'POST',
        body: { token, lat: geo?.lat, lng: geo?.lng },
      })
      this.collectedStationIds = res.collectedStationIds
      return res
    },

    // 領取獎項（達門檻後）→ 取得核銷碼
    async claim(rewardId: string) {
      const red = await $fetch<Redemption & { rewardName: string }>('/api/reward/claim', {
        method: 'POST',
        body: { rewardId },
      })
      if (!this.claimedRewardIds.includes(rewardId)) this.claimedRewardIds.push(rewardId)
      this.redemptions.push({ id: red.id, rewardId: red.rewardId, code: red.code, status: red.status })
      return red
    },
  },
})
