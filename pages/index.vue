<script setup lang="ts">
import { Award, Map as MapIcon, Gift, CheckCircle, Info, XCircle, X, AlertTriangle } from 'lucide-vue-next'
import type { Station } from '~/stores/campaign'
import type { ScanTarget } from '~/utils/scanTarget'

const user = useUserStore()
const campaign = useCampaignStore()

type Tab = 'map' | 'card' | 'rewards'
const activeTab = ref<Tab>('map')
const selectedStation = ref<Station | null>(null)
const isListSheetOpen = ref(false)
const isScannerOpen = ref(false)
const booting = ref(true)
const bootError = ref<string | null>(null)

// `?debug=1` 的診斷面板用。bootUrl 要在 clearQuery() 之前留一份，否則就看不到原始參數了
const debugMode = ref(false)
const debugTarget = ref<ScanTarget | null>(null)
const bootUrl = ref('')

// 進度浮卡的實際位置，用來決定清單抽屜要展開到哪
const progressCardEl = ref<HTMLElement | null>(null)
const listSheetTop = ref(108)

// 掃碼後的結果橫幅。note 放「已切換至某某活動」這類附註
const scanBanner = ref<{ tone: 'success' | 'info' | 'error'; text: string; note?: string } | null>(null)
let bannerTimer: ReturnType<typeof setTimeout> | undefined

function showScanBanner(tone: 'success' | 'info' | 'error', text: string, note?: string) {
  scanBanner.value = { tone, text, note }
  clearTimeout(bannerTimer)
  bannerTimer = setTimeout(() => (scanBanner.value = null), 5000)
}

// 掃碼換了活動就講一聲：地圖整個變樣、進度歸零，不說民眾會以為自己的章不見了
function switchNote(): string | undefined {
  const title = campaign.consumeSwitchNotice()
  return title ? `已切換至「${title}」` : undefined
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
// 站內掃到別檔活動的 QR 時，切換提示會被全螢幕掃描畫面蓋住，關掉才補跳
function flushSwitchNotice() {
  const note = switchNote()
  if (note) showScanBanner('info', note)
}
// 掃到章之後從結果畫面跳去集章卡
function goCardFromScanner() {
  isScannerOpen.value = false
  activeTab.value = 'card'
  flushSwitchNotice()
}
function closeScanner() {
  isScannerOpen.value = false
  flushSwitchNotice()
}

// 清掉網址上的 `?c=` / `?s=`，避免重新整理又重送一次。
// 不用 router.replace：LIFF 還原參數時繞過了 vue-router，router 認知的網址已經對不上
function clearQuery() {
  window.history.replaceState(window.history.state, '', window.location.pathname)
}

async function ensureAuth() {
  await user.fetchMe()
  const idToken = await useLiffIdToken() // 未登入時可能整頁導去 LINE 登入，不會 resolve

  // 有 LINE 身分就一律送出：確保 session 對到的是這個 LINE 帳號（換瀏覽器時 cookie 可能
  // 還指著另一個匿名身分），順便更新暱稱與頭像。
  // 但 LINE 驗證失敗（後端回 401）不可以炸掉整個開站流程——那會讓畫面變成一片錯誤訊息，
  // 連掃碼集章都輪不到執行。跟 useLiff 一樣的哲學：拿不到 LINE 身分就退回匿名
  if (idToken) {
    try {
      await user.login(idToken)
      return
    } catch (err) {
      console.warn('[liff] LINE 身分登入失敗，改用匿名身分', err)
    }
  }
  if (!user.isAuthenticated) await user.login()
}

// 從 LINE／LIFF 導進來的跡象。用來分辨「使用者自己開首頁」與「掃碼進來但參數掉了」，
// 後者一定要給訊息，否則就是使用者回報的那種「完全沒反應」
function looksLikeLineArrival(): boolean {
  if (/[?&]liff\./.test(window.location.search)) return true
  try {
    const host = new URL(document.referrer).hostname
    // 完全相等或為其子網域，不用裸 endsWith（`evilline.me` 會過關）
    return host === 'line.me' || host.endsWith('.line.me')
  } catch {
    return false // 沒有 referrer
  }
}

// 用手機內建相機掃 QR 會直接開 `?s=<token>`，落地後自動集章並停在集章卡。
// collect() 會順便把活動切成這張 QR 所屬的那一檔（成功或失敗都切）
async function collectFromUrl(token: string) {
  activeTab.value = 'card'

  try {
    const res = await campaign.collect(token, await getStampGeo())
    const note = switchNote()
    if (res.alreadyCollected) {
      showScanBanner('info', `${res.stationName}：這個章你已經收集過了`, note)
    } else {
      showScanBanner('success', `集章成功！${res.stationName}`, note)
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
    }
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusMessage?: string }
    showScanBanner('error', e.data?.message ?? e.statusMessage ?? '集章失敗，請再試一次', switchNote())
  }
}

onMounted(async () => {
  // 進站的第一件事：記下網址、解析、存起來。
  // 下面的 ensureAuth() 可能整頁導去 LINE 登入（外部瀏覽器未登入時必定發生），
  // 導回來時網址上的 `?s=` / `?c=` 可能就沒了。順序反過來就永遠救不回來
  bootUrl.value = window.location.href
  debugMode.value = new URLSearchParams(window.location.search).get('debug') === '1'
  recordBoot(window.location.href)
  const early = parseScanQuery(window.location.search)
  if (early) stashScanTarget(early)

  try {
    await ensureAuth()
    // 一律取走暫存（就算這次用不到），避免殘留在下次進站時誤觸發集章。
    // 網址上還讀得到就以網址為準——LIFF 會在 init 後把 `liff.state` 還原成真正的
    // `?c=` / `?s=`，用的是 history.replaceState，vue-router 收不到通知
    const stashed = takeScanTarget()
    const target = parseScanQuery(window.location.search) ?? stashed
    debugTarget.value = target
    // 參數留在網址上，重新整理會再送一次，先清掉
    if (target) clearQuery()

    if (target?.kind === 'stamp') {
      // 先集章、由回應決定載哪一檔活動。反過來先 load() 的話會先閃一次上次看的
      // 活動，還多打一次 campaign/current
      await collectFromUrl(target.token)
    } else if (target?.kind === 'entry') {
      // `?c=<campaignId>` 是後台產的活動入口連結，一律用 preview 載入：
      // 草稿才預覽得到、已結束的舊連結也才會顯示「已結束」而不是默默換成另一檔活動
      await campaign.load(target.campaignId, { preview: true })
    } else if (looksLikeLineArrival()) {
      // 從 LINE 進來卻解不出目標＝參數在導轉途中掉了。這裡絕不能靜默 return，
      // 否則使用者看到的就是「掃了完全沒反應」，連哪裡出錯都無從得知。
      // 用詞要讓「不是來集章的人」看了也不突兀（例如從 OA 圖文選單點進來）
      showScanBanner('info', '若你剛才是掃描攤位 QR，這次沒有讀到集章資訊，請用下方的「掃描集章」再掃一次')
    }
    // 沒帶參數，或帶的參數集章失敗（QR 驗證失敗等）而沒載到任何活動時，退回上次看的那一檔
    if (!campaign.loaded) await campaign.load()
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
      <!-- 非進行中的活動（由入口連結預覽草稿／已結束）。貼頂常駐，
           z-30 壓過進度浮卡(z-20)但讓詳情抽屜(z-40+)蓋得住 -->
      <div
        v-if="campaign.isPreview"
        class="absolute top-0 inset-x-0 z-30 px-4 py-2 flex items-center justify-center gap-2 text-white text-2xs font-bold"
        :class="campaign.campaignStatus === 'ended' ? 'bg-gray-600' : 'bg-amber-500'"
      >
        <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
        <span>{{ campaign.campaignStatus === 'ended' ? '這個活動已經結束' : '預覽中・活動尚未開始，此時無法集章' }}</span>
      </div>

      <!-- 進度浮卡（地圖分頁）。預覽橫幅在時往下讓位 -->
      <div v-if="activeTab === 'map'" ref="progressCardEl" class="absolute left-4 right-4 z-20 mx-auto max-w-2xl bg-white/95 backdrop-blur-md p-4 rounded-[24px] shadow-sm border border-black/5 flex flex-col gap-2" :class="campaign.isPreview ? 'top-12' : 'top-4'">
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
          v-if="scanBanner"
          class="absolute left-4 right-4 z-40 mx-auto max-w-2xl flex items-center gap-3 p-4 rounded-[24px] shadow-lg text-white"
          :class="[
            scanBanner.tone === 'success' ? 'bg-[#10B981]' : scanBanner.tone === 'info' ? 'bg-[#FF8C00]' : 'bg-red-500',
            campaign.isPreview ? 'top-12' : 'top-4',
          ]"
        >
          <component
            :is="scanBanner.tone === 'success' ? CheckCircle : scanBanner.tone === 'info' ? Info : XCircle"
            class="w-6 h-6 shrink-0"
          />
          <div class="flex-1">
            <p class="text-sm font-bold tracking-tight">{{ scanBanner.text }}</p>
            <p v-if="scanBanner.note" class="text-2xs font-bold text-white/85 mt-0.5">{{ scanBanner.note }}</p>
          </div>
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
      <Scanner v-if="isScannerOpen" @close="closeScanner" @go-card="goCardFromScanner" />
    </template>

    <!-- `?debug=1` 診斷面板。放在 v-else 之外，開站失敗時才也看得到 -->
    <DebugPanel v-if="debugMode" :target="debugTarget" :boot-url="bootUrl" />
  </div>
</template>
