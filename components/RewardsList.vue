<script setup lang="ts">
import { Gift, Coffee, FileText, Ticket, Award } from 'lucide-vue-next'

const campaign = useCampaignStore()
const percentage = computed(() => campaign.progressPercent)
const collectedCount = computed(() => campaign.collectedCount)
const unlockedCount = computed(
  () => campaign.rewards.filter((r) => collectedCount.value >= r.requirementCount).length,
)

const iconOf = (type: string) => (type === 'coffee' ? Coffee : type === 'bag' ? Gift : type === 'postcard' ? FileText : Ticket)
</script>

<template>
  <div class="flex-1 overflow-y-auto p-5 space-y-6">
    <!-- 進度 -->
    <div class="bg-white p-5 rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div class="flex justify-between items-start">
        <div>
          <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">解鎖獎勵</span>
          <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
            {{ percentage }}% <span class="text-sm font-bold text-gray-500">已達成</span>
          </h2>
        </div>
        <div class="bg-orange-50 text-[#FF8C00] font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-orange-100/50">
          <Award class="w-4 h-4 fill-current" />
          <span>已集 {{ collectedCount }} 章</span>
        </div>
      </div>
      <div class="mt-4 w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div class="h-full bg-gradient-to-r from-[#FF8C00] to-[#FFA333] transition-all duration-700 ease-out" :style="{ width: `${percentage}%` }" />
      </div>
      <p class="text-[11px] text-gray-500 mt-3 leading-relaxed">目前已解鎖了 {{ unlockedCount }} 項專屬獎勵！</p>
    </div>

    <!-- 獎項列表 -->
    <div class="space-y-4">
      <h3 class="text-sm font-bold text-gray-800 px-1">達標兌換好禮</h3>
      <div class="space-y-3.5">
        <div
          v-for="reward in campaign.rewards"
          :key="reward.id"
          class="bg-white p-4 rounded-[24px] border transition-all flex flex-col gap-4"
          :class="collectedCount >= reward.requirementCount ? 'border-[#FF8C00] shadow-[0_4px_16px_rgba(255,140,0,0.04)]' : 'border-gray-100'"
        >
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-[18px] bg-orange-50 flex items-center justify-center shrink-0">
              <component :is="iconOf(reward.iconType)" class="w-6 h-6 text-[#FF8C00]" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">集滿 {{ reward.requirementCount }} 章</span>
                <span v-if="collectedCount >= reward.requirementCount" class="text-[10px] font-bold text-[#FF8C00] bg-orange-50 px-2 py-0.5 rounded-full animate-pulse">可兌換</span>
              </div>
              <h4 class="text-xs font-bold text-gray-800 mt-1.5 truncate">{{ reward.title }}</h4>
              <p class="text-[11px] font-semibold text-gray-500 truncate mt-0.5">{{ reward.rewardName }}</p>
            </div>
          </div>

          <div class="flex justify-between items-center pt-3 border-t border-gray-50">
            <span class="text-[10px] text-gray-400 font-bold">
              解鎖進度：{{ Math.min(collectedCount, reward.requirementCount) }} / {{ reward.requirementCount }}
            </span>
            <span
              v-if="collectedCount < reward.requirementCount"
              class="text-xs font-bold text-gray-400 px-3 py-1 bg-gray-100 rounded-full"
            >未達成</span>
            <span
              v-else
              class="text-xs font-bold text-[#FF8C00] px-3 py-1 bg-orange-50 rounded-full border border-orange-100"
            >可兌換 · 即將開放</span>
          </div>
        </div>
      </div>

      <p class="text-[11px] text-gray-400 text-center leading-relaxed px-4">
        獎項兌換與商家核銷功能將於下一階段（P2）開放。
      </p>
    </div>
  </div>
</template>
