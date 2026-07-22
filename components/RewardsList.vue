<script setup lang="ts">
import QRCode from 'qrcode'
import { Gift, Coffee, FileText, Ticket, Award, X, CheckCircle2 } from 'lucide-vue-next'
import type { Reward } from '~/stores/campaign'

const campaign = useCampaignStore()
const percentage = computed(() => campaign.progressPercent)
const collectedCount = computed(() => campaign.collectedCount)
const unlockedCount = computed(
  () => campaign.rewards.filter((r) => collectedCount.value >= r.requirementCount).length,
)

const iconOf = (type: string) =>
  type === 'coffee' ? Coffee : type === 'bag' ? Gift : type === 'postcard' ? FileText : Ticket

const activeReward = ref<Reward | null>(null)
const qrDataUrl = ref('')
const claiming = ref(false)
const claimError = ref('')

const activeRedemption = computed(() =>
  activeReward.value ? campaign.redemptionFor(activeReward.value.id) : null,
)

async function renderQr(code: string) {
  qrDataUrl.value = await QRCode.toDataURL(code, { margin: 1, width: 220 })
}

async function openTicket(reward: Reward) {
  activeReward.value = reward
  claimError.value = ''
  const existing = campaign.redemptionFor(reward.id)
  if (existing) await renderQr(existing.code)
  else qrDataUrl.value = ''
}

async function doClaim() {
  if (!activeReward.value) return
  claiming.value = true
  claimError.value = ''
  try {
    const red = await campaign.claim(activeReward.value.id)
    await renderQr(red.code)
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusMessage?: string }
    claimError.value = e.data?.message ?? e.statusMessage ?? '兌換失敗，請再試一次'
  } finally {
    claiming.value = false
  }
}

function closeTicket() {
  activeReward.value = null
  qrDataUrl.value = ''
}
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
          :class="[
            campaign.isClaimed(reward.id)
              ? 'border-gray-100 opacity-90'
              : collectedCount >= reward.requirementCount
                ? 'border-[#FF8C00] shadow-[0_4px_16px_rgba(255,140,0,0.04)]'
                : 'border-gray-100',
          ]"
        >
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-[18px] bg-orange-50 flex items-center justify-center shrink-0">
              <component :is="iconOf(reward.iconType)" class="w-6 h-6 text-[#FF8C00]" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">集滿 {{ reward.requirementCount }} 章</span>
                <span v-if="collectedCount >= reward.requirementCount && !campaign.isClaimed(reward.id)" class="text-[10px] font-bold text-[#FF8C00] bg-orange-50 px-2 py-0.5 rounded-full animate-pulse">可兌換</span>
              </div>
              <h4 class="text-xs font-bold text-gray-800 mt-1.5 truncate">{{ reward.title }}</h4>
              <p class="text-[11px] font-semibold text-gray-500 truncate mt-0.5">{{ reward.rewardName }}</p>
            </div>
          </div>

          <div class="flex justify-between items-center pt-3 border-t border-gray-50">
            <span class="text-[10px] text-gray-400 font-bold">
              解鎖進度：{{ Math.min(collectedCount, reward.requirementCount) }} / {{ reward.requirementCount }}
            </span>

            <span v-if="collectedCount < reward.requirementCount" class="text-xs font-bold text-gray-400 px-3 py-1 bg-gray-100 rounded-full">未達成</span>
            <button
              v-else-if="campaign.isClaimed(reward.id)"
              class="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs rounded-full flex items-center gap-1 transition-all"
              @click="openTicket(reward)"
            >
              <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500" />
              <span>查看票券</span>
            </button>
            <button
              v-else
              class="px-4 py-1.5 bg-[#FF8C00] hover:bg-[#E07B00] text-white font-bold text-xs rounded-full shadow-[0_2px_8px_rgba(255,140,0,0.15)] transition-all active:scale-95"
              @click="openTicket(reward)"
            >
              點此兌換
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 票券 Modal -->
    <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" leave-active-class="transition duration-200" leave-to-class="opacity-0">
      <div v-if="activeReward" class="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/50" @click.self="closeTicket">
        <div class="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl flex flex-col relative">
          <div class="bg-gradient-to-r from-[#FF8C00] to-[#FFA333] p-6 text-white text-center relative">
            <button class="absolute right-4 top-4 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center" @click="closeTicket">
              <X class="w-5 h-5" />
            </button>
            <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Ticket class="w-6 h-6 text-white" />
            </div>
            <span class="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-widest text-white/90">加蚋仔合作夥伴專屬兌換券</span>
            <h3 class="text-base font-extrabold mt-2.5">{{ activeReward.rewardName }}</h3>
          </div>

          <div class="py-6 px-6 bg-white flex flex-col items-center gap-4">
            <div class="w-full bg-gray-50 rounded-[20px] p-4 text-left space-y-1.5">
              <p class="text-[10px] font-bold text-gray-400">兌換項目</p>
              <p class="text-xs font-bold text-gray-800">{{ activeReward.title }}</p>
              <p class="text-[10px] font-bold text-gray-400 mt-2">使用規則</p>
              <p class="text-[10px] text-gray-500 leading-relaxed">請至加蚋仔商圈指定合作店家 / 服務台，出示下方核銷碼或 QR 由工作人員核銷，一人限兌一組。</p>
            </div>

            <!-- 尚未領取 -->
            <template v-if="!activeRedemption">
              <p v-if="claimError" class="text-xs text-red-500 font-bold text-center">{{ claimError }}</p>
              <button
                class="w-full py-3 bg-gradient-to-r from-[#FF8C00] to-[#FFA333] hover:from-[#E07B00] hover:to-[#E09200] text-white text-sm font-extrabold rounded-[20px] shadow-[0_4px_12px_rgba(255,140,0,0.2)] transition-all active:scale-95 disabled:opacity-60"
                :disabled="claiming"
                @click="doClaim"
              >
                {{ claiming ? '兌換中…' : '確認領取此獎項' }}
              </button>
              <p class="text-[10px] text-gray-400 text-center">領取後將產生專屬核銷碼，請於現場出示。</p>
            </template>

            <!-- 已領取：顯示核銷碼 + QR -->
            <template v-else>
              <div
                v-if="activeRedemption.status === 'redeemed'"
                class="w-full py-4 flex flex-col items-center border-2 border-dashed border-emerald-200 rounded-[24px] bg-emerald-50/30"
              >
                <CheckCircle2 class="w-10 h-10 text-emerald-500 mb-2" />
                <span class="text-xs font-extrabold text-emerald-800">核銷完成！</span>
                <span class="text-[10px] text-gray-500 mt-1">本兌換券已由工作人員核銷</span>
                <span class="text-sm font-mono font-bold text-gray-400 mt-2 tracking-widest line-through">{{ activeRedemption.code }}</span>
              </div>
              <template v-else>
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="核銷 QR" class="w-44 h-44 rounded-2xl border border-gray-100" >
                <div class="text-center">
                  <p class="text-[10px] text-gray-400 font-bold">核銷碼</p>
                  <p class="text-2xl font-mono font-extrabold text-gray-900 tracking-[0.3em]">{{ activeRedemption.code }}</p>
                </div>
                <div class="w-full text-center text-[10px] text-gray-400 bg-gray-50 rounded-[16px] py-2">請交由現場工作人員掃碼或輸入核銷，請勿自行操作。</div>
              </template>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
