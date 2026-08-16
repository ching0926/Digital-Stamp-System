import { defineStore } from 'pinia'

export interface Station {
  id: string
  name: string
  title: string
  description: string
  address: string
  geo: { lat: number; lng: number }
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

export type CampaignType = 'district' | 'market'

interface CampaignPayload {
  campaign: {
    id: string
    title: string
    description: string
    type: CampaignType
    marketMapUrl: string
  }
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
    campaignType: 'district' as CampaignType,
    marketMapUrl: '' as string,
    stations: [] as Station[],
    rewards: [] as Reward[],
    collectedStationIds: [] as string[],
    claimedRewardIds: [] as string[],
    redemptions: [] as Redemption[],
    loading: false,
    loaded: false,
  }),
  getters: {
    // 市集用自繪平面圖，商圈用 Google 地圖
    isMarket: (state) => state.campaignType === 'market',
    // 前台用語：與 stores/admin.ts 的同名 getter 一致
    unitLabel: (state) => (state.campaignType === 'market' ? '攤位' : '景點'),
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
        this.campaignType = data.campaign.type ?? 'district'
        this.marketMapUrl = data.campaign.marketMapUrl ?? ''
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

    // 現場核銷：工作人員在民眾手機上輸入通行碼確認，一次完成領取與核銷
    async redeemOnSite(rewardId: string, staffKey: string) {
      const red = await $fetch<Redemption & { rewardName: string }>('/api/reward/redeem', {
        method: 'POST',
        body: { rewardId, staffKey },
      })
      if (!this.claimedRewardIds.includes(rewardId)) this.claimedRewardIds.push(rewardId)
      this.redemptions.push({ id: red.id, rewardId: red.rewardId, code: red.code, status: red.status })
      return red
    },
  },
})
