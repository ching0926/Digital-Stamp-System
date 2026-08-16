<script setup lang="ts">
import { Gift, Coffee, FileText, Ticket, Award, X, CheckCircle2, AlertTriangle } from 'lucide-vue-next'
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
// 票券彈窗的兩段式：idle = 顯示核銷按鈕、confirm = 工作人員確認 + 輸入通行碼
const verifyStep = ref<'idle' | 'confirm'>('idle')
const staffKey = ref('')
const redeeming = ref(false)
const redeemError = ref('')

const activeRedemption = computed(() =>
  activeReward.value ? campaign.redemptionFor(activeReward.value.id) : null,
)

// 卡片上的狀態標示：null = 尚未核銷、redeemed = 已兌換
const statusOf = (rewardId: string) => campaign.redemptionFor(rewardId)?.status ?? null

function resetVerify() {
  verifyStep.value = 'idle'
  // 通行碼不做記憶，每次核銷都要工作人員重新輸入
  staffKey.value = ''
  redeemError.value = ''
}

function openTicket(reward: Reward) {
  activeReward.value = reward
  resetVerify()
}

// 由工作人員在民眾手機上按下：一次完成領取與核銷
async function doRedeem() {
  if (!activeReward.value || !staffKey.value.trim()) return
  redeeming.value = true
  redeemError.value = ''
  try {
    await campaign.redeemOnSite(activeReward.value.id, staffKey.value.trim())
    resetVerify()
    if (navigator.vibrate) navigator.vibrate([100, 50, 100])
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusMessage?: string }
    redeemError.value = e.data?.message ?? e.statusMessage ?? '核銷失敗，請再試一次'
  } finally {
    redeeming.value = false
  }
}

function closeTicket() {
  activeReward.value = null
  resetVerify()
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-5 space-y-6">
    <!-- 進度 -->
    <div class="bg-white p-5 rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div class="flex justify-between items-start">
        <div>
          <span class="text-2xs text-gray-400 font-bold uppercase tracking-wider">解鎖獎勵</span>
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
      <p class="text-xs text-gray-500 mt-3 leading-relaxed">目前已解鎖了 {{ unlockedCount }} 項專屬獎勵！</p>
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
            statusOf(reward.id) === 'redeemed'
              ? 'border-gray-100 opacity-70'
              : campaign.isClaimed(reward.id)
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
                <span class="text-2xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">集滿 {{ reward.requirementCount }} 章</span>
                <span v-if="collectedCount >= reward.requirementCount && !campaign.isClaimed(reward.id)" class="text-2xs font-bold text-[#FF8C00] bg-orange-50 px-2 py-0.5 rounded-full animate-pulse">可兌換</span>
                <span v-else-if="statusOf(reward.id) === 'redeemed'" class="text-2xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <CheckCircle2 class="w-3 h-3" />
                  <span>已兌換</span>
                </span>
              </div>
              <h4 class="text-xs font-bold text-gray-800 mt-1.5 truncate">{{ reward.title }}</h4>
              <p class="text-xs font-semibold text-gray-500 truncate mt-0.5">{{ reward.rewardName }}</p>
            </div>
          </div>

          <div class="flex justify-between items-center pt-3 border-t border-gray-50">
            <span class="text-2xs text-gray-400 font-bold">
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
            <span class="text-2xs font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-widest text-white/90">加蚋仔合作夥伴專屬兌換券</span>
            <h3 class="text-base font-extrabold mt-2.5">{{ activeReward.rewardName }}</h3>
          </div>

          <div class="py-6 px-6 bg-white flex flex-col items-center gap-4">
            <div class="w-full bg-gray-50 rounded-[20px] p-4 text-left space-y-1.5">
              <p class="text-2xs font-bold text-gray-400">兌換項目</p>
              <p class="text-xs font-bold text-gray-800">{{ activeReward.title }}</p>
              <p class="text-2xs font-bold text-gray-400 mt-2">使用規則</p>
              <p class="text-2xs text-gray-500 leading-relaxed">本券限於加蚋仔商圈指定合作店家、服務台由工作人員當場核銷，一人限兌一組。</p>
            </div>

            <!-- 已核銷：完成狀態，無任何可再次核銷的入口 -->
            <div
              v-if="activeRedemption?.status === 'redeemed'"
              class="relative w-full py-5 px-6 flex flex-col items-center justify-center border-2 border-dashed border-emerald-200 rounded-[24px] bg-emerald-50/20 overflow-hidden"
            >
              <div class="absolute rotate-12 border-4 border-emerald-500 text-emerald-500 font-extrabold text-2xl px-4 py-1 rounded-lg tracking-wider opacity-15 select-none pointer-events-none scale-125">
                已核銷
              </div>
              <CheckCircle2 class="w-10 h-10 text-emerald-500 mb-2" />
              <span class="text-xs font-extrabold text-emerald-800">核銷完成！</span>
              <span class="text-2xs text-gray-500 mt-1 font-semibold">本兌換券已由工作人員點選核銷</span>
              <span class="text-3xs text-gray-400 mt-2 font-mono">紀錄編號 {{ activeRedemption.code }}</span>
            </div>

            <!-- 工作人員確認 + 通行碼 -->
            <div
              v-else-if="verifyStep === 'confirm'"
              class="w-full p-4 border-2 border-dashed border-amber-200 rounded-[24px] bg-amber-50/20 flex flex-col items-center"
            >
              <AlertTriangle class="w-8 h-8 text-amber-500 mb-2" />
              <h4 class="text-xs font-extrabold text-amber-800">工作人員請確認</h4>
              <p class="text-2xs text-gray-600 text-center leading-relaxed mt-1.5 px-1">
                請確認已在現場核對並提供實體獎項或商品。核銷後此券即作廢，無法復原。
              </p>

              <input
                v-model="staffKey"
                type="password"
                inputmode="numeric"
                maxlength="4"
                autocomplete="one-time-code"
                placeholder="4 碼核銷碼"
                class="w-full mt-3 px-4 py-2.5 rounded-[16px] bg-white border border-amber-200 text-base tracking-[0.4em] text-center focus:outline-none focus:border-amber-400"
                @keyup.enter="doRedeem"
              >
              <p v-if="redeemError" class="text-2xs text-red-500 font-bold text-center mt-2">{{ redeemError }}</p>

              <div class="flex gap-2 w-full mt-3.5">
                <button
                  class="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-[20px] transition-all"
                  :disabled="redeeming"
                  @click="resetVerify"
                >
                  取消
                </button>
                <button
                  class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-[20px] shadow-md transition-all active:scale-95 disabled:opacity-50"
                  :disabled="redeeming || !staffKey.trim()"
                  @click="doRedeem"
                >
                  {{ redeeming ? '核銷中…' : '確認核銷' }}
                </button>
              </div>
            </div>

            <!-- 預設：交給工作人員點 -->
            <div v-else class="w-full flex flex-col items-center gap-2.5">
              <button
                class="w-full py-3 bg-gradient-to-r from-[#FF8C00] to-[#FFA333] hover:from-[#E07B00] hover:to-[#E09200] text-white text-sm font-extrabold rounded-[20px] shadow-[0_4px_12px_rgba(255,140,0,0.2)] transition-all active:scale-95"
                @click="verifyStep = 'confirm'"
              >
                工作人員點選核銷
              </button>
              <div class="text-2xs text-gray-500 text-center leading-relaxed max-w-[240px]">
                <span class="font-bold text-gray-400 block mb-0.5">【商家 / 工作人員核銷專用】</span>
                兌換時請交由現場店員點擊上述按鈕進行核銷，請勿自行點擊。
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
