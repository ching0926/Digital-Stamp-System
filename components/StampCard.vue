<script setup lang="ts">
import { Star, MapPin, CheckCircle2, Sparkles } from 'lucide-vue-next'
import type { Station } from '~/stores/campaign'

const emit = defineEmits<{ selectAndNavigate: [station: Station] }>()

const campaign = useCampaignStore()
const percentage = computed(() => campaign.progressPercent)
const isAllCompleted = computed(() => campaign.collectedCount === campaign.totalCount && campaign.totalCount > 0)

// 用語隨活動類型變動（商圈＝景點、市集＝攤位）
const steps = computed(() => [
  { n: 1, title: '尋找點位', desc: `點擊「集章卡」或地圖上的${campaign.unitLabel}圖示。` },
  { n: 2, title: '前往現場', desc: '畫面跳出小卡後，依卡片上的資訊前往現場。' },
  { n: 3, title: '掃碼集章', desc: '抵達現場後開啟相機，掃描現場 QR Code 即可成功集章！' },
])
</script>

<template>
  <div class="flex-1 overflow-y-auto p-5 space-y-6">
    <!-- 進度摘要 -->
    <div class="bg-white p-5 rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div class="flex justify-between items-start">
        <div>
          <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">集章進度</span>
          <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
            {{ percentage }}% <span class="text-sm font-bold text-gray-500">已完成</span>
          </h2>
        </div>
        <div class="bg-orange-50 text-[#FF8C00] font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-orange-100/50">
          <CheckCircle2 class="w-4 h-4" />
          <span>{{ campaign.collectedCount }} / {{ campaign.totalCount }} 站點</span>
        </div>
      </div>

      <div class="mt-4 w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div class="h-full bg-gradient-to-r from-[#FF8C00] to-[#FFA333] transition-all duration-700 ease-out" :style="{ width: `${percentage}%` }" />
      </div>

      <p class="text-[11px] text-gray-500 mt-3 leading-relaxed">
        <span v-if="campaign.collectedCount === 0"> 精彩的旅程要開始囉！一起出發收集今天的快樂吧 ✨</span>
        <span v-else-if="isAllCompleted"> 恭喜🎉 已完成全部 {{ campaign.totalCount }} 個點位收集，快去「獎項兌換」領獎！✨</span>
        <span v-else> 衝啊！你已經成功收集了 {{ campaign.collectedCount }} 點！繼續前進，再一下下就集滿囉 🚀</span>
      </p>
    </div>

    <!-- 集章卡網格 -->
    <div class="space-y-4">
      <div class="flex justify-between items-center px-1">
        <h3 class="text-sm font-bold text-gray-800">電子集章卡</h3>
        <span class="text-[10px] font-bold text-[#FF8C00] bg-orange-50 px-2 py-0.5 rounded-[8px]">點擊卡片看地圖</span>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div
          v-for="(loc, index) in campaign.stampableStations"
          :key="loc.id"
          class="flex flex-col items-center justify-between p-3 aspect-square rounded-[24px] border transition-all text-center cursor-pointer active:scale-95"
          :class="campaign.isCollected(loc.id)
            ? 'bg-white border-[#FF8C00] shadow-[0_4px_16px_rgba(255,140,0,0.06)]'
            : 'bg-gray-50/50 border-gray-100'"
          @click="emit('selectAndNavigate', loc)"
        >
          <span class="text-[9px] font-extrabold" :class="campaign.isCollected(loc.id) ? 'text-[#FF8C00]' : 'text-gray-400'">
            0{{ index + 1 }}
          </span>
          <div
            class="w-12 h-12 rounded-[24px] flex items-center justify-center transition-all"
            :class="campaign.isCollected(loc.id)
              ? 'bg-[#FF8C00] text-white shadow-md shadow-[#FF8C00]/15'
              : 'border border-dashed border-gray-300 text-gray-300 bg-white'"
          >
            <Star v-if="campaign.isCollected(loc.id)" class="w-6 h-6 fill-current animate-pulse" />
            <MapPin v-else class="w-5 h-5 fill-current" />
          </div>
          <span
            class="text-[10px] font-extrabold tracking-tight truncate w-full"
            :class="campaign.isCollected(loc.id) ? 'text-gray-900' : 'text-gray-400'"
          >
            {{ loc.name.replace('加蚋仔', '') }}
          </span>
        </div>
      </div>
    </div>

    <!-- 如何集章 -->
    <div class="bg-gradient-to-br from-gray-50 to-orange-50/20 p-5 rounded-[24px] border border-gray-100/80 flex flex-col gap-4">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100/50">
          <Sparkles class="w-4 h-4 text-[#FF8C00]" />
        </div>
        <div>
          <h3 class="font-extrabold text-[12px] text-gray-800 tracking-tight">如何搜集印章？</h3>
          <p class="text-[9px] text-gray-400 font-medium">簡單三步驟，輕鬆解鎖好禮</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3.5 relative">
        <div class="absolute left-[15px] top-4 bottom-4 w-[1px] bg-gray-200/60" />
        <div v-for="step in steps" :key="step.n" class="flex items-start gap-3 relative z-10">
          <div class="w-8 h-8 rounded-full bg-white border border-gray-100 shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center justify-center shrink-0">
            <span class="text-xs font-black text-[#FF8C00]">{{ step.n }}</span>
          </div>
          <div class="bg-white p-3 rounded-[16px] border border-gray-100/80 flex-1">
            <p class="text-[11px] font-bold text-gray-800">{{ step.title }}</p>
            <p class="text-[10px] text-gray-500 mt-1 leading-normal">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
