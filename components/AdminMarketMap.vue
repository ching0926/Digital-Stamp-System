<script setup lang="ts">
import { Image as ImageIcon, Plus, Trash2 } from 'lucide-vue-next'

const admin = useAdminStore()
const { show: toast, showError } = useAdminToast()

const uploading = ref(false)

async function pickImage(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  const campaign = admin.activeCampaign
  if (!file || !campaign) return

  uploading.value = true
  try {
    const url = await admin.uploadImage(file)
    await admin.updateCampaign(campaign.id, { marketMapUrl: url })
    toast('活動地圖已更新')
  } catch (err) {
    showError(err, '活動地圖上傳失敗')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

// 保留貼網址這條路：圖已經在別處（社群、雲端硬碟）時不必先下載再上傳
const urlInput = ref('')
const applyingUrl = ref(false)

async function applyUrl() {
  const campaign = admin.activeCampaign
  const url = urlInput.value.trim()
  if (!campaign || !url) return

  applyingUrl.value = true
  try {
    await admin.updateCampaign(campaign.id, { marketMapUrl: url })
    urlInput.value = ''
    toast('活動地圖已更新')
  } catch (err) {
    showError(err, '活動地圖設定失敗')
  } finally {
    applyingUrl.value = false
  }
}

const confirmClear = ref(false)

async function clearMap() {
  confirmClear.value = false
  const campaign = admin.activeCampaign
  if (!campaign) return
  try {
    await admin.updateCampaign(campaign.id, { marketMapUrl: '' })
    toast('已移除活動地圖')
  } catch (err) {
    showError(err)
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-black tracking-tight flex items-center gap-2">
          <ImageIcon class="w-5 h-5 text-emerald-600" />
          活動地圖
        </h2>
        <p class="text-xs text-gray-400 mt-1">
          設定市集攤位配置圖。前台地圖分頁只顯示這張圖（可平移縮放），攤位改由清單進入。
          可直接上傳本機圖片，或貼上現成的圖片網址。
        </p>
      </div>
      <button
        v-if="admin.activeCampaign?.marketMapUrl"
        class="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 font-bold rounded-xl text-xs transition-colors shrink-0"
        @click="confirmClear = true"
      >
        <Trash2 class="w-4 h-4" />
        移除活動地圖
      </button>
    </div>

    <!-- 貼圖片網址（上傳之外的另一條路） -->
    <div class="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row gap-2 sm:items-center">
      <label class="text-xs font-bold text-gray-500 shrink-0 sm:w-24">圖片網址</label>
      <input
        v-model="urlInput"
        type="url"
        placeholder="https://example.com/market-map.jpg"
        class="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
        @keyup.enter="applyUrl"
      >
      <button
        class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-40 shrink-0"
        :disabled="applyingUrl || !urlInput.trim()"
        @click="applyUrl"
      >
        {{ applyingUrl ? '套用中…' : '套用' }}
      </button>
    </div>

    <div class="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex justify-center">
      <div v-if="admin.activeCampaign?.marketMapUrl" class="w-full max-w-2xl flex flex-col gap-4">
        <div class="aspect-video rounded-2xl border border-gray-100 overflow-hidden bg-gray-50">
          <img
            :src="admin.activeCampaign.marketMapUrl"
            alt="活動地圖"
            class="w-full h-full object-contain"
          />
        </div>
        <label
          class="self-center flex items-center gap-2 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs cursor-pointer transition-colors"
        >
          <ImageIcon class="w-4 h-4" />
          {{ uploading ? '上傳中…' : '更換圖片' }}
          <input type="file" accept="image/*" class="hidden" @change="pickImage" />
        </label>
      </div>

      <label
        v-else
        class="w-full max-w-2xl aspect-video rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/80 transition-colors flex flex-col items-center justify-center gap-4 cursor-pointer text-emerald-600"
      >
        <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <Plus class="w-8 h-8" />
        </div>
        <div class="text-center">
          <span class="font-bold text-lg block mb-1">
            {{ uploading ? '上傳中…' : '點擊上傳活動地圖' }}
          </span>
          <span class="text-xs text-emerald-600/70">支援 JPG、PNG、WebP，5MB 以內</span>
        </div>
        <input type="file" accept="image/*" class="hidden" @change="pickImage" />
      </label>
    </div>

    <AdminConfirm
      v-if="confirmClear"
      message="確定要移除這張活動地圖嗎？"
      confirm-label="移除"
      @confirm="clearMap"
      @cancel="confirmClear = false"
    />
  </div>
</template>
