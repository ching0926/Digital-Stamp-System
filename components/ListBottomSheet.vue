<script setup lang="ts">
import { X } from 'lucide-vue-next'
import type { Station } from '~/stores/campaign'

const emit = defineEmits<{ close: []; select: [station: Station] }>()
const campaign = useCampaignStore()
const heightState = ref<'half' | 'full'>('half')
</script>

<template>
  <div class="absolute inset-x-0 top-0 bottom-20 z-40">
    <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-200" leave-to-class="opacity-0" appear>
      <div class="absolute inset-0 bg-black/20" @click="emit('close')" />
    </Transition>

    <Transition enter-active-class="transition-transform duration-300 ease-out" enter-from-class="translate-y-full" leave-active-class="transition-transform duration-200 ease-in" leave-to-class="translate-y-full" appear>
      <div
        class="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col z-50 transition-[height] duration-300"
        :style="{ height: heightState === 'half' ? '50%' : '80%' }"
      >
        <div class="w-full flex justify-center py-3 bg-gray-50 border-b border-gray-100 cursor-pointer shrink-0" @click="heightState = heightState === 'half' ? 'full' : 'half'">
          <div class="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        <div class="px-6 py-4 flex justify-between items-center border-b border-gray-50">
          <h2 class="text-base font-bold text-gray-900">加蚋仔點位清單 ({{ campaign.collectedCount }}/{{ campaign.totalCount }})</h2>
          <button class="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-[16px] flex items-center justify-center active:scale-95 shrink-0" title="關閉" @click="emit('close')">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="overflow-y-auto flex-1 p-4 space-y-3">
          <div
            v-for="loc in campaign.stations"
            :key="loc.id"
            class="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-orange-50/40 rounded-[24px] cursor-pointer transition-all border border-gray-100 hover:border-orange-100/60 active:scale-[0.99]"
            @click="emit('select', loc); emit('close')"
          >
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-[16px] overflow-hidden bg-gray-200 shrink-0">
                <img :src="loc.imgUrl" :alt="loc.name" referrerpolicy="no-referrer" class="w-full h-full object-cover" >
              </div>
              <div class="min-w-0">
                <h3 class="text-xs font-bold text-gray-900 truncate">{{ loc.name }}</h3>
                <p class="text-[10px] text-[#FF8C00] font-medium mt-0.5 truncate">{{ loc.title }}</p>
              </div>
            </div>
            <span
              v-if="!loc.noStamp"
              class="text-xs font-bold px-3 py-1.5 rounded-[12px]"
              :class="campaign.isCollected(loc.id) ? 'text-[#10B981] bg-emerald-50' : 'text-gray-400 bg-gray-100'"
            >
              {{ campaign.isCollected(loc.id) ? '已收集' : '去集章' }}
            </span>
            <div v-else class="w-[60px]" />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
