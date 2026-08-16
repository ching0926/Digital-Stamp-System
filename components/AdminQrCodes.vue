<script setup lang="ts">
import QRCode from 'qrcode'
import { QrCode, Download, Printer } from 'lucide-vue-next'
import type { AdminQrStation } from '~/stores/admin'

const admin = useAdminStore()
const { show: toast, showError } = useAdminToast()
const { public: publicConfig } = useRuntimeConfig()

// stationId → QR data URL。token 穩定不變，算過就快取
const qrMap = ref<Record<string, string>>({})

// QR 編的是掃碼網址，民眾用手機內建相機掃就能開站集章。
// 前後台分域時 origin 會是後台網域，故以 NUXT_PUBLIC_SITE_URL 優先
function scanUrl(token: string) {
  const base = String(publicConfig.siteUrl || window.location.origin).replace(/\/$/, '')
  return `${base}/?s=${token}`
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
        <span class="text-amber-600 font-semibold">
          QR 現在編的是掃碼網址，民眾用手機內建相機掃即可開啟集章；2026/08 之前印製的舊 QR 需重印才支援內建相機（站內掃描器仍可掃）。
        </span>
      </p>
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
          <span v-if="station.type" class="text-[10px] text-gray-400">{{ station.type }}</span>
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

    <p class="text-[11px] text-gray-400 flex items-center gap-1.5">
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
