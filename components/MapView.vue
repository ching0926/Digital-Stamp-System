<script setup lang="ts">
import { Compass, ZoomIn, ZoomOut, List, MapPin, Star, Leaf, QrCode } from 'lucide-vue-next'
import type { Station } from '~/stores/campaign'

const props = defineProps<{
  selectedStationId: string | null
}>()

const emit = defineEmits<{
  select: [station: Station]
  openList: []
  openScanner: [stationId: string | null]
}>()

const campaign = useCampaignStore()

const zoom = ref(1.1)
const pan = ref({ x: 0, y: -40 })
const isDragging = ref(false)
const dragStart = { x: 0, y: 0 }
const panStart = { x: 0, y: 0 }
const mapContainerRef = ref<HTMLDivElement | null>(null)

function centerOnLocation(loc: Station, targetZoom = 1.4) {
  const mapX = loc.mapCoord.x * 10
  const mapY = loc.mapCoord.y * 10
  zoom.value = targetZoom
  pan.value = {
    x: (500 - mapX) * targetZoom,
    y: (500 - mapY) * targetZoom - 60,
  }
}

watch(
  () => props.selectedStationId,
  (id) => {
    if (id) {
      const loc = campaign.stations.find((l) => l.id === id)
      if (loc) centerOnLocation(loc, 1.4)
    }
  },
)

function isInteractive(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el?.closest('.map-control') || !!el?.closest('.map-pin')
}

function onMouseDown(e: MouseEvent) {
  if (isInteractive(e.target)) return
  isDragging.value = true
  dragStart.x = e.clientX
  dragStart.y = e.clientY
  panStart.x = pan.value.x
  panStart.y = pan.value.y
}
function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  pan.value = {
    x: Math.max(-450, Math.min(450, panStart.x + (e.clientX - dragStart.x))),
    y: Math.max(-450, Math.min(450, panStart.y + (e.clientY - dragStart.y))),
  }
}
function onTouchStart(e: TouchEvent) {
  if (isInteractive(e.target) || e.touches.length !== 1) return
  isDragging.value = true
  dragStart.x = e.touches[0].clientX
  dragStart.y = e.touches[0].clientY
  panStart.x = pan.value.x
  panStart.y = pan.value.y
}
function onTouchMove(e: TouchEvent) {
  if (!isDragging.value || e.touches.length !== 1) return
  pan.value = {
    x: Math.max(-450, Math.min(450, panStart.x + (e.touches[0].clientX - dragStart.x))),
    y: Math.max(-450, Math.min(450, panStart.y + (e.touches[0].clientY - dragStart.y))),
  }
}
function endDrag() {
  isDragging.value = false
}

const zoomIn = () => (zoom.value = Math.min(2.0, zoom.value + 0.2))
const zoomOut = () => (zoom.value = Math.max(0.7, zoom.value - 0.2))
function resetView() {
  zoom.value = 1.1
  pan.value = { x: 0, y: -40 }
}
</script>

<template>
  <div
    ref="mapContainerRef"
    class="relative w-full h-full overflow-hidden select-none bg-[#F4F6F4]"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="endDrag"
    @mouseleave="endDrag"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="endDrag"
  >
    <!-- MAP CANVAS -->
    <div
      class="absolute w-[1000px] h-[1000px] left-1/2 top-1/2"
      :style="{
        transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        transformOrigin: 'center center',
      }"
    >
      <svg
        viewBox="0 0 1000 1000"
        class="w-full h-full shadow-[0_10px_50px_rgba(0,0,0,0.05)] rounded-[48px] overflow-hidden"
        style="background-color: #edf1ee"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8E4" stroke-width="1" />
          </pattern>
        </defs>
        <rect width="1000" height="1000" fill="url(#grid)" />

        <!-- 新店溪 -->
        <path
          d="M -50 420 C 150 480, 200 680, 250 820 C 300 900, 480 980, 1050 1020 L 1050 1100 L -50 1100 Z"
          fill="#C2E2F7"
          stroke="#96CEF2"
          stroke-width="4"
        />
        <text x="120" y="600" fill="#60A2D1" font-size="18" font-weight="bold" transform="rotate(35, 120, 600)" opacity="0.6">新店溪</text>

        <!-- 青年公園 -->
        <path
          d="M 680 550 C 720 520, 920 560, 960 620 C 980 720, 940 850, 840 880 C 740 900, 650 800, 660 700 C 660 620, 650 580, 680 550 Z"
          fill="#D2EDD5"
          stroke="#A3DBAB"
          stroke-width="3"
        />
        <path
          d="M 780 720 C 810 700, 850 710, 860 740 C 865 765, 830 790, 800 780 C 770 770, 760 740, 780 720 Z"
          fill="#A8DFF2"
          stroke="#80CCE6"
          stroke-width="2"
        />
        <text x="800" y="755" fill="#1C658C" font-size="11" class="pointer-events-none">鷺鷥湖</text>
        <text x="860" y="660" fill="#2E7D32" font-size="16" font-weight="bold" class="pointer-events-none opacity-80">青年公園</text>

        <!-- 學校綠地 -->
        <rect x="180" y="240" width="100" height="80" rx="15" fill="#E2F2E4" stroke="#CBE6D0" stroke-width="2" />
        <text x="210" y="285" fill="#52825A" font-size="11" class="pointer-events-none">東園國小</text>
        <rect x="520" y="780" width="120" height="90" rx="20" fill="#E2F2E4" stroke="#CBE6D0" stroke-width="2" />
        <text x="555" y="830" fill="#52825A" font-size="11" class="pointer-events-none">華江高中</text>
        <rect x="420" y="180" width="140" height="70" rx="15" fill="#E2F2E4" stroke="#CBE6D0" stroke-width="2" />
        <text x="465" y="220" fill="#52825A" font-size="11" class="pointer-events-none">雙園國中</text>

        <!-- 道路 -->
        <path d="M -50 150 L 1050 150" fill="none" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round" />
        <path d="M 550 -50 C 480 300, 380 600, 260 1050" fill="none" stroke="#FFFFFF" stroke-width="32" stroke-linecap="round" />
        <path d="M 120 200 C 220 220, 320 380, 480 500 C 600 600, 720 750, 780 880" fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round" />
        <path d="M 680 550 C 620 580, 560 650, 590 780 C 610 880, 680 940, 840 920" fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round" />
        <path d="M 100 350 L 500 350" fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" />
        <path d="M 300 150 L 300 600" fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" />

        <text x="350" y="142" fill="#788F7E" font-size="12" font-weight="bold">西藏路</text>
        <text x="470" y="270" fill="#788F7E" font-size="12" font-weight="bold" transform="rotate(-68, 470, 270)">萬大路</text>
        <text x="250" y="320" fill="#788F7E" font-size="12" font-weight="bold" transform="rotate(25, 250, 320)">東園街</text>
        <text x="635" y="880" fill="#788F7E" font-size="12" font-weight="bold" transform="rotate(-15, 635, 880)">青年路</text>

        <g fill="#A3DBAB" class="opacity-60 pointer-events-none">
          <circle cx="150" cy="270" r="10" />
          <circle cx="740" cy="580" r="12" />
          <circle cx="880" cy="800" r="14" />
          <circle cx="580" cy="810" r="11" />
        </g>
      </svg>

      <!-- 集章點 PIN -->
      <div
        v-for="loc in campaign.stations"
        :key="loc.id"
        class="absolute map-pin transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
        :style="{ left: `${loc.mapCoord.x}%`, top: `${loc.mapCoord.y}%` }"
        @click="emit('select', loc)"
      >
        <div
          v-if="selectedStationId === loc.id"
          class="absolute inset-0 w-12 h-12 bg-[#FF8C00]/20 rounded-full animate-ping -left-[10px] -top-[10px]"
        />
        <div class="flex flex-col items-center">
          <div
            class="w-10 h-10 rounded-[24px] flex items-center justify-center border-2 shadow-lg transition-transform duration-300"
            :class="[
              selectedStationId === loc.id ? 'scale-110 ring-4 ring-[#FF8C00]/20' : 'hover:scale-105',
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

          <div
            v-if="!loc.noStamp"
            class="mt-1 px-2 py-0.5 rounded-[12px] text-[9px] font-bold tracking-tight shadow-[0_2px_8px_rgba(0,0,0,0.02)] border"
            :class="campaign.isCollected(loc.id)
              ? 'bg-orange-50 border-orange-200 text-[#FF8C00]'
              : 'bg-blue-50 border-blue-200 text-blue-500'"
          >
            {{ campaign.isCollected(loc.id) ? '已收集' : '去集章' }}
          </div>

          <div
            class="absolute -bottom-8 whitespace-nowrap bg-gray-900/90 text-white text-[10px] px-2 py-1 rounded-[12px] pointer-events-none transition-opacity duration-300"
            :class="selectedStationId === loc.id ? 'opacity-100' : 'opacity-0'"
          >
            {{ loc.name }}
          </div>
        </div>
      </div>
    </div>

    <!-- 掃碼 FAB -->
    <div class="absolute right-4 bottom-5 flex flex-col gap-3 z-20 items-end">
      <button
        class="map-control w-14 h-14 bg-gradient-to-br from-[#FF8C00] to-[#FFA333] text-white rounded-[28px] shadow-[0_8px_24px_rgba(255,140,0,0.4)] border-2 border-white flex items-center justify-center active:scale-95 transition-all hover:brightness-105"
        title="掃描集章"
        @click="emit('openScanner', null)"
      >
        <QrCode class="w-7 h-7" />
      </button>
    </div>

    <!-- 右上工具 -->
    <div class="absolute right-4 top-[100px] flex flex-col gap-2.5 z-20">
      <button class="map-control w-11 h-11 bg-white rounded-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center text-gray-700 active:scale-95 transition-all hover:bg-gray-50" title="重設地圖中心" @click="resetView">
        <Compass class="w-5 h-5 text-[#FF8C00]" />
      </button>
      <button class="map-control w-11 h-11 bg-white rounded-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center text-gray-700 active:scale-95 transition-all hover:bg-gray-50" title="放大" @click="zoomIn">
        <ZoomIn class="w-5 h-5" />
      </button>
      <button class="map-control w-11 h-11 bg-white rounded-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center text-gray-700 active:scale-95 transition-all hover:bg-gray-50" title="縮小" @click="zoomOut">
        <ZoomOut class="w-5 h-5" />
      </button>
    </div>

    <!-- 清單 FAB -->
    <div class="absolute left-4 bottom-5 z-20">
      <button
        class="map-control w-14 h-14 bg-white text-gray-700 rounded-[28px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] border-2 border-white flex items-center justify-center active:scale-95 transition-all hover:bg-gray-50"
        title="點位清單"
        @click="emit('openList')"
      >
        <List class="w-7 h-7 text-[#FF8C00]" />
      </button>
    </div>
  </div>
</template>
