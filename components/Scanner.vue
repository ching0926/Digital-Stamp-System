<script setup lang="ts">
import { ArrowLeft, Zap, CheckCircle, Info, Sparkles, AlertCircle, XCircle } from 'lucide-vue-next'

const props = defineProps<{ activeScanStationId: string | null }>()
const emit = defineEmits<{ close: [] }>()

const campaign = useCampaignStore()

const flashlight = ref(false)
const successToast = ref<string | null>(null)
const errorToast = ref<string | null>(null)
const cameraBlocked = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
let stream: MediaStream | null = null

const stampable = computed(() => campaign.stampableStations)
const activeLoc = computed(
  () => stampable.value.find((l) => l.id === props.activeScanStationId) ?? stampable.value[0],
)

// 本機測試用的 QR tokens（點擊即模擬掃描該點集章）
const devTokens = ref<{ stationId: string; name: string; token: string; geo: { lat: number; lng: number } }[]>([])

async function getGeo(): Promise<{ lat: number; lng: number } | undefined> {
  if (!navigator.geolocation) return undefined
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(undefined),
      { timeout: 4000 },
    )
  })
}

async function submitToken(token: string, forcedGeo?: { lat: number; lng: number }) {
  try {
    // 開發面板可帶入該點座標以通過圍籬；正式掃碼則用實際 GPS
    const geo = forcedGeo ?? (await getGeo())
    const res = await campaign.collect(token, geo)
    if (res.alreadyCollected) {
      successToast.value = `提醒：您之前已經收集過「${res.stationName}」的印章囉！`
    } else {
      successToast.value = `集章成功！已收集 ${res.stationName}`
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
    }
    setTimeout(() => {
      successToast.value = null
      emit('close')
    }, 2000)
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusMessage?: string }
    errorToast.value = e.data?.message ?? e.statusMessage ?? '集章失敗，請再試一次'
    setTimeout(() => (errorToast.value = null), 3000)
  }
}

onMounted(async () => {
  // 相機預覽（best-effort）
  if (navigator.mediaDevices?.getUserMedia) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      if (videoRef.value) videoRef.value.srcObject = stream
    } catch {
      cameraBlocked.value = true
    }
  } else {
    cameraBlocked.value = true
  }

  // 載入本機測試 tokens
  try {
    const data = await $fetch<{ tokens: typeof devTokens.value }>('/api/dev/tokens')
    devTokens.value = data.tokens
  } catch {
    devTokens.value = []
  }
})

onBeforeUnmount(() => {
  stream?.getTracks().forEach((t) => t.stop())
})

async function toggleFlashlight() {
  flashlight.value = !flashlight.value
  const track = stream?.getVideoTracks()[0]
  if (track) {
    try {
      const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }
      if (caps.torch) {
        await track.applyConstraints({ advanced: [{ torch: flashlight.value } as MediaTrackConstraintSet] })
      }
    } catch {
      /* 無手電筒能力 */
    }
  }
}

const activeDevToken = computed(() =>
  devTokens.value.find((t) => t.stationId === activeLoc.value?.id) ?? null,
)
</script>

<template>
  <div class="absolute inset-0 bg-black z-50 flex flex-col justify-between overflow-hidden">
    <!-- 成功 toast -->
    <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-6" leave-active-class="transition duration-200" leave-to-class="opacity-0 -translate-y-6">
      <div v-if="successToast" class="absolute top-16 left-4 right-4 z-50 flex items-center gap-3 p-4 bg-[#ECFDF5] border border-[#10B981]/20 text-[#065F46] shadow-xl rounded-[24px]">
        <div class="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center text-white shrink-0">
          <CheckCircle class="w-5 h-5 fill-current" />
        </div>
        <div>
          <p class="text-sm font-bold tracking-tight">集章結果</p>
          <p class="text-xs text-[#047857] mt-0.5">{{ successToast }}</p>
        </div>
      </div>
    </Transition>

    <!-- 錯誤 toast -->
    <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 -translate-y-6" leave-active-class="transition duration-200" leave-to-class="opacity-0 -translate-y-6">
      <div v-if="errorToast" class="absolute top-16 left-4 right-4 z-50 flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-800 shadow-xl rounded-[24px]">
        <div class="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white shrink-0">
          <XCircle class="w-5 h-5" />
        </div>
        <div>
          <p class="text-sm font-bold tracking-tight">集章失敗</p>
          <p class="text-xs text-red-600 mt-0.5">{{ errorToast }}</p>
        </div>
      </div>
    </Transition>

    <!-- 頂部列 -->
    <div class="relative h-16 px-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-10">
      <button class="w-10 h-10 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-[24px] flex items-center justify-center" @click="emit('close')">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <span class="text-sm font-bold text-white tracking-wide">掃描集章條碼</span>
      <div class="w-10 h-10" />
    </div>

    <!-- 相機視窗 -->
    <div class="absolute inset-0 w-full h-full flex items-center justify-center">
      <div v-if="cameraBlocked" class="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div class="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 text-gray-500 mb-4 animate-pulse">
          <Sparkles class="w-8 h-8 text-orange-400" />
        </div>
        <p class="text-sm text-gray-300 font-bold">虛擬相機已啟動</p>
        <p class="text-xs text-gray-500 max-w-[260px] leading-relaxed mt-2">偵測到目前處於網頁預覽環境。請用下方「測試面板」完成集章體驗！</p>
      </div>
      <video v-else ref="videoRef" autoplay playsinline muted class="w-full h-full object-cover" />

      <div class="absolute inset-0 pointer-events-none bg-black/40" />

      <!-- 掃描框 -->
      <div class="absolute w-64 h-64 z-20 pointer-events-none flex items-center justify-center">
        <div class="absolute left-0 top-0 w-8 h-8 border-t-4 border-l-4 border-[#FF8C00] rounded-tl-[16px]" />
        <div class="absolute right-0 top-0 w-8 h-8 border-t-4 border-r-4 border-[#FF8C00] rounded-tr-[16px]" />
        <div class="absolute left-0 bottom-0 w-8 h-8 border-b-4 border-l-4 border-[#FF8C00] rounded-bl-[16px]" />
        <div class="absolute right-0 bottom-0 w-8 h-8 border-b-4 border-r-4 border-[#FF8C00] rounded-br-[16px]" />
        <div class="absolute left-[3%] right-[3%] h-0.5 bg-gradient-to-r from-transparent via-[#FF8C00] to-transparent shadow-[0_0_12px_#FF8C00] animate-scanline" />
        <div class="absolute -bottom-10 whitespace-nowrap text-xs text-white bg-black/60 px-3 py-1.5 rounded-[12px] flex items-center gap-1.5">
          <Info class="w-3.5 h-3.5 text-[#FF8C00]" />
          <span>請對準點位的 QR Code</span>
        </div>
      </div>
    </div>

    <!-- 底部面板 -->
    <div class="relative z-30 px-6 pb-28 pt-4 bg-gradient-to-t from-black/90 via-black/80 to-transparent flex flex-col gap-4">
      <!-- 本機測試面板 -->
      <template v-if="devTokens.length">
        <div class="bg-white/10 rounded-[20px] p-3.5 border border-white/5 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <span class="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">目標點位</span>
            <span class="text-sm font-extrabold text-white truncate block mt-0.5">{{ activeLoc?.name }}</span>
          </div>
          <button
            class="px-4 py-2 bg-[#FF8C00] hover:bg-[#E07B00] text-white text-xs font-bold rounded-[16px] flex items-center gap-1 shrink-0 shadow-[0_4px_12px_rgba(255,140,0,0.3)] disabled:opacity-40"
            :disabled="!activeDevToken"
            @click="activeDevToken && submitToken(activeDevToken.token, activeDevToken.geo)"
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>對焦掃描</span>
          </button>
        </div>

        <div class="bg-black/40 rounded-[24px] p-3 border border-white/5">
          <p class="text-[10px] text-gray-400 font-bold px-2 mb-2 flex items-center gap-1">
            <AlertCircle class="w-3.5 h-3.5 text-orange-400" />
            <span>開發測試快捷區：點擊即模擬掃描該點位 QR</span>
          </p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="t in devTokens"
              :key="t.stationId"
              class="px-2.5 py-1.5 rounded-[12px] text-[11px] font-bold text-left transition-colors truncate flex items-center justify-between"
              :class="campaign.isCollected(t.stationId)
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/40'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'"
              @click="submitToken(t.token, t.geo)"
            >
              <span class="truncate">{{ t.name.replace('加蚋仔', '') }}</span>
              <span class="text-[9px] font-bold opacity-80 scale-90">{{ campaign.isCollected(t.stationId) ? '已集' : '集章' }}</span>
            </button>
          </div>
        </div>
      </template>

      <div class="flex justify-center mt-2">
        <button
          class="w-14 h-14 rounded-[28px] flex items-center justify-center transition-all"
          :class="flashlight ? 'bg-white text-gray-900' : 'bg-black/60 text-white border border-white/10 hover:bg-black/80'"
          title="手電筒"
          @click="toggleFlashlight"
        >
          <Zap class="w-6 h-6" :class="flashlight ? 'fill-current' : ''" />
        </button>
      </div>
    </div>
  </div>
</template>
