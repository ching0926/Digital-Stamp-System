<script setup lang="ts">
import { ArrowLeft, Zap, CheckCircle, Info, Sparkles, XCircle, Award, ScanLine } from 'lucide-vue-next'
import jsQR from 'jsqr'

const emit = defineEmits<{ close: []; goCard: [] }>()

const campaign = useCampaignStore()
const { public: publicConfig } = useRuntimeConfig()

const flashlight = ref(false)
const errorToast = ref<string | null>(null)
const cameraBlocked = ref(false)
const processing = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
let stream: MediaStream | null = null

// 掃描結果：有值時全螢幕接管，停留等使用者按按鈕（不自動關閉）
const result = ref<{ already: boolean; stationName: string } | null>(null)

// 即時 QR 解碼用
let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let rafId = 0
let lastDecodeAt = 0

// 圍籬關閉時就不要跟使用者要定位權限（少一個彈窗、也省掉 timeout 等待）
async function getGeo(): Promise<{ lat: number; lng: number } | undefined> {
  if (!publicConfig.geofenceEnforce) return undefined
  if (!navigator.geolocation) return undefined
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(undefined),
      { timeout: 4000 },
    )
  })
}

async function submitToken(token: string) {
  if (processing.value) return // 防止重複送出（同一張 QR 會連續解到多幀）
  processing.value = true
  try {
    const geo = await getGeo()
    const res = await campaign.collect(token, geo)
    result.value = { already: res.alreadyCollected, stationName: res.stationName }
    if (!res.alreadyCollected && navigator.vibrate) navigator.vibrate([100, 50, 100])
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusMessage?: string }
    errorToast.value = e.data?.message ?? e.statusMessage ?? '集章失敗，請再試一次'
    setTimeout(() => (errorToast.value = null), 3000)
    processing.value = false // 留在掃描畫面，允許直接重掃
  }
}

// 關掉結果畫面回到取景狀態，繼續掃下一個點位
function scanAgain() {
  result.value = null
  processing.value = false
}

// 逐幀從相機畫面解碼 QR（節流約每 200ms 一次）
function scanFrame(ts: number) {
  const v = videoRef.value
  if (v && ctx && canvas && !processing.value && v.readyState >= 2 && ts - lastDecodeAt > 200) {
    lastDecodeAt = ts
    const w = v.videoWidth
    const h = v.videoHeight
    if (w && h) {
      canvas.width = w
      canvas.height = h
      ctx.drawImage(v, 0, 0, w, h)
      const img = ctx.getImageData(0, 0, w, h)
      const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })
      if (code?.data) submitToken(code.data)
    }
  }
  rafId = requestAnimationFrame(scanFrame)
}

onMounted(async () => {
  // 開相機 + 啟動即時解碼（相機需 HTTPS 或 localhost）
  if (navigator.mediaDevices?.getUserMedia) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      if (videoRef.value) {
        videoRef.value.srcObject = stream
        await videoRef.value.play().catch(() => {})
      }
      canvas = document.createElement('canvas')
      ctx = canvas.getContext('2d', { willReadFrequently: true })
      rafId = requestAnimationFrame(scanFrame)
    } catch {
      cameraBlocked.value = true
    }
  } else {
    cameraBlocked.value = true
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
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
</script>

<template>
  <div class="absolute inset-0 bg-black z-50 flex flex-col justify-between overflow-hidden">
    <!-- 錯誤 toast（留在取景畫面，可直接重掃）-->
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
        <p class="text-sm text-gray-300 font-bold">相機無法啟動</p>
        <p class="text-xs text-gray-500 max-w-[260px] leading-relaxed mt-2">請確認已授權相機，且網址為 HTTPS 或 localhost（http 區網無法開相機）。</p>
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

    <!-- 底部：手電筒 -->
    <div class="relative z-30 px-6 pb-28 pt-4 bg-gradient-to-t from-black/90 via-black/80 to-transparent flex justify-center">
      <button
        class="w-14 h-14 rounded-[28px] flex items-center justify-center transition-all"
        :class="flashlight ? 'bg-white text-gray-900' : 'bg-black/60 text-white border border-white/10 hover:bg-black/80'"
        title="手電筒"
        @click="toggleFlashlight"
      >
        <Zap class="w-6 h-6" :class="flashlight ? 'fill-current' : ''" />
      </button>
    </div>

    <!-- 集章結果：全螢幕接管，停留等使用者操作 -->
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 scale-95" leave-active-class="transition duration-200" leave-to-class="opacity-0">
      <div
        v-if="result"
        class="absolute inset-0 z-[60] flex flex-col items-center justify-center px-8 text-center"
        :class="result.already
          ? 'bg-gradient-to-b from-[#FF8C00] to-[#E07B00]'
          : 'bg-gradient-to-b from-[#10B981] to-[#059669]'"
      >
        <div class="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mb-6">
          <component :is="result.already ? Info : CheckCircle" class="w-16 h-16 text-white" />
        </div>

        <p class="text-2xl font-extrabold text-white tracking-tight">
          {{ result.already ? '這個章你已經收集過了' : '集章成功！' }}
        </p>
        <p class="text-base font-bold text-white/90 mt-2">{{ result.stationName }}</p>

        <!-- 進度 -->
        <div class="mt-8 w-full max-w-[280px]">
          <p class="text-sm font-extrabold text-white">
            第 {{ campaign.collectedCount }} / {{ campaign.totalCount }} 個章
          </p>
          <div class="w-full h-2.5 bg-white/25 rounded-full overflow-hidden mt-2.5">
            <div
              class="h-full bg-white rounded-full transition-all duration-700 ease-out"
              :style="{ width: `${campaign.progressPercent}%` }"
            />
          </div>
        </div>

        <div class="mt-10 w-full max-w-[280px] flex flex-col gap-3">
          <button
            class="w-full py-3.5 bg-white text-gray-900 text-sm font-extrabold rounded-[20px] shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            @click="scanAgain"
          >
            <ScanLine class="w-4 h-4" />
            <span>繼續掃描</span>
          </button>
          <button
            class="w-full py-3.5 bg-white/15 hover:bg-white/25 text-white text-sm font-extrabold rounded-[20px] border border-white/25 active:scale-95 transition-all flex items-center justify-center gap-2"
            @click="emit('goCard')"
          >
            <Award class="w-4 h-4" />
            <span>看集章卡</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
