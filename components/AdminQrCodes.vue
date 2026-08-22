<script setup lang="ts">
import QRCode from 'qrcode'
import { QrCode, Download, Printer, Link as LinkIcon, Copy } from 'lucide-vue-next'
import type { AdminQrStation } from '~/stores/admin'

const admin = useAdminStore()
const { show: toast, showError } = useAdminToast()
const { public: publicConfig } = useRuntimeConfig()

// stationId → QR data URL。token 穩定不變，算過就快取
const qrMap = ref<Record<string, string>>({})

// 前後台分域時 origin 會是後台網域，故以 NUXT_PUBLIC_SITE_URL 優先
function siteBase() {
  return String(publicConfig.siteUrl || window.location.origin).replace(/\/$/, '')
}

const liffId = computed(() => String(publicConfig.liffId || ''))

// 入口連結與各點 QR 都由這裡組，只留這一份。
// 有設 LIFF ID 就編 LIFF 網址：民眾從外部瀏覽器點進來也會先過 LINE 登入，
// 章才不會因為換了瀏覽器就記到另一個身分上。沒設則退回站台網址
function appUrl(query: string) {
  return liffId.value ? `https://liff.line.me/${liffId.value}?${query}` : `${siteBase()}/?${query}`
}

// QR 編的是掃碼網址，民眾用手機內建相機掃就能開站集章
function scanUrl(token: string) {
  return appUrl(`s=${token}`)
}

// 圖文選單連結：帶 ?c= 讓前台直接載入這一檔活動，而不是預設的最新一檔。
// 這條連結是給業主貼進 LINE 官方帳號的圖文選單按鈕用的，不是給民眾掃的
//（民眾掃的是 LINE 後台提供的官方帳號 QR，加好友後才從圖文選單點進來）。
// appUrl() 可能讀 window，SSR 階段先回空字串，hydration 後才算得出來
const entryUrl = computed(() =>
  import.meta.client && admin.activeCampaignId ? appUrl(`c=${admin.activeCampaignId}`) : '',
)
const entryStatus = computed(() => admin.activeCampaign?.status ?? 'draft')

async function copyEntryUrl() {
  try {
    await navigator.clipboard.writeText(entryUrl.value)
    toast('已複製圖文選單連結')
  } catch {
    // 非 HTTPS 或瀏覽器擋下時沒有剪貼簿權限，讓使用者自己選取
    showError(null, '無法自動複製，請手動選取上方網址')
  }
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

    <!-- 圖文選單連結：貼進 LINE 官方帳號的圖文選單按鈕，民眾點了才進到「這一檔」活動 -->
    <div v-if="entryUrl" class="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-2">
      <div class="flex-1 min-w-0 flex flex-col gap-2">
        <h3 class="text-sm font-black text-gray-800 flex items-center gap-1.5">
          <LinkIcon class="w-4 h-4 text-emerald-600" />
          圖文選單連結
          <span
            class="px-2 py-0.5 rounded-full text-3xs font-bold"
            :class="
              entryStatus === 'active'
                ? 'bg-emerald-50 text-emerald-700'
                : entryStatus === 'draft'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-gray-100 text-gray-500'
            "
          >
            {{ entryStatus === 'active' ? '進行中' : entryStatus === 'draft' ? '草稿' : '已結束' }}
          </span>
        </h3>
        <p class="text-xs text-gray-400 leading-relaxed">
          連結為嵌入官方帳號圖文選單用
        </p>
        <p
          v-if="!liffId"
          class="text-2xs font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 leading-relaxed"
        >
          尚未設定 LIFF ID，目前產出的是一般網址，民眾不會經過 LINE 登入（同一個人換瀏覽器就會變成不同身分）。
        </p>
        <p
          v-if="entryStatus !== 'active'"
          class="text-2xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed"
        >
          此活動{{ entryStatus === 'draft' ? '尚未啟用' : '已結束' }}，連結可以開啟預覽，但民眾此時無法集章。貼上圖文選單前，請先把活動狀態改成「進行中」。
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
        </div>
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
    <p v-if="liffId" class="text-xs text-gray-400 leading-relaxed">
      QR 內容已改為 LINE LIFF 網址，掃到後會先經過 LINE 登入；LIFF 啟用前印製的舊 QR 需重印（站內掃描器兩種都能掃）。
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
