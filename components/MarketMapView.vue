<script setup lang="ts">
import { List, MapPin, Star, Leaf, QrCode, ZoomIn, ZoomOut, Compass, Image as ImageIcon } from 'lucide-vue-next'
import type { Station } from '~/stores/campaign'

// 對外介面刻意與 MapView.vue 完全相同，index.vue 只要換元件即可
defineProps<{ selectedStationId: string | null }>()

const emit = defineEmits<{
  select: [station: Station]
  openList: []
  openScanner: [stationId: string | null]
}>()

const campaign = useCampaignStore()

const MIN_ZOOM = 0.5
const MAX_ZOOM = 5
const ZOOM_STEP = 0.5

const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })
const isDragging = ref(false)
let dragStart = { x: 0, y: 0 }
let panStart = { x: 0, y: 0 }

// 點在浮動控制鈕上時不要當成拖曳地圖
function isControl(target: EventTarget | null) {
  return target instanceof Element && !!target.closest('.map-control')
}

function startDrag(x: number, y: number) {
  isDragging.value = true
  dragStart = { x, y }
  panStart = { ...pan.value }
}

function moveDrag(x: number, y: number) {
  if (!isDragging.value) return
  pan.value = { x: panStart.x + (x - dragStart.x), y: panStart.y + (y - dragStart.y) }
}

function onMouseDown(e: MouseEvent) {
  if (isControl(e.target)) return
  startDrag(e.clientX, e.clientY)
}
function onMouseMove(e: MouseEvent) {
  moveDrag(e.clientX, e.clientY)
}
function onTouchStart(e: TouchEvent) {
  if (isControl(e.target) || e.touches.length !== 1) return
  startDrag(e.touches[0].clientX, e.touches[0].clientY)
}
function onTouchMove(e: TouchEvent) {
  if (e.touches.length !== 1) return
  moveDrag(e.touches[0].clientX, e.touches[0].clientY)
}
function endDrag() {
  isDragging.value = false
}

function zoomIn() {
  zoom.value = Math.min(MAX_ZOOM, zoom.value + ZOOM_STEP)
}
function zoomOut() {
  zoom.value = Math.max(MIN_ZOOM, zoom.value - ZOOM_STEP)
}
function resetView() {
  zoom.value = 1
  pan.value = { x: 0, y: 0 }
}

// 圖釘要反向縮放，否則放大平面圖時圖釘會跟著變成巨大一顆
const markerScale = computed(() => `scale(${1 / zoom.value})`)

// 平面圖的實際長寬比。用它給容器一個確定的框，圖才會真的「縮到看得完」——
// 只寫 max-h-full 在高度 auto 的父層上不會生效，方形圖在寬螢幕會整張溢出。
const imgRatio = ref(1)
function onImgLoad(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth && img.naturalHeight) imgRatio.value = img.naturalWidth / img.naturalHeight
}
</script>

<template>
  <div
    class="relative w-full h-full overflow-hidden select-none bg-[#F4F6F4]"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="endDrag"
    @mouseleave="endDrag"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="endDrag"
  >
    <!-- 平面圖 + 攤位標記（同一層 transform，標記才會黏在圖上的正確位置）-->
    <div
      class="absolute left-1/2 top-1/2 w-full h-full flex items-center justify-center"
      :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
      :style="{
        transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        transformOrigin: 'center center',
      }"
    >
      <!-- 這層要「剛好等於圖片顯示出來的大小」，標記的百分比才會對齊圖片本身。
           用 aspect-ratio + max-w/max-h 才能同時做到 contain 與確定尺寸。 -->
      <div
        v-if="campaign.marketMapUrl"
        class="relative max-w-full max-h-full"
        :style="{ aspectRatio: String(imgRatio), height: '100%' }"
      >
        <img
          :src="campaign.marketMapUrl"
          alt="市集平面圖"
          class="block w-full h-full object-contain pointer-events-none"
          draggable="false"
          @load="onImgLoad"
        >

        <!-- 攤位標記：依後台填的「地圖 X／Y（%）」定位 -->
        <div
          v-for="loc in campaign.stations"
          :key="loc.id"
          class="absolute z-10"
          :style="{ left: `${loc.mapCoord?.x ?? 50}%`, top: `${loc.mapCoord?.y ?? 50}%` }"
        >
          <div
            class="flex flex-col items-center cursor-pointer"
            :style="{ transform: `translate(-50%, -100%) ${markerScale}`, transformOrigin: 'bottom center' }"
            @click.stop="emit('select', loc)"
          >
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
        </div>
      </div>

      <!-- 尚未設定平面圖：仍保留掃碼與清單，民眾照樣能集章 -->
      <div v-else class="flex flex-col items-center justify-center gap-2 text-center px-8">
        <ImageIcon class="w-10 h-10 text-gray-300" />
        <p class="text-sm font-bold text-gray-500">市集平面圖尚未上傳</p>
        <p class="text-xs text-gray-400 leading-relaxed">請於後台「市集平面圖」設定，仍可使用右下角掃碼與左下角攤位清單。</p>
      </div>
    </div>

    <!-- 掃碼 FAB -->
    <div class="absolute right-4 bottom-5 z-20">
      <button
        class="map-control w-14 h-14 bg-gradient-to-br from-[#FF8C00] to-[#FFA333] text-white rounded-[28px] shadow-[0_8px_24px_rgba(255,140,0,0.4)] border-2 border-white flex items-center justify-center active:scale-95 transition-all hover:brightness-105"
        title="掃描集章"
        @click="emit('openScanner', null)"
      >
        <QrCode class="w-7 h-7" />
      </button>
    </div>

    <!-- 檢視控制：室內平面圖沒有 GPS 定位的意義，改為重設 / 放大 / 縮小 -->
    <div class="absolute right-4 top-[100px] z-20 flex flex-col gap-2.5">
      <button
        class="map-control w-11 h-11 bg-white rounded-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center active:scale-95 transition-all hover:bg-gray-50"
        title="重設地圖中心"
        @click="resetView"
      >
        <Compass class="w-5 h-5 text-[#FF8C00]" />
      </button>
      <button
        class="map-control w-11 h-11 bg-white rounded-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center text-gray-700 active:scale-95 transition-all hover:bg-gray-50 disabled:opacity-40"
        title="放大"
        :disabled="zoom >= MAX_ZOOM"
        @click="zoomIn"
      >
        <ZoomIn class="w-5 h-5" />
      </button>
      <button
        class="map-control w-11 h-11 bg-white rounded-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center text-gray-700 active:scale-95 transition-all hover:bg-gray-50 disabled:opacity-40"
        title="縮小"
        :disabled="zoom <= MIN_ZOOM"
        @click="zoomOut"
      >
        <ZoomOut class="w-5 h-5" />
      </button>
    </div>

    <!-- 清單 FAB -->
    <div class="absolute left-4 bottom-5 z-20">
      <button
        class="map-control w-14 h-14 bg-white text-gray-700 rounded-[28px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] border-2 border-white flex items-center justify-center active:scale-95 transition-all hover:bg-gray-50"
        title="攤位清單"
        @click="emit('openList')"
      >
        <List class="w-7 h-7 text-[#FF8C00]" />
      </button>
    </div>
  </div>
</template>
