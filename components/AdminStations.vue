<script setup lang="ts">
import { MapPin, Plus, Edit2, Trash2, Phone, Clock, QrCode, Ban } from 'lucide-vue-next'
import type { AdminStation } from '~/stores/admin'

const admin = useAdminStore()
const { show: toast, showError } = useAdminToast()

type Filter = 'all' | 'stamp' | 'noStamp'
const filter = ref<Filter>('all')
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'stamp', label: '可集章' },
  { key: 'noStamp', label: '僅展示' },
]

const filtered = computed(() => {
  if (filter.value === 'stamp') return admin.stations.filter((s) => !s.noStamp)
  if (filter.value === 'noStamp') return admin.stations.filter((s) => s.noStamp)
  return admin.stations
})

const formOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const uploading = ref(false)

const emptyForm = () => ({
  name: '',
  title: '',
  description: '',
  address: '',
  lat: 25.028,
  lng: 121.5,
  x: 50,
  y: 50,
  imgUrl: '',
  type: '',
  specialty: '',
  phone: '',
  hours: '',
  noStamp: false,
})
const form = reactive(emptyForm())

function openCreate() {
  editingId.value = ''
  Object.assign(form, emptyForm())
  formOpen.value = true
}

function openEdit(s: AdminStation) {
  editingId.value = s.id
  Object.assign(form, {
    name: s.name,
    title: s.title,
    description: s.description,
    address: s.address,
    lat: s.geo.lat,
    lng: s.geo.lng,
    x: s.mapCoord.x,
    y: s.mapCoord.y,
    imgUrl: s.imgUrl,
    type: s.type,
    specialty: s.specialty,
    phone: s.phone,
    hours: s.hours,
    noStamp: s.noStamp,
  })
  formOpen.value = true
}

async function pickImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    form.imgUrl = await admin.uploadImage(file)
    toast('圖片已上傳')
  } catch (err) {
    showError(err, '圖片上傳失敗')
  } finally {
    uploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function save() {
  if (!form.name.trim()) {
    toast(`請填寫${admin.unitLabel}名稱`, 'error')
    return
  }
  const payload = {
    name: form.name,
    title: form.title,
    description: form.description,
    address: form.address,
    geo: { lat: form.lat, lng: form.lng },
    mapCoord: { x: form.x, y: form.y },
    imgUrl: form.imgUrl,
    type: form.type,
    specialty: form.specialty,
    phone: form.phone,
    hours: form.hours,
    noStamp: form.noStamp,
  }
  saving.value = true
  try {
    if (editingId.value) {
      await admin.updateStation(editingId.value, payload)
      toast(`已更新${admin.unitLabel}：${form.name}`)
    } else {
      await admin.createStation(payload)
      toast(`已新增${admin.unitLabel}：${form.name}`)
    }
    formOpen.value = false
  } catch (err) {
    showError(err)
  } finally {
    saving.value = false
  }
}

const confirmTarget = ref<AdminStation | null>(null)

async function doDelete() {
  const target = confirmTarget.value
  confirmTarget.value = null
  if (!target) return
  try {
    await admin.deleteStation(target.id)
    toast(`已刪除${admin.unitLabel}：${target.name}`)
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
          <MapPin class="w-5 h-5 text-emerald-600" />
          {{ admin.unitLabel }}管理
        </h2>
        <p class="text-xs text-gray-400 mt-1">
          維護此活動的{{ admin.unitLabel }}資料。GPS 座標用於集章時的地理圍籬驗證。
        </p>
      </div>
      <button
        class="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors shrink-0"
        @click="openCreate"
      >
        <Plus class="w-4 h-4 stroke-[3]" />
        新增{{ admin.unitLabel }}
      </button>
    </div>

    <div class="flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="f in FILTERS"
        :key="f.key"
        class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors"
        :class="
          filter === f.key ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        "
        @click="filter = f.key"
      >
        {{ f.label }}
      </button>
    </div>

    <p v-if="filtered.length === 0" class="bg-white rounded-2xl border border-gray-100 p-10 text-center text-xs text-gray-400">
      尚無{{ admin.unitLabel }}，點右上角新增。
    </p>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="station in filtered"
        :key="station.id"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
      >
        <div class="h-32 bg-gray-100 relative shrink-0">
          <img
            v-if="station.imgUrl"
            :src="station.imgUrl"
            :alt="station.name"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
            <MapPin class="w-8 h-8" />
          </div>
          <span
            class="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm"
            :class="station.noStamp ? 'bg-gray-700/85 text-white' : 'bg-emerald-600/90 text-white'"
          >
            <component :is="station.noStamp ? Ban : QrCode" class="w-3 h-3" />
            {{ station.noStamp ? '僅展示' : '可集章' }}
          </span>
        </div>

        <div class="p-4 flex flex-col gap-2 flex-1">
          <div>
            <h4 class="font-black text-gray-800 text-sm">{{ station.name }}</h4>
            <p v-if="station.title" class="text-[11px] text-emerald-700 font-bold mt-0.5">
              {{ station.title }}
            </p>
          </div>
          <p v-if="station.address" class="text-[11px] text-gray-500 line-clamp-1">
            {{ station.address }}
          </p>
          <div class="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
            <span v-if="station.phone" class="flex items-center gap-1">
              <Phone class="w-3 h-3" />{{ station.phone }}
            </span>
            <span v-if="station.hours" class="flex items-center gap-1">
              <Clock class="w-3 h-3" />{{ station.hours }}
            </span>
          </div>
          <p class="text-[10px] text-gray-400 font-mono mt-auto pt-1">
            GPS {{ station.geo.lat.toFixed(5) }}, {{ station.geo.lng.toFixed(5) }}
          </p>

          <div class="flex gap-2 pt-2">
            <button
              class="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-500 font-bold rounded-xl text-xs transition-colors"
              @click="openEdit(station)"
            >
              <Edit2 class="w-3.5 h-3.5" />
              編輯
            </button>
            <button
              class="px-3 py-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-colors"
              title="刪除"
              @click="confirmTarget = station"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <AdminModal
      v-if="formOpen"
      :title="editingId ? `編輯${admin.unitLabel}` : `新增${admin.unitLabel}`"
      subtitle="名稱為必填，其餘欄位可稍後補上"
      @close="formOpen = false"
    >
      <form id="station-form" class="flex flex-col gap-4" @submit.prevent="save">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">{{ admin.unitLabel }}名稱 *</span>
            <input
              v-model="form.name"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
              placeholder="例：聚德宮"
            />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">副標題</span>
            <input
              v-model="form.title"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
              placeholder="例：百年信仰中心"
            />
          </label>
        </div>

        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-bold text-gray-600">介紹</span>
          <textarea
            v-model="form.description"
            rows="3"
            class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white resize-none"
          />
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-bold text-gray-600">地址</span>
          <input
            v-model="form.address"
            class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
          />
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">緯度 lat</span>
            <input
              v-model.number="form.lat"
              type="number"
              step="0.000001"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">經度 lng</span>
            <input
              v-model.number="form.lng"
              type="number"
              step="0.000001"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>
        </div>
        <p class="text-[11px] text-gray-400 -mt-2">
          可在 Google 地圖上對地點按右鍵複製座標。座標不準會導致地理圍籬誤擋。
        </p>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">地圖 X（%）</span>
            <input
              v-model.number="form.x"
              type="number"
              min="0"
              max="100"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">地圖 Y（%）</span>
            <input
              v-model.number="form.y"
              type="number"
              min="0"
              max="100"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-bold text-gray-600">照片</span>
          <div class="flex gap-2">
            <input
              v-model="form.imgUrl"
              placeholder="貼上圖片網址，或按右方上傳"
              class="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            />
            <label
              class="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs cursor-pointer transition-colors whitespace-nowrap flex items-center"
            >
              {{ uploading ? '上傳中…' : '上傳' }}
              <input type="file" accept="image/*" class="hidden" @change="pickImage" />
            </label>
          </div>
          <img
            v-if="form.imgUrl"
            :src="form.imgUrl"
            class="w-full h-32 object-cover rounded-xl border border-gray-100 mt-1"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">類型</span>
            <input
              v-model="form.type"
              list="station-types"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
              placeholder="例：古蹟廟宇"
            />
            <datalist id="station-types">
              <option value="古蹟廟宇" />
              <option value="人文歷史" />
              <option value="美食小吃" />
              <option value="特色商家" />
              <option value="市集攤位" />
            </datalist>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">特色 / 招牌</span>
            <input
              v-model="form.specialty"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">電話</span>
            <input
              v-model="form.phone"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">營業時間</span>
            <input
              v-model="form.hours"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>
        </div>

        <label
          class="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer"
        >
          <input v-model="form.noStamp" type="checkbox" class="mt-0.5 w-4 h-4 accent-emerald-600" />
          <span class="text-xs text-gray-600">
            <span class="font-bold">僅地圖展示，不可集章</span>
            <span class="block text-gray-400 mt-0.5">勾選後此點不會產生 QR，前台也無法集章。</span>
          </span>
        </label>
      </form>

      <template #actions>
        <button
          type="button"
          class="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-sm transition-colors"
          @click="formOpen = false"
        >
          取消
        </button>
        <button
          type="submit"
          form="station-form"
          :disabled="saving"
          class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl text-sm transition-colors"
        >
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
      </template>
    </AdminModal>

    <AdminConfirm
      v-if="confirmTarget"
      :message="`確定要刪除「${confirmTarget.name}」嗎？此動作無法復原。`"
      @confirm="doDelete"
      @cancel="confirmTarget = null"
    />
  </div>
</template>
