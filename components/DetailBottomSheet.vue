<script setup lang="ts">
import { X, Navigation, QrCode, CheckCircle2, MapPin, Clock, Phone, Sparkles } from 'lucide-vue-next'
import type { Station } from '~/stores/campaign'

const props = defineProps<{ station: Station }>()
const emit = defineEmits<{ close: []; startScanning: [stationId: string] }>()

const campaign = useCampaignStore()
const isCollected = computed(() => campaign.isCollected(props.station.id))

const heightState = ref<'half' | 'full'>('half')
const showNavToast = ref(false)

watch(() => props.station.id, () => (heightState.value = 'half'))

let navTimer: ReturnType<typeof setTimeout> | undefined
function triggerNav() {
  showNavToast.value = true
  clearTimeout(navTimer)
  navTimer = setTimeout(() => (showNavToast.value = false), 3500)
}
onBeforeUnmount(() => clearTimeout(navTimer))
</script>

<template>
  <div class="absolute inset-x-0 top-0 bottom-20 z-40">
    <!-- backdrop -->
    <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-200" leave-to-class="opacity-0" appear>
      <div class="absolute inset-0 bg-black/30" @click="emit('close')" />
    </Transition>

    <!-- sheet -->
    <Transition enter-active-class="transition-transform duration-300 ease-out" enter-from-class="translate-y-full" leave-active-class="transition-transform duration-200 ease-in" leave-to-class="translate-y-full" appear>
      <div
        class="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col z-50 transition-[height] duration-300"
        :style="{ height: heightState === 'half' ? '50%' : '85%' }"
      >
        <!-- 導航提示 -->
        <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-3" leave-active-class="transition duration-200" leave-to-class="opacity-0 -translate-y-3">
          <div v-if="showNavToast" class="absolute top-12 left-4 right-4 z-50 bg-gray-950/95 text-white p-3.5 rounded-[20px] shadow-lg flex items-center gap-3 border border-white/10">
            <div class="w-8 h-8 rounded-full bg-[#FF8C00] flex items-center justify-center shrink-0">
              <Navigation class="w-4 h-4 text-white fill-white" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[11px] font-extrabold text-[#FF8C00]">GPS 導航引導已啟動</p>
              <p class="text-[10px] text-gray-200 mt-0.5 truncate leading-tight">規劃至 {{ station.name }}...</p>
            </div>
            <button class="text-[10px] bg-white/10 px-2.5 py-1 rounded-[8px] hover:bg-white/20 font-bold" @click="showNavToast = false">好</button>
          </div>
        </Transition>

        <!-- 拉桿 -->
        <div class="w-full flex justify-center py-3 bg-gray-50 border-b border-gray-100 cursor-pointer shrink-0" @click="heightState = heightState === 'half' ? 'full' : 'half'">
          <div class="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        <button class="absolute right-4 top-4 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center z-20" @click="emit('close')">
          <X class="w-5 h-5" />
        </button>

        <!-- 內容 -->
        <div class="overflow-y-auto flex-1 pb-24">
          <div class="relative h-48 w-full bg-gray-100 overflow-hidden">
            <img :src="station.imgUrl" :alt="station.name" referrerpolicy="no-referrer" class="w-full h-full object-cover" >
            <div class="absolute left-4 bottom-4 bg-[#FF8C00] text-white text-xs font-bold px-3 py-1.5 rounded-[12px] shadow-sm">{{ station.type }}</div>
          </div>

          <div class="p-6">
            <div class="flex justify-between items-start gap-4">
              <div>
                <h2 class="text-xl font-bold text-gray-900 tracking-tight">{{ station.name }}</h2>
                <p class="text-sm font-semibold text-[#FF8C00] mt-1 flex items-center gap-1">
                  <Sparkles class="w-4 h-4 fill-current" />
                  <span>{{ station.title }}</span>
                </p>
              </div>
              <button class="flex flex-col items-center justify-center p-3 bg-orange-50 hover:bg-orange-100 text-[#FF8C00] rounded-[24px]" title="導航" @click="triggerNav">
                <Navigation class="w-5 h-5" />
                <span class="text-[10px] font-bold mt-1">導航</span>
              </button>
            </div>

            <div class="mt-5 space-y-2.5 text-xs text-gray-600 border-t border-b border-gray-100 py-4">
              <div class="flex items-center gap-2"><MapPin class="w-4 h-4 text-gray-400 shrink-0" /><span>{{ station.address }}</span></div>
              <div v-if="station.hours" class="flex items-center gap-2"><Clock class="w-4 h-4 text-gray-400 shrink-0" /><span>開放時間：{{ station.hours }}</span></div>
              <div v-if="station.phone" class="flex items-center gap-2"><Phone class="w-4 h-4 text-gray-400 shrink-0" /><span>聯絡電話：{{ station.phone }}</span></div>
            </div>

            <div class="mt-5">
              <h3 class="text-sm font-bold text-gray-800">探索此地</h3>
              <p class="text-xs text-gray-600 leading-relaxed mt-2 bg-gray-50 p-4 rounded-[24px]">{{ station.description }}</p>
            </div>
            <div class="mt-4">
              <h3 class="text-sm font-bold text-gray-800">私房亮點</h3>
              <p class="text-xs text-gray-600 leading-relaxed mt-2 bg-orange-50/50 p-4 rounded-[24px] border border-orange-100/40">{{ station.specialty }}</p>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
          <div v-if="station.noStamp" class="w-full h-14 bg-orange-50/50 text-[#FF8C00] font-bold rounded-[24px] flex items-center justify-center gap-2 border border-orange-100/55 text-xs">
            <span>此景點無須集章，歡迎前往探索！</span>
          </div>
          <div v-else-if="isCollected" class="w-full h-14 bg-emerald-50 text-emerald-700 font-bold rounded-[24px] flex items-center justify-center gap-2 border border-emerald-200">
            <CheckCircle2 class="w-5 h-5 text-emerald-600" />
            <span>已成功集章！</span>
          </div>
          <button v-else class="w-full h-14 bg-[#FF8C00] hover:bg-[#E07B00] active:scale-95 text-white font-bold rounded-[24px] flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(255,140,0,0.25)] transition-all" @click="emit('startScanning', station.id)">
            <QrCode class="w-5 h-5" />
            <span>掃碼集章</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
