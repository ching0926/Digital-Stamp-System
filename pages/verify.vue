<script setup lang="ts">
import { ScanLine, CheckCircle2, XCircle, Settings, LogOut } from 'lucide-vue-next'

useHead({ title: '商家核銷 · 揪裡嗨集章' })

const staffKey = ref('')
const staffLabel = ref('')
const configured = ref(false)
const code = ref('')
const submitting = ref(false)

interface RedeemResult {
  rewardName: string
  rewardTitle: string
  memberName: string
  redeemedAt: string
}
const result = ref<RedeemResult | null>(null)
const errorMsg = ref('')

onMounted(() => {
  staffKey.value = localStorage.getItem('jh_staff_key') ?? ''
  staffLabel.value = localStorage.getItem('jh_staff_label') ?? ''
  configured.value = !!staffKey.value
})

function saveConfig() {
  if (!staffKey.value.trim()) return
  localStorage.setItem('jh_staff_key', staffKey.value.trim())
  localStorage.setItem('jh_staff_label', staffLabel.value.trim())
  configured.value = true
}
function resetConfig() {
  localStorage.removeItem('jh_staff_key')
  configured.value = false
  result.value = null
  errorMsg.value = ''
}

async function redeem() {
  if (!code.value.trim()) return
  submitting.value = true
  result.value = null
  errorMsg.value = ''
  try {
    result.value = await $fetch<RedeemResult>('/api/reward/redeem', {
      method: 'POST',
      body: { code: code.value.trim(), staffKey: staffKey.value, staffLabel: staffLabel.value },
    })
    code.value = ''
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusMessage?: string }
    errorMsg.value = e.data?.message ?? e.statusMessage ?? '核銷失敗'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
    <div class="w-full max-w-sm bg-white rounded-[28px] shadow-2xl overflow-hidden">
      <div class="bg-gradient-to-r from-[#FF8C00] to-[#FFA333] p-5 text-white flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
          <ScanLine class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-lg font-extrabold">商家核銷台</h1>
          <p class="text-[11px] text-white/80">加蚋仔集章 · 工作人員專用</p>
        </div>
      </div>

      <!-- 設定通行碼 -->
      <div v-if="!configured" class="p-6 space-y-4">
        <div class="flex items-center gap-2 text-gray-700">
          <Settings class="w-4 h-4" />
          <span class="text-sm font-bold">首次設定</span>
        </div>
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-gray-500">工作人員通行碼</label>
          <input v-model="staffKey" type="password" placeholder="請輸入通行碼" class="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-[#FF8C00]" >
        </div>
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-gray-500">攤位／店家名稱（選填）</label>
          <input v-model="staffLabel" type="text" placeholder="例如：茉莉花工坊服務台" class="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-[#FF8C00]" >
        </div>
        <button class="w-full py-3 bg-[#FF8C00] text-white font-bold rounded-2xl active:scale-95 transition-all disabled:opacity-50" :disabled="!staffKey.trim()" @click="saveConfig">
          開始核銷
        </button>
      </div>

      <!-- 核銷操作 -->
      <div v-else class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-[11px] text-gray-400 font-bold truncate">{{ staffLabel || '未命名攤位' }}</span>
          <button class="text-[11px] text-gray-400 flex items-center gap-1 hover:text-gray-600" @click="resetConfig">
            <LogOut class="w-3.5 h-3.5" /> 重設
          </button>
        </div>

        <div class="space-y-1">
          <label class="text-[11px] font-bold text-gray-500">核銷碼</label>
          <input
            v-model="code"
            type="text"
            placeholder="輸入 8 碼"
            maxlength="12"
            class="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-lg font-mono font-bold tracking-widest uppercase focus:outline-none focus:border-[#FF8C00]"
            @keyup.enter="redeem"
            @input="code = code.toUpperCase()"
          >
        </div>

        <button class="w-full py-3.5 bg-[#FF8C00] text-white font-extrabold rounded-2xl active:scale-95 transition-all disabled:opacity-50" :disabled="submitting || !code.trim()" @click="redeem">
          {{ submitting ? '核銷中…' : '確認核銷' }}
        </button>

        <!-- 成功 -->
        <div v-if="result" class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col items-center gap-1 text-center">
          <CheckCircle2 class="w-10 h-10 text-emerald-500" />
          <p class="text-sm font-extrabold text-emerald-800">核銷成功！</p>
          <p class="text-xs text-gray-600 mt-1">請提供獎項：<span class="font-bold">{{ result.rewardName }}</span></p>
          <p v-if="result.memberName" class="text-[11px] text-gray-400">會員：{{ result.memberName }}</p>
        </div>

        <!-- 失敗 -->
        <div v-if="errorMsg" class="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3">
          <XCircle class="w-6 h-6 text-red-500 shrink-0" />
          <p class="text-xs font-bold text-red-700">{{ errorMsg }}</p>
        </div>
      </div>
    </div>
  </main>
</template>
