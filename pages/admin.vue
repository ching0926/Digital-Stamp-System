<script setup lang="ts">
import {
  Compass,
  MapPin,
  Gift,
  QrCode,
  Image as ImageIcon,
  Lock,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-vue-next'

useHead({
  title: '營運後台 · 揪裡嗨集章',
  // 避免被搜尋引擎索引到後台頁面（僅為額外保險，非安全防護）
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

type Tab = 'home' | 'stations' | 'rewards' | 'qrcode' | 'market-map'

const admin = useAdminStore()
const { message: toastMessage, tone: toastTone, show: toast, showError } = useAdminToast()

const activeTab = ref<Tab>('home')
const menuOpen = ref(false)
const passcodeInput = ref('')
const loggingIn = ref(false)
const loginError = ref('')

onMounted(async () => {
  admin.restoreSession()
  if (admin.authed) {
    try {
      await admin.loadCampaigns()
    } catch (err) {
      showError(err, '載入活動失敗')
    }
  }
})

async function login() {
  if (!passcodeInput.value.trim()) return
  loggingIn.value = true
  loginError.value = ''
  try {
    await admin.login(passcodeInput.value)
    passcodeInput.value = ''
    toast('登入成功，歡迎回來')
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    loginError.value = e.data?.message ?? '登入失敗，請確認通行碼'
  } finally {
    loggingIn.value = false
  }
}

function logout() {
  admin.logout()
  activeTab.value = 'home'
  toast('已登出後台')
}

// 從總覽點進某活動 → 載入其內容並跳到集章點分頁
async function openCampaign(id: string) {
  try {
    await admin.selectCampaign(id)
    activeTab.value = 'stations'
    menuOpen.value = false
  } catch (err) {
    showError(err, '載入活動內容失敗')
  }
}

function backToHome() {
  activeTab.value = 'home'
  menuOpen.value = false
}

async function switchTab(tab: Tab) {
  activeTab.value = tab
  menuOpen.value = false
  if (tab === 'qrcode') {
    try {
      await admin.loadQrStations()
    } catch (err) {
      showError(err, '載入 QR 資料失敗')
    }
  }
}

// 市集平面圖分頁只在市集類型活動出現
const showMarketMapTab = computed(() => admin.activeCampaign?.type === 'market')

const tabs = computed(() => {
  const list: { key: Tab; label: string; icon: unknown }[] = [
    { key: 'stations', label: `${admin.unitLabel}管理`, icon: MapPin },
    { key: 'rewards', label: '獎項設定', icon: Gift },
    { key: 'qrcode', label: 'QR code', icon: QrCode },
  ]
  if (showMarketMapTab.value) {
    list.push({ key: 'market-map', label: '市集平面圖', icon: ImageIcon })
  }
  return list
})

// 活動被刪除或狀態改為別檔時，避免停在不存在的分頁
watch(
  () => admin.activeCampaignId,
  (id) => {
    if (!id) activeTab.value = 'home'
  },
)
watch(showMarketMapTab, (show) => {
  if (!show && activeTab.value === 'market-map') activeTab.value = 'stations'
})
</script>

<template>
  <div class="h-[100dvh] bg-gray-50 text-gray-800 flex flex-col overflow-hidden">
    <!-- 通行碼 gate -->
    <div v-if="!admin.authed" class="flex-1 flex items-center justify-center p-6">
      <form
        class="w-full max-w-sm bg-white rounded-3xl shadow-xl p-7 flex flex-col gap-5"
        @submit.prevent="login"
      >
        <div class="flex flex-col items-center gap-3">
          <div class="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <Lock class="w-7 h-7 text-emerald-600" />
          </div>
          <div class="text-center">
            <h1 class="text-lg font-black">揪裡嗨 營運後台</h1>
            <p class="text-xs text-gray-400 mt-1">請輸入管理員通行碼</p>
          </div>
        </div>

        <input
          v-model="passcodeInput"
          type="password"
          autocomplete="current-password"
          placeholder="管理員通行碼"
          class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
        />

        <p v-if="loginError" class="text-xs text-red-500 -mt-2">{{ loginError }}</p>

        <button
          type="submit"
          :disabled="loggingIn || !passcodeInput.trim()"
          class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl text-sm transition-colors"
        >
          {{ loggingIn ? '驗證中…' : '進入後台' }}
        </button>
      </form>
    </div>

    <!-- 後台主體 -->
    <template v-else>
      <!-- 頂部列 -->
      <header
        class="h-14 shrink-0 bg-white border-b border-gray-100 flex items-center justify-between px-4 gap-3"
      >
        <div class="flex items-center gap-2 min-w-0">
          <button
            v-if="activeTab !== 'home'"
            class="sm:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            @click="menuOpen = true"
          >
            <Menu class="w-5 h-5" />
          </button>
          <span class="font-black text-sm shrink-0">揪裡嗨 後台</span>
          <span v-if="admin.activeCampaign && activeTab !== 'home'" class="text-gray-300">/</span>
          <span
            v-if="admin.activeCampaign && activeTab !== 'home'"
            class="text-xs text-gray-500 truncate"
          >
            {{ admin.activeCampaign.title }}
          </span>
        </div>

        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
          @click="logout"
        >
          <LogOut class="w-4 h-4" />
          <span class="hidden sm:inline">登出</span>
        </button>
      </header>

      <div class="flex-1 flex min-h-0">
        <!-- 側邊選單（桌機；管理某活動時才顯示） -->
        <aside
          v-if="activeTab !== 'home'"
          class="hidden sm:flex w-52 shrink-0 bg-white border-r border-gray-100 flex-col p-3 gap-1"
        >
          <button
            class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
            @click="backToHome"
          >
            <ChevronLeft class="w-4 h-4" />
            回活動總覽
          </button>
          <div class="h-px bg-gray-100 my-1" />
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors"
            :class="
              activeTab === tab.key
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-500 hover:bg-gray-50'
            "
            @click="switchTab(tab.key)"
          >
            <component
              :is="tab.icon"
              class="w-4 h-4"
              :class="activeTab === tab.key ? 'text-emerald-500' : ''"
            />
            {{ tab.label }}
          </button>
        </aside>

        <!-- 手機側邊抽屜 -->
        <div v-if="menuOpen" class="sm:hidden fixed inset-0 z-40 flex">
          <div class="absolute inset-0 bg-black/40" @click="menuOpen = false" />
          <nav class="relative w-60 bg-white h-full p-3 flex flex-col gap-1 shadow-xl">
            <div class="flex items-center justify-between px-2 py-2">
              <span class="text-xs font-black text-gray-700">選單</span>
              <button class="p-1 text-gray-400" @click="menuOpen = false">
                <X class="w-4 h-4" />
              </button>
            </div>
            <button
              class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
              @click="backToHome"
            >
              <ChevronLeft class="w-4 h-4" />
              回活動總覽
            </button>
            <div class="h-px bg-gray-100 my-1" />
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors"
              :class="
                activeTab === tab.key
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-500 hover:bg-gray-50'
              "
              @click="switchTab(tab.key)"
            >
              <component
                :is="tab.icon"
                class="w-4 h-4"
                :class="activeTab === tab.key ? 'text-emerald-500' : ''"
              />
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <!-- 工作區 -->
        <main class="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0">
          <AdminCampaigns v-if="activeTab === 'home'" @open="openCampaign" />
          <AdminStations v-else-if="activeTab === 'stations'" />
          <AdminRewards v-else-if="activeTab === 'rewards'" />
          <AdminQrCodes v-else-if="activeTab === 'qrcode'" />
          <AdminMarketMap v-else-if="activeTab === 'market-map'" />
        </main>
      </div>
    </template>

    <!-- Toast -->
    <div
      v-if="toastMessage"
      class="fixed top-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-xs font-bold text-white max-w-[90vw]"
      :class="toastTone === 'error' ? 'bg-red-500' : 'bg-emerald-600'"
    >
      <component
        :is="toastTone === 'error' ? AlertTriangle : CheckCircle2"
        class="w-4 h-4 shrink-0"
      />
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>
