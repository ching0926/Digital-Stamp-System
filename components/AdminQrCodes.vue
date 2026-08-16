<script setup lang="ts">
import QRCode from 'qrcode'
import { QrCode, Download, Printer, Link as LinkIcon, Copy } from 'lucide-vue-next'
import type { AdminQrStation } from '~/stores/admin'

const admin = useAdminStore()
const { show: toast, showError } = useAdminToast()
const { public: publicConfig } = useRuntimeConfig()

// stationId → QR data URL。token 穩定不變，算過就快取
const qrMap = ref<Record<string, string>>({})

// 前後台分域時 origin 會是後台網域，故以 NUXT_PUBLIC_SITE_URL 優先。
// 入口連結與各點 QR 都靠它組網址，只留這一份
function siteBase() {
  return String(publicConfig.siteUrl || window.location.origin).replace(/\/$/, '')
}

// QR 編的是掃碼網址，民眾用手機內建相機掃就能開站集章
function scanUrl(token: string) {
  return `${siteBase()}/?s=${token}`
}

// 活動入口連結：帶 ?c= 讓前台直接載入這一檔活動，而不是預設的最新一檔。
// siteBase() 會讀 window，SSR 階段先回空字串，hydration 後才算得出來
const entryUrl = computed(() =>
  import.meta.client && admin.activeCampaignId ? `${siteBase()}/?c=${admin.activeCampaignId}` : '',
)
const entryQr = ref('')

async function renderEntryQr() {
  entryQr.value = entryUrl.value
    ? await QRCode.toDataURL(entryUrl.value, { margin: 1, width: 320 })
    : ''
}

async function copyEntryUrl() {
  try {
    await navigator.clipboard.writeText(entryUrl.value)
    toast('已複製活動入口連結')
  } catch {
    // 非 HTTPS 或瀏覽器擋下時沒有剪貼簿權限，讓使用者自己選取
    showError(null, '無法自動複製，請手動選取上方網址')
  }
}

function downloadEntryQr() {
  if (!entryQr.value) return
  const a = document.createElement('a')
  a.href = entryQr.value
  a.download = `entry-${admin.activeCampaign?.title || 'campaign'}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

async function renderAll() {
  const entries = await Promise.all(
    admin.qrStations
      .filter((s) => !s.noStamp && !qrMap.value[s.id])
      .map(
        async (s) =>
          [s.id, await QRCode.toDataURL(scanUrl(s.token), { margin: 1, width: 320 })] as const,
      ),
  )
  for (const [id, url] of entries) qrMap.value[id] = url
}

onMounted(renderAll)
watch(() => admin.qrStations, renderAll, { deep: true })
// 切換活動時入口連結會變，QR 要跟著重畫
watch(entryUrl, renderEntryQr, { immediate: true })

function download(station: AdminQrStation) {
  const url = qrMap.value[station.id]
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = `qrcode-${station.name}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// 開關集章功能。走 updateStation，store 會同步更新兩份清單
const toggling = ref('')
async function toggleStamp(station: AdminQrStation) {
  toggling.value = station.id
  try {
    await admin.updateStation(station.id, { noStamp: !station.noStamp })
    toast(station.noStamp ? `已開啟 ${station.name} 集章功能` : `已關閉 ${station.name} 集章功能`)
    await renderAll()
  } catch (err) {
    showError(err)
  } finally {
    toggling.value = ''
  }
}

const confirmTarget = ref<AdminQrStation | null>(null)

function doToggle() {
  const target = confirmTarget.value
  confirmTarget.value = null
  if (target) toggleStamp(target)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div>
      <h2 class="text-xl font-black tracking-tight flex items-center gap-2">
        <QrCode class="w-5 h-5 text-emerald-600" />
        QR code 下載
      </h2>
      <p class="text-xs text-gray-400 mt-1">
        下載後列印張貼於各{{ admin.unitLabel }}，供民眾掃描集章。QR 內容固定不變，可長期使用。
      </p>
    </div>

    <!-- 活動入口：給別人連結或掃碼直接進到「這一檔」活動的前台 -->
    <div v-if="entryUrl" class="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col sm:flex-row gap-5">
      <div class="flex-1 min-w-0 flex flex-col gap-2">
        <h3 class="text-sm font-black text-gray-800 flex items-center gap-1.5">
          <LinkIcon class="w-4 h-4 text-emerald-600" />
          活動入口
        </h3>
        <p class="text-xs text-gray-400 leading-relaxed">
          分享這個連結或 QR，對方開啟後會直接進入「{{ admin.activeCampaign?.title }}」的前台，不受目前預設活動影響。
        </p>
        <p class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 break-all select-all">
          {{ entryUrl }}
        </p>
        <div class="flex gap-2">
          <button
            class="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition-colors"
            @click="copyEntryUrl"
          >
            <Copy class="w-4 h-4" />
            複製連結
          </button>
          <button
            class="flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-xl text-xs transition-colors"
            @click="downloadEntryQr"
          >
            <Download class="w-4 h-4" />
            下載 QR
          </button>
        </div>
      </div>
      <div class="shrink-0 self-center p-3 bg-white rounded-xl border border-gray-100">
        <img v-if="entryQr" :src="entryQr" alt="活動入口 QR" class="w-32 h-32" />
        <div v-else class="w-32 h-32 bg-gray-50 animate-pulse rounded" />
      </div>
    </div>

    <p
      v-if="admin.qrStations.length === 0"
      class="bg-white rounded-2xl border border-gray-100 p-10 text-center text-xs text-gray-400"
    >
      此活動尚無{{ admin.unitLabel }}。
    </p>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="station in admin.qrStations"
        :key="station.id"
        class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-4"
      >
        <div class="text-center">
          <h4 class="text-sm font-black text-gray-800">{{ station.name }}</h4>
          <span v-if="station.type" class="text-2xs text-gray-400">{{ station.type }}</span>
        </div>

        <template v-if="station.noStamp">
          <div
            class="flex-1 flex flex-col items-center justify-center gap-3 w-full h-[184px] bg-gray-50 rounded-xl border border-dashed border-gray-200 p-4"
          >
            <span class="text-xs text-gray-500 font-bold">此點目前僅展示</span>
            <button
              :disabled="toggling === station.id"
              class="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 disabled:opacity-50 text-emerald-700 text-xs font-bold rounded-xl transition-colors"
              @click="confirmTarget = station"
            >
              開啟為集章點位
            </button>
          </div>
        </template>

        <template v-else>
          <div class="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
            <img
              v-if="qrMap[station.id]"
              :src="qrMap[station.id]"
              :alt="`${station.name} QR`"
              class="w-40 h-40"
            />
            <div v-else class="w-40 h-40 bg-gray-50 animate-pulse rounded" />
          </div>

          <div class="flex gap-2 w-full">
            <button
              class="flex items-center justify-center gap-1.5 flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition-colors"
              @click="download(station)"
            >
              <Download class="w-4 h-4" />
              下載圖片
            </button>
            <button
              :disabled="toggling === station.id"
              class="px-3 py-2 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 disabled:opacity-50 font-bold rounded-xl text-xs transition-colors"
              title="關閉集章功能"
              @click="confirmTarget = station"
            >
              關閉
            </button>
          </div>
        </template>
      </div>
    </div>

    <p class="text-xs text-gray-400 flex items-center gap-1.5">
      <Printer class="w-3.5 h-3.5" />
      也可用 npm run qrsheet 產生一張含全部 QR 的列印表。
    </p>

    <AdminConfirm
      v-if="confirmTarget"
      :message="
        confirmTarget.noStamp
          ? `是否開啟「${confirmTarget.name}」為集章點位？開啟後前台即可掃碼集章。`
          : `是否關閉「${confirmTarget.name}」的集章功能？關閉後既有 QR 將無法集章。`
      "
      :confirm-label="confirmTarget.noStamp ? '開啟集章' : '關閉集章'"
      @confirm="doToggle"
      @cancel="confirmTarget = null"
    />
  </div>
</template>
