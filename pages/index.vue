<script setup lang="ts">
import { Award, Map as MapIcon, Gift, Wifi, BatteryFull } from 'lucide-vue-next'
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

const clock = ref('--:--')
let clockTimer: ReturnType<typeof setInterval> | undefined
function updateClock() {
  clock.value = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
}

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
  if (liff.isReady() && liff.isInClient()) {
    if (liff.isLoggedIn()) {
      const idt = liff.getIdToken()
      if (idt) await user.loginWithIdToken(idt)
    } else {
      liff.login() // 導向 LINE 登入
    }
  } else if (import.meta.dev) {
    await user.devLogin()
  }
}

function manualLogin() {
  if (liff.isReady()) liff.login()
}

onMounted(async () => {
  updateClock()
  clockTimer = setInterval(updateClock, 30000)
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
onBeforeUnmount(() => clearInterval(clockTimer))
</script>

<template>
  <div class="relative min-h-screen w-full bg-[#F0F2F5] flex items-center justify-center p-0 sm:p-4 md:p-8 overflow-hidden">
    <!-- 裝飾光暈 -->
    <div class="absolute -bottom-24 -left-24 w-96 h-96 bg-[#FF8C00]/5 rounded-full blur-3xl pointer-events-none" />
    <div class="absolute top-12 left-24 w-72 h-72 bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none" />

    <div class="flex flex-col lg:flex-row items-center justify-center gap-10 relative z-10 w-full max-w-6xl">
      <!-- 手機外框 -->
      <div class="w-full h-screen sm:max-w-[390px] sm:h-[820px] bg-white sm:rounded-[48px] shadow-2xl relative overflow-hidden flex flex-col sm:border-[8px] sm:border-white ring-1 ring-black/5 shrink-0">
        <!-- 狀態列 -->
        <div class="h-9 bg-white/95 backdrop-blur-sm px-8 flex items-center justify-between shrink-0 z-30 border-b border-gray-50/50">
          <span class="text-xs font-bold text-gray-800">{{ clock }}</span>
          <div class="w-24 h-4 bg-black rounded-full absolute left-1/2 -translate-x-1/2" />
          <div class="flex items-center gap-1.5 text-gray-800">
            <Wifi class="w-3.5 h-3.5" />
            <span class="text-[9px] font-bold tracking-tight">5G</span>
            <BatteryFull class="w-4 h-4" />
          </div>
        </div>

        <!-- 載入中 -->
        <div v-if="booting" class="flex-1 flex flex-col items-center justify-center gap-4 bg-[#FAFBFB]">
          <div class="w-10 h-10 border-4 border-[#FF8C00]/20 border-t-[#FF8C00] rounded-full animate-spin" />
          <p class="text-xs text-gray-400 font-bold">載入中…</p>
        </div>

        <!-- 錯誤 -->
        <div v-else-if="bootError" class="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center bg-[#FAFBFB]">
          <p class="text-sm font-bold text-gray-700">{{ bootError }}</p>
          <p class="text-xs text-gray-400">請確認目前有進行中的活動，或稍後再試。</p>
        </div>

        <!-- 未登入 -->
        <div v-else-if="!user.isAuthenticated" class="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center bg-[#FAFBFB]">
          <div class="text-2xl font-extrabold text-gray-800">揪裡嗨 集章</div>
          <p class="text-xs text-gray-400 leading-relaxed">請透過 LINE 登入即可開始收集印章、兌換好禮。</p>
          <button class="px-6 py-3 bg-[#06C755] text-white font-bold rounded-[20px] shadow-lg active:scale-95 transition-all" @click="manualLogin">
            以 LINE 登入
          </button>
        </div>

        <!-- 主畫面 -->
        <template v-else>
          <!-- 進度浮卡（地圖分頁） -->
          <div v-if="activeTab === 'map'" class="absolute top-13 left-4 right-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-[24px] shadow-sm border border-black/5 flex flex-col gap-2">
            <div class="flex justify-between items-end">
              <span class="text-xs font-bold text-gray-800">{{ campaign.title || '集章冒險' }}進度</span>
              <span class="text-xs font-bold text-[#FF8C00]">{{ campaign.collectedCount }}/{{ campaign.totalCount }} 已收集</span>
            </div>
            <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-[#FF8C00] to-[#FFA333] transition-all duration-700 ease-out" :style="{ width: `${campaign.progressPercent}%` }" />
            </div>
          </div>

          <!-- 分頁內容 -->
          <div class="flex-1 flex flex-col relative overflow-hidden bg-[#FAFBFB]">
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
          <div class="h-20 bg-white border-t border-gray-100 flex items-center justify-around px-4 pb-2 shrink-0 z-30">
            <button class="flex flex-col items-center gap-1 py-1 px-4 transition-all duration-300" :class="activeTab === 'card' ? 'text-[#FF8C00] scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'" @click="activeTab = 'card'">
              <Award class="w-5 h-5" />
              <span class="text-[10px] font-extrabold tracking-tight">集章卡</span>
            </button>
            <button class="flex flex-col items-center gap-1 py-1 px-4 transition-all duration-300" :class="activeTab === 'map' ? 'text-[#FF8C00] scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'" @click="activeTab = 'map'">
              <MapIcon class="w-5 h-5" />
              <span class="text-[10px] font-extrabold tracking-tight">探索地圖</span>
            </button>
            <button class="flex flex-col items-center gap-1 py-1 px-4 transition-all duration-300" :class="activeTab === 'rewards' ? 'text-[#FF8C00] scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'" @click="activeTab = 'rewards'">
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
    </div>
  </div>
</template>
