<script setup lang="ts">
import { Award, Map as MapIcon, Gift, CheckCircle, Info, XCircle, X } from 'lucide-vue-next'
import type { Station } from '~/stores/campaign'

const user = useUserStore()
const campaign = useCampaignStore()
const route = useRoute()
const router = useRouter()

type Tab = 'map' | 'card' | 'rewards'
const activeTab = ref<Tab>('map')
const selectedStation = ref<Station | null>(null)
const isListSheetOpen = ref(false)
const isScannerOpen = ref(false)
const booting = ref(true)
const bootError = ref<string | null>(null)

// 進度浮卡的實際位置，用來決定清單抽屜要展開到哪
const progressCardEl = ref<HTMLElement | null>(null)
const listSheetTop = ref(108)

// 外部相機掃碼落地後的結果橫幅
const scanBanner = ref<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null)
let bannerTimer: ReturnType<typeof setTimeout> | undefined

function showScanBanner(tone: 'success' | 'info' | 'error', text: string) {
  scanBanner.value = { tone, text }
  clearTimeout(bannerTimer)
  bannerTimer = setTimeout(() => (scanBanner.value = null), 5000)
}

function selectStation(s: Station) {
  selectedStation.value = s
}
// 抽屜上緣要貼齊進度浮卡下方，故開啟前先量一次浮卡（字體/機型會影響高度）
function openList() {
  const el = progressCardEl.value
  if (el) listSheetTop.value = el.offsetTop + el.offsetHeight + 12
  isListSheetOpen.value = true
}
function openScanner() {
  isScannerOpen.value = true
}
function selectAndNavigate(s: Station) {
  selectedStation.value = s
  activeTab.value = 'map'
}
function startScanning() {
  selectedStation.value = null
  openScanner()
}
// 掃到章之後從結果畫面跳去集章卡
function goCardFromScanner() {
  isScannerOpen.value = false
  activeTab.value = 'card'
}

async function ensureAuth() {
  await user.fetchMe()
  if (user.isAuthenticated) return
  await user.login() // 無 session 時自動開一個匿名身分
}

// 用手機內建相機掃 QR 會直接開 `/?s=<token>`，落地後自動集章並停在集章卡
async function collectFromUrl() {
  const token = extractQrToken(String(route.query.s ?? ''))
  if (!token) return

  activeTab.value = 'card'
  // 參數留在網址上，重新整理會再送一次集章，先清掉
  await router.replace({ query: {} })

  try {
    const res = await campaign.collect(token, await getStampGeo())
    if (res.alreadyCollected) {
      showScanBanner('info', `${res.stationName}：這個章你已經收集過了`)
    } else {
      showScanBanner('success', `集章成功！${res.stationName}`)
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
    }
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusMessage?: string }
    showScanBanner('error', e.data?.message ?? e.statusMessage ?? '集章失敗，請再試一次')
  }
}

onMounted(async () => {
  try {
    await ensureAuth()
    await campaign.load()
    await collectFromUrl()
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusMessage?: string }
    bootError.value = e.data?.message ?? e.statusMessage ?? '載入失敗，請稍後再試'
  } finally {
    booting.value = false
  }
})

onBeforeUnmount(() => clearTimeout(bannerTimer))
</script>

<template>
  <!-- 滿版：手機與電腦皆填滿視窗 -->
  <div class="relative w-full h-[100dvh] flex flex-col bg-[#FAFBFB] overflow-hidden">
    <!-- 載入中 -->
    <div v-if="booting" class="flex-1 flex flex-col items-center justify-center gap-4">
      <div class="w-10 h-10 border-4 border-[#FF8C00]/20 border-t-[#FF8C00] rounded-full animate-spin" />
      <p class="text-xs text-gray-400 font-bold">載入中…</p>
    </div>

    <!-- 錯誤 -->
    <div v-else-if="bootError" class="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
      <p class="text-sm font-bold text-gray-700">{{ bootError }}</p>
      <p class="text-xs text-gray-400">請確認目前有進行中的活動，或稍後再試。</p>
    </div>

    <!-- 主畫面 -->
    <template v-else>
      <!-- 進度浮卡（地圖分頁）-->
      <div v-if="activeTab === 'map'" ref="progressCardEl" class="absolute top-4 left-4 right-4 z-20 mx-auto max-w-2xl bg-white/95 backdrop-blur-md p-4 rounded-[24px] shadow-sm border border-black/5 flex flex-col gap-2">
        <div class="flex justify-between items-end">
          <span class="text-xs font-bold text-gray-800">{{ campaign.title || '集章冒險' }}進度</span>
          <span class="text-xs font-bold text-[#FF8C00]">{{ campaign.collectedCount }}/{{ campaign.totalCount }} 已收集</span>
        </div>
        <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-[#FF8C00] to-[#FFA333] transition-all duration-700 ease-out" :style="{ width: `${campaign.progressPercent}%` }" />
        </div>
      </div>

      <!-- 外部相機掃碼落地的結果橫幅 -->
      <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0 -translate-y-4" leave-active-class="transition duration-200" leave-to-class="opacity-0 -translate-y-4">
        <div
          v-if="scanBanner && activeTab === 'card'"
          class="absolute top-4 left-4 right-4 z-40 mx-auto max-w-2xl flex items-center gap-3 p-4 rounded-[24px] shadow-lg text-white"
          :class="scanBanner.tone === 'success' ? 'bg-[#10B981]' : scanBanner.tone === 'info' ? 'bg-[#FF8C00]' : 'bg-red-500'"
        >
          <component
            :is="scanBanner.tone === 'success' ? CheckCircle : scanBanner.tone === 'info' ? Info : XCircle"
            class="w-6 h-6 shrink-0"
          />
          <p class="text-sm font-bold tracking-tight flex-1">{{ scanBanner.text }}</p>
          <button class="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0" title="關閉" @click="scanBanner = null">
            <X class="w-4 h-4" />
          </button>
        </div>
      </Transition>

      <!-- 分頁內容 -->
      <div class="flex-1 flex flex-col relative overflow-hidden">
        <Transition mode="out-in" enter-active-class="transition duration-200" enter-from-class="opacity-0 translate-y-2" leave-active-class="transition duration-150" leave-to-class="opacity-0 -translate-y-2">
          <!-- 市集用自繪平面圖，商圈用 Google 地圖 -->
          <MarketMapView
            v-if="activeTab === 'map' && campaign.isMarket"
            @open-list="openList"
            @open-scanner="openScanner"
          />
          <MapView
            v-else-if="activeTab === 'map'"
            :selected-station-id="selectedStation?.id ?? null"
            @select="selectStation"
            @open-list="openList"
            @open-scanner="openScanner"
          />
          <StampCard v-else-if="activeTab === 'card'" @select-and-navigate="selectAndNavigate" />
          <RewardsList v-else />
        </Transition>
      </div>

      <!-- 底部導覽 -->
      <div class="h-20 bg-white border-t border-gray-100 flex items-center justify-around px-4 pb-[env(safe-area-inset-bottom)] shrink-0 z-30">
        <button class="flex flex-col items-center gap-1 py-1 px-6 transition-all duration-300" :class="activeTab === 'card' ? 'text-[#FF8C00] scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'" @click="activeTab = 'card'">
          <Award class="w-5 h-5" />
          <span class="text-xs font-extrabold tracking-tight">集章卡</span>
        </button>
        <button class="flex flex-col items-center gap-1 py-1 px-6 transition-all duration-300" :class="activeTab === 'map' ? 'text-[#FF8C00] scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'" @click="activeTab = 'map'">
          <MapIcon class="w-5 h-5" />
          <span class="text-xs font-extrabold tracking-tight">活動地圖</span>
        </button>
        <button class="flex flex-col items-center gap-1 py-1 px-6 transition-all duration-300" :class="activeTab === 'rewards' ? 'text-[#FF8C00] scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'" @click="activeTab = 'rewards'">
          <Gift class="w-5 h-5" />
          <span class="text-xs font-extrabold tracking-tight">獎項兌換</span>
        </button>
      </div>

      <!-- 詳情抽屜 -->
      <DetailBottomSheet
        v-if="selectedStation"
        :station="selectedStation"
        @close="selectedStation = null"
        @start-scanning="startScanning"
      />

      <!-- 清單抽屜 -->
      <ListBottomSheet
        v-if="isListSheetOpen"
        :top-offset="listSheetTop"
        @close="isListSheetOpen = false"
        @select="selectStation"
      />

      <!-- 掃碼全螢幕 -->
      <Scanner v-if="isScannerOpen" @close="isScannerOpen = false" @go-card="goCardFromScanner" />
    </template>
  </div>
</template>
