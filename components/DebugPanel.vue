<script setup lang="ts">
import { X, Copy, Check } from 'lucide-vue-next'
import type { ScanTarget } from '~/utils/scanTarget'

// `?debug=1` 才會掛上來的診斷面板。手機上沒有 devtools，掃碼進站到底收到什麼參數、
// 是在哪一跳掉的，只能靠這裡看。內容可一鍵複製，方便直接貼給開發者。
const props = defineProps<{ target: ScanTarget | null; bootUrl: string }>()

const user = useUserStore()
const campaign = useCampaignStore()
const liff = useLiffStatus()

const open = ref(true)
const copied = ref(false)
const log = ref(readBootLog())

const report = computed(() =>
  [
    `本次進站網址：${props.bootUrl}`,
    `目前網址：${import.meta.client ? window.location.href : ''}`,
    `referrer：${import.meta.client ? document.referrer || '(無)' : ''}`,
    `解析結果：${props.target ? JSON.stringify(props.target) : 'null（沒讀到 ?s= / ?c=）'}`,
    '',
    `LIFF 有設定：${liff.value.configured}`,
    `LIFF 可用：${liff.value.usable}`,
    `在 LINE 內開啟：${liff.value.inClient ?? '(未執行)'}`,
    `已登入 LINE：${liff.value.loggedIn ?? '(未執行)'}`,
    `取得 ID token：${liff.value.hasIdToken ?? '(未執行)'}`,
    `LIFF 錯誤：${liff.value.error || '(無)'}`,
    '',
    `使用者：${user.user?.displayName ?? '(未登入)'} / ${user.user?.id ?? '-'}`,
    `活動：${campaign.title || '(未載入)'} / ${campaign.campaignId || '-'}`,
    '',
    '最近進站記錄：',
    ...log.value.map((e) => `  ${e.at}  ${e.url}`),
  ].join('\n'),
)

async function copyReport() {
  try {
    await navigator.clipboard.writeText(report.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    /* 沒有剪貼簿權限就算了，內容本來就看得到 */
  }
}
</script>

<template>
  <div v-if="open" class="absolute inset-x-2 bottom-24 z-[70] max-h-[55vh] flex flex-col bg-slate-900 text-slate-100 rounded-[20px] shadow-2xl border border-slate-700">
    <div class="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700 shrink-0">
      <span class="text-xs font-extrabold tracking-tight flex-1">診斷資訊</span>
      <button
        class="h-7 px-2.5 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center gap-1 text-2xs font-bold"
        @click="copyReport"
      >
        <component :is="copied ? Check : Copy" class="w-3.5 h-3.5" />
        <span>{{ copied ? '已複製' : '複製' }}</span>
      </button>
      <button class="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center" title="關閉" @click="open = false">
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
    <pre class="flex-1 overflow-auto px-4 py-3 text-3xs leading-relaxed whitespace-pre-wrap break-all">{{ report }}</pre>
  </div>
</template>
