<script setup lang="ts">
import { GoogleMap, CustomMarker } from 'vue3-google-map'
import { List, MapPin, Star, Leaf, QrCode, LocateFixed } from 'lucide-vue-next'
import type { Station } from '~/stores/campaign'

const props = defineProps<{ selectedStationId: string | null }>()

const emit = defineEmits<{
  select: [station: Station]
  openList: []
  openScanner: [stationId: string | null]
}>()

const campaign = useCampaignStore()
const apiKey = useRuntimeConfig().public.googleMapsApiKey as string

// 預設中心：各集章點 geo 平均值，退回加蚋仔中心
const defaultCenter = computed(() => {
  const pts = campaign.stations.filter((s) => s.geo?.lat && s.geo?.lng)
  if (!pts.length) return { lat: 25.0264, lng: 121.4988 }
  return {
    lat: pts.reduce((a, s) => a + s.geo.lat, 0) / pts.length,
    lng: pts.reduce((a, s) => a + s.geo.lng, 0) / pts.length,
  }
})

// GoogleMap 元件 ref（曝露 { ready, map, api }）；map 型別較複雜，用寬鬆型別存取即可
const mapRef = ref()
const userPos = ref<{ lat: number; lng: number } | null>(null)

function panTo(pos: { lat: number; lng: number }) {
  mapRef.value?.map?.panTo(pos)
}

// 取得使用者定位（pan=true 時順便移動地圖中心）
function fetchUserPos(pan = false) {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    (p) => {
      userPos.value = { lat: p.coords.latitude, lng: p.coords.longitude }
      if (pan) panTo(userPos.value)
    },
    () => {
      /* 拒絕或非安全環境（http）→ 僅維持活動中心 */
    },
    { enableHighAccuracy: true, timeout: 6000 },
  )
}

onMounted(() => fetchUserPos(false)) // 開場只取位置顯示藍點，不移動中心（保持集章點可見）

watch(
  () => props.selectedStationId,
  (id) => {
    if (!id) return
    const loc = campaign.stations.find((l) => l.id === id)
    if (loc?.geo) panTo(loc.geo)
  },
)
</script>

<template>
  <div class="relative w-full h-full bg-[#F4F6F4]">
    <ClientOnly>
      <!-- 未設定 API key 的友善提示 -->
      <div v-if="!apiKey" class="w-full h-full flex flex-col items-center justify-center p-8 text-center gap-2">
        <MapPin class="w-10 h-10 text-gray-300" />
        <p class="text-sm font-bold text-gray-500">尚未設定 Google Maps API key</p>
        <p class="text-xs text-gray-400 leading-relaxed">請在 <code class="font-mono">.env</code> 填入<br>NUXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
      </div>

      <GoogleMap
        v-else
        ref="mapRef"
        :api-key="apiKey"
        :center="defaultCenter"
        :zoom="16"
        :clickable-icons="false"
        :street-view-control="false"
        :map-type-control="false"
        :fullscreen-control="false"
        style="width: 100%; height: 100%"
      >
        <!-- 使用者位置藍點 -->
        <CustomMarker v-if="userPos" :options="{ position: userPos, anchorPoint: 'CENTER' }">
          <div class="relative w-4 h-4">
            <div class="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
            <div class="absolute inset-0 rounded-full bg-blue-500 border-2 border-white shadow-md" />
          </div>
        </CustomMarker>

        <!-- 集章點彩色圖釘 -->
        <CustomMarker
          v-for="loc in campaign.stations"
          :key="loc.id"
          :options="{ position: loc.geo, anchorPoint: 'BOTTOM_CENTER' }"
        >
          <div class="cursor-pointer flex flex-col items-center" @click="emit('select', loc)">
            <div class="relative">
              <div
                v-if="selectedStationId === loc.id"
                class="absolute -inset-1 rounded-full bg-[#FF8C00]/25 animate-ping"
              />
              <div
                class="relative w-10 h-10 rounded-[24px] flex items-center justify-center border-2 shadow-lg transition-transform duration-300"
                :class="[
                  selectedStationId === loc.id ? 'scale-110 ring-4 ring-[#FF8C00]/20' : '',
                  loc.noStamp
                    ? 'bg-white border-[#10B981] text-[#10B981]'
                    : campaign.isCollected(loc.id)
                      ? 'bg-[#FF8C00] border-white text-white'
                      : 'bg-white border-blue-400 text-blue-500',
                ]"
              >
                <Leaf v-if="loc.noStamp" class="w-5 h-5 fill-current" />
                <Star v-else-if="campaign.isCollected(loc.id)" class="w-5 h-5 fill-current" />
                <MapPin v-else class="w-5 h-5 fill-current" />
              </div>
            </div>

            <div
              v-if="!loc.noStamp"
              class="mt-1 px-2 py-0.5 rounded-[12px] text-[9px] font-bold tracking-tight shadow-[0_2px_8px_rgba(0,0,0,0.08)] border whitespace-nowrap"
              :class="campaign.isCollected(loc.id)
                ? 'bg-orange-50 border-orange-200 text-[#FF8C00]'
                : 'bg-blue-50 border-blue-200 text-blue-500'"
            >
              {{ campaign.isCollected(loc.id) ? '已收集' : '去集章' }}
            </div>

            <div
              v-if="selectedStationId === loc.id"
              class="mt-1 whitespace-nowrap bg-gray-900/90 text-white text-[10px] px-2 py-1 rounded-[12px] pointer-events-none"
            >
              {{ loc.name }}
            </div>
          </div>
        </CustomMarker>
      </GoogleMap>

      <!-- SSR fallback -->
      <template #fallback>
        <div class="w-full h-full flex items-center justify-center">
          <div class="w-8 h-8 border-4 border-[#FF8C00]/20 border-t-[#FF8C00] rounded-full animate-spin" />
        </div>
      </template>
    </ClientOnly>

    <!-- 掃碼 FAB -->
    <div class="absolute right-4 bottom-5 z-20">
      <button
        class="w-14 h-14 bg-gradient-to-br from-[#FF8C00] to-[#FFA333] text-white rounded-[28px] shadow-[0_8px_24px_rgba(255,140,0,0.4)] border-2 border-white flex items-center justify-center active:scale-95 transition-all hover:brightness-105"
        title="掃描集章"
        @click="emit('openScanner', null)"
      >
        <QrCode class="w-7 h-7" />
      </button>
    </div>

    <!-- 定位我的位置 -->
    <div class="absolute right-4 top-[100px] z-20">
      <button
        class="w-11 h-11 bg-white rounded-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center text-[#FF8C00] active:scale-95 transition-all hover:bg-gray-50"
        title="定位我的位置"
        @click="fetchUserPos(true)"
      >
        <LocateFixed class="w-5 h-5" />
      </button>
    </div>

    <!-- 清單 FAB -->
    <div class="absolute left-4 bottom-5 z-20">
      <button
        class="w-14 h-14 bg-white text-gray-700 rounded-[28px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] border-2 border-white flex items-center justify-center active:scale-95 transition-all hover:bg-gray-50"
        title="點位清單"
        @click="emit('openList')"
      >
        <List class="w-7 h-7 text-[#FF8C00]" />
      </button>
    </div>
  </div>
</template>
