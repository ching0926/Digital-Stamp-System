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
export type CampaignStatus = 'draft' | 'active' | 'ended'

interface CampaignPayload {
  campaign: {
    id: string
    title: string
    description: string
    type: CampaignType
    marketMapUrl: string
    status: CampaignStatus
  }
  stations: Station[]
  rewards: Reward[]
  collectedStationIds: string[]
  claimedRewardIds: string[]
  redemptions: Redemption[]
}

// 記住民眾最後看的那一檔活動。兩檔同時進行時，掃碼會切換活動，
// 沒有這個的話重新整理又會跳回「最新一檔」，集章卡就對不上了。
const CAMPAIGN_KEY = 'jiuli-hai:campaign-id'

function readStoredCampaignId(): string {
  if (!import.meta.client) return ''
  try {
    return localStorage.getItem(CAMPAIGN_KEY) ?? ''
  } catch {
    return '' // 無痕模式或封鎖 storage 時不該讓前台整個掛掉
  }
}

function storeCampaignId(id: string) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(CAMPAIGN_KEY, id)
  } catch {
    /* 同上，存不進去就算了 */
  }
}

export const useCampaignStore = defineStore('campaign', {
  state: () => ({
    campaignId: '' as string,
    title: '' as string,
    campaignType: 'district' as CampaignType,
    campaignStatus: 'active' as CampaignStatus,
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
    // 非進行中 = 由入口連結預覽草稿／已結束的活動，此時集章會被後端擋下
    isPreview: (state) => state.campaignStatus !== 'active',
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
    // campaignId 留空 = 沿用上次看的那一檔（沒有就由後端給最新一檔）。
    // preview = 網址明確帶了 `?c=`，允許載入草稿／已結束的活動來預覽
    async load(campaignId?: string, opts?: { preview?: boolean }) {
      this.loading = true
      try {
        const target = campaignId || readStoredCampaignId()
        const data = await $fetch<CampaignPayload>('/api/campaign/current', {
          query: target
            ? { campaignId: target, ...(opts?.preview ? { preview: '1' } : {}) }
            : undefined,
        })
        this.campaignId = data.campaign.id
        this.title = data.campaign.title
        this.campaignType = data.campaign.type ?? 'district'
        this.campaignStatus = data.campaign.status ?? 'active'
        // 只記進行中的活動：預覽過一次草稿就把它記起來的話，
        // 之後每次進站都會停在那檔草稿
        if (this.campaignStatus === 'active') storeCampaignId(data.campaign.id)
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
        campaignId: string
        stationName: string
        collectedStationIds: string[]
      }>('/api/stamp/collect', {
        method: 'POST',
        body: { token, lat: geo?.lat, lng: geo?.lng },
      })
      // 兩檔活動同時進行時，掃到別檔的 QR 就整個切過去。
      // 不切的話章記在 A 活動、畫面停在 B，集章卡會顯示錯的點與進度。
      if (res.campaignId && res.campaignId !== this.campaignId) {
        await this.load(res.campaignId)
      } else {
        this.collectedStationIds = res.collectedStationIds
      }
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
