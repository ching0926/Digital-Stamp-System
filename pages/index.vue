<script setup lang="ts">
import { Award, Map as MapIcon, Gift } from 'lucide-vue-next'
import type { Station } from '~/stores/campaign'

const user = useUserStore()
const campaign = useCampaignStore()
const liff = useLiff()

type Tab = 'map' | 'card' | 'rewards'
const activeTab = ref<Tab>('map')
const selectedStation = ref<Station | null>(null)
const isListSheetOpen = ref(false)
const isScannerOpen = ref(false)
const activeScanStationId = ref<string | null>(null)
const booting = ref(true)
const bootError = ref<string | null>(null)

function selectStation(s: Station) {
  selectedStation.value = s
}
function openScanner(id: string | null) {
  activeScanStationId.value = id
  isScannerOpen.value = true
}
function selectAndNavigate(s: Station) {
  selectedStation.value = s
  activeTab.value = 'map'
}
function startScanning(id: string) {
  selectedStation.value = null
  openScanner(id)
}

async function ensureAuth() {
  await user.fetchMe()
  if (user.isAuthenticated) return
  if (liff.isReady() && liff.isLoggedIn()) {
    // 已透過 LINE 登入（LINE App 內，或外部瀏覽器登入導回後）
    const idt = liff.getIdToken()
    if (idt) await user.loginWithIdToken(idt)
  } else if (liff.isReady() && liff.isInClient()) {
    liff.login() // LINE App 內尚未登入 → 自動導向
  } else if (import.meta.dev) {
    await user.devLogin()
  }
  // 外部瀏覽器且未登入 → 顯示「以 LINE 登入」按鈕（manualLogin → liff.login()）
}

function manualLogin() {
  if (liff.isReady()) liff.login()
}

onMounted(async () => {
  try {
    await ensureAuth()
    await campaign.load()
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusMessage?: string }
    bootError.value = e.data?.message ?? e.statusMessage ?? '載入失敗，請稍後再試'
  } finally {
    booting.value = false
  }
})
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

    <!-- 未登入 -->
    <div v-else-if="!user.isAuthenticated" class="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
      <div class="text-2xl font-extrabold text-gray-800">揪裡嗨 集章</div>
      <p class="text-xs text-gray-400 leading-relaxed max-w-xs">請透過 LINE 登入即可開始收集印章、兌換好禮。</p>
      <button class="px-6 py-3 bg-[#06C755] text-white font-bold rounded-[20px] shadow-lg active:scale-95 transition-all" @click="manualLogin">
        以 LINE 登入
      </button>
    </div>

    <!-- 主畫面 -->
    <template v-else>
      <!-- 進度浮卡（地圖分頁）-->
      <div v-if="activeTab === 'map'" class="absolute top-4 left-4 right-4 z-20 mx-auto max-w-2xl bg-white/95 backdrop-blur-md p-4 rounded-[24px] shadow-sm border border-black/5 flex flex-col gap-2">
        <div class="flex justify-between items-end">
          <span class="text-xs font-bold text-gray-800">{{ campaign.title || '集章冒險' }}進度</span>
          <span class="text-xs font-bold text-[#FF8C00]">{{ campaign.collectedCount }}/{{ campaign.totalCount }} 已收集</span>
        </div>
        <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-[#FF8C00] to-[#FFA333] transition-all duration-700 ease-out" :style="{ width: `${campaign.progressPercent}%` }" />
        </div>
      </div>

      <!-- 分頁內容 -->
      <div class="flex-1 flex flex-col relative overflow-hidden">
        <Transition mode="out-in" enter-active-class="transition duration-200" enter-from-class="opacity-0 translate-y-2" leave-active-class="transition duration-150" leave-to-class="opacity-0 -translate-y-2">
          <MapView
            v-if="activeTab === 'map'"
            :selected-station-id="selectedStation?.id ?? null"
            @select="selectStation"
            @open-list="isListSheetOpen = true"
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
          <span class="text-[10px] font-extrabold tracking-tight">集章卡</span>
        </button>
        <button class="flex flex-col items-center gap-1 py-1 px-6 transition-all duration-300" :class="activeTab === 'map' ? 'text-[#FF8C00] scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'" @click="activeTab = 'map'">
          <MapIcon class="w-5 h-5" />
          <span class="text-[10px] font-extrabold tracking-tight">探索地圖</span>
        </button>
        <button class="flex flex-col items-center gap-1 py-1 px-6 transition-all duration-300" :class="activeTab === 'rewards' ? 'text-[#FF8C00] scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'" @click="activeTab = 'rewards'">
          <Gift class="w-5 h-5" />
          <span class="text-[10px] font-extrabold tracking-tight">獎項兌換</span>
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
      <ListBottomSheet v-if="isListSheetOpen" @close="isListSheetOpen = false" @select="selectStation" />

      <!-- 掃碼全螢幕 -->
      <Scanner v-if="isScannerOpen" :active-scan-station-id="activeScanStationId" @close="isScannerOpen = false; activeScanStationId = null" />
    </template>
  </div>
</template>
