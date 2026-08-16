<script setup lang="ts">
import { GoogleMap, CustomMarker } from 'vue3-google-map'
import { MapPin, Link2, X } from 'lucide-vue-next'

const props = defineProps<{ lat: number; lng: number }>()
const emit = defineEmits<{ confirm: [{ lat: number; lng: number }]; cancel: [] }>()

const admin = useAdminStore()
const apiKey = useRuntimeConfig().public.googleMapsApiKey as string

// 座標為 0 表示還沒設過，退回加蚋仔一帶（與 AdminStations 表單預設值一致）
const FALLBACK = { lat: 25.028, lng: 121.5 }
const picked = ref({
  lat: props.lat || FALLBACK.lat,
  lng: props.lng || FALLBACK.lng,
})

const mapRef = ref()
const linkInput = ref('')
const resolving = ref(false)
const linkError = ref('')
const linkOk = ref('')

function movePin(pos: { lat: number; lng: number }) {
  picked.value = pos
  mapRef.value?.map?.panTo(pos)
}

// vue3-google-map 會把 map 的原生事件轉發出來，click 的 payload 是 MapMouseEvent
function onMapClick(e: { latLng?: { lat: () => number; lng: () => number } }) {
  if (!e?.latLng) return
  picked.value = { lat: e.latLng.lat(), lng: e.latLng.lng() }
}

// 保險：某些版本不轉發 click，改直接掛在 map 實例上（重複掛不會有副作用，
// 因為兩條路徑寫的是同一個 picked）
watch(
  () => mapRef.value?.ready,
  (ready) => {
    if (!ready) return
    mapRef.value?.map?.addListener('click', onMapClick)
  },
)

// 貼上的連結交給後端展開＋解析：手機分享的是 maps.app.goo.gl 短網址，前端展不開
async function resolveLink() {
  const url = linkInput.value.trim()
  if (!url) return
  resolving.value = true
  linkError.value = ''
  linkOk.value = ''
  try {
    const res = await admin.request<{ lat: number; lng: number }>('/api/admin/resolve-map-link', {
      method: 'POST',
      body: { url },
    })
    movePin({ lat: res.lat, lng: res.lng })
    linkOk.value = '已定位到連結中的座標，請在地圖上確認位置'
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusMessage?: string }
    linkError.value = e.data?.message ?? e.statusMessage ?? '解析失敗，請改用地圖點選'
  } finally {
    resolving.value = false
  }
}

const display = computed(() => ({
  lat: picked.value.lat.toFixed(6),
  lng: picked.value.lng.toFixed(6),
}))
</script>

<template>
  <!-- z-[60]：要蓋過 AdminModal(z-50) 的編輯表單，但別擋到 toast(z-[70]) -->
  <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-6">
    <div class="bg-white w-full sm:max-w-6xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[94dvh] sm:h-[90dvh]">
      <div class="flex items-start justify-between gap-4 p-5 border-b border-gray-100 shrink-0">
        <div>
          <h3 class="text-base font-black text-gray-800">設定座標</h3>
          <p class="text-xs text-gray-400 mt-0.5">貼上 Google 地圖連結，或直接在地圖上點選位置</p>
        </div>
        <button
          type="button"
          class="p-1.5 -m-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          @click="emit('cancel')"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- min-h-0 是必要的：沒有它，地圖的 flex-1 撐不開 -->
      <div class="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-3">
        <!-- 方式一：貼連結 -->
        <div class="flex flex-col gap-1.5 shrink-0">
          <span class="text-xs font-bold text-gray-600 flex items-center gap-1.5">
            <Link2 class="w-4 h-4 text-emerald-600" />
            貼上 Google 地圖連結
          </span>
          <div class="flex gap-2">
            <input
              v-model="linkInput"
              placeholder="https://maps.app.goo.gl/… 或 https://www.google.com/maps/place/…"
              class="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
              @keyup.enter.prevent="resolveLink"
            />
            <button
              type="button"
              class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-40 shrink-0"
              :disabled="resolving || !linkInput.trim()"
              @click="resolveLink"
            >
              {{ resolving ? '解析中…' : '解析' }}
            </button>
          </div>
          <p v-if="linkError" class="text-2xs text-red-500 font-bold">{{ linkError }}</p>
          <p v-else-if="linkOk" class="text-2xs text-emerald-600 font-bold">{{ linkOk }}</p>
          <p v-else class="text-2xs text-gray-400">
            手機在 Google 地圖按「分享」複製的短連結也可以。
          </p>
        </div>

        <!-- 方式二：點地圖 -->
        <ClientOnly>
          <div v-if="!apiKey" class="flex-1 min-h-[440px] rounded-2xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 text-center p-6">
            <MapPin class="w-8 h-8 text-gray-300" />
            <p class="text-xs font-bold text-gray-500">尚未設定 Google Maps API key</p>
            <p class="text-2xs text-gray-400">請在 <code class="font-mono">.env</code> 填入 NUXT_PUBLIC_GOOGLE_MAPS_API_KEY，或改用上方貼連結。</p>
          </div>
          <!-- 地圖優先佔空間：高螢幕由 flex-1 撐大，矮螢幕保底 440px 讓內容區往下捲，
               不要為了塞進視窗把地圖壓小 -->
          <div v-else class="flex-1 min-h-[440px] rounded-2xl overflow-hidden border border-gray-100">
            <GoogleMap
              ref="mapRef"
              :api-key="apiKey"
              :center="picked"
              :zoom="16"
              :disable-default-ui="true"
              :zoom-control="true"
              style="width: 100%; height: 100%"
              @click="onMapClick"
            >
              <CustomMarker :options="{ position: picked, anchorPoint: 'BOTTOM_CENTER' }">
                <div class="flex flex-col items-center -translate-y-1">
                  <div class="w-8 h-8 rounded-full bg-[#FF8C00] border-2 border-white shadow-lg flex items-center justify-center">
                    <MapPin class="w-4 h-4 text-white" />
                  </div>
                </div>
              </CustomMarker>
            </GoogleMap>
          </div>
        </ClientOnly>

        <p class="text-2xs text-gray-400 shrink-0">在地圖上點一下即可把圖釘移到該位置。</p>

        <div class="grid grid-cols-2 gap-3 shrink-0">
          <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl">
            <span class="text-2xs font-bold text-gray-500 shrink-0">緯度</span>
            <span class="text-sm font-mono text-gray-700 truncate">{{ display.lat }}</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl">
            <span class="text-2xs font-bold text-gray-500 shrink-0">經度</span>
            <span class="text-sm font-mono text-gray-700 truncate">{{ display.lng }}</span>
          </div>
        </div>
      </div>

      <div class="p-5 border-t border-gray-100 shrink-0 flex gap-3">
        <button
          type="button"
          class="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-sm transition-colors"
          @click="emit('cancel')"
        >
          取消
        </button>
        <button
          type="button"
          class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors"
          @click="emit('confirm', { lat: picked.lat, lng: picked.lng })"
        >
          使用這個座標
        </button>
      </div>
    </div>
  </div>
</template>
