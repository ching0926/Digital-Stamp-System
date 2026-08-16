<script setup lang="ts">
import { Compass, Plus, Calendar, Edit2, Trash2, Users } from 'lucide-vue-next'
import type { AdminCampaign } from '~/stores/admin'

const emit = defineEmits<{ open: [campaignId: string] }>()

const admin = useAdminStore()
const { show: toast, showError } = useAdminToast()

type Filter = 'all' | 'active' | 'draft' | 'ended'
const filter = ref<Filter>('all')
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '啟用中' },
  { key: 'draft', label: '草稿' },
  { key: 'ended', label: '已封存' },
]

const filtered = computed(() =>
  filter.value === 'all'
    ? admin.campaigns
    : admin.campaigns.filter((c) => c.status === filter.value),
)

// 表單（新增與編輯共用）。editingId 為空字串代表新增
const formOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const form = reactive({
  title: '',
  description: '',
  startAt: '',
  endAt: '',
  type: 'district' as 'district' | 'market',
  targetStampCount: 6,
  staffPasscode: '',
  status: 'draft' as AdminCampaign['status'],
})

// <input type="date"> 只吃 yyyy-MM-dd
const toDateInput = (v: string) => (v ? new Date(v).toISOString().slice(0, 10) : '')

function openCreate() {
  editingId.value = ''
  const today = new Date()
  const later = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
  Object.assign(form, {
    title: '',
    description: '',
    startAt: today.toISOString().slice(0, 10),
    endAt: later.toISOString().slice(0, 10),
    type: 'district',
    targetStampCount: 6,
    staffPasscode: '',
    status: 'draft',
  })
  formOpen.value = true
}

function openEdit(c: AdminCampaign) {
  editingId.value = c.id
  Object.assign(form, {
    title: c.title,
    description: c.description,
    startAt: toDateInput(c.startAt),
    endAt: toDateInput(c.endAt),
    type: c.type,
    targetStampCount: c.targetStampCount,
    staffPasscode: c.staffPasscode ?? '',
    status: c.status,
  })
  formOpen.value = true
}

async function save() {
  if (!form.title.trim()) {
    toast('請填寫活動名稱', 'error')
    return
  }
  // 留空代表沿用系統預設核銷碼，有填就一定要是 4 碼數字（後端也會再擋一次）
  if (form.staffPasscode.trim() && !/^\d{4}$/.test(form.staffPasscode.trim())) {
    toast('核銷碼請設定 4 位數字', 'error')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await admin.updateCampaign(editingId.value, { ...form })
      toast(`已更新活動：${form.title}`)
    } else {
      await admin.createCampaign({ ...form })
      toast(`已建立活動：${form.title}`)
    }
    formOpen.value = false
  } catch (err) {
    showError(err)
  } finally {
    saving.value = false
  }
}

async function changeStatus(c: AdminCampaign, status: AdminCampaign['status']) {
  try {
    await admin.updateCampaign(c.id, { status })
    toast(`「${c.title}」狀態已更新`)
  } catch (err) {
    showError(err)
  }
}

const confirmTarget = ref<AdminCampaign | null>(null)

async function doDelete() {
  const target = confirmTarget.value
  confirmTarget.value = null
  if (!target) return
  try {
    await admin.deleteCampaign(target.id)
    toast(`已刪除活動：${target.title}`)
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
          <Compass class="w-5 h-5 text-emerald-600" />
          集章活動總覽
        </h2>
        <p class="text-xs text-gray-400 mt-1">
          建立不同季節、商圈或市集的主題集章活動。點擊活動即可管理其內容。
        </p>
      </div>
      <button
        class="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors shrink-0"
        @click="openCreate"
      >
        <Plus class="w-4 h-4 stroke-[3]" />
        建立新活動
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

    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[820px]">
          <thead>
            <tr
              class="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold"
            >
              <th class="p-4 w-1/3">活動名稱</th>
              <th class="p-4 w-24">類別</th>
              <th class="p-4 min-w-[170px]">活動時間</th>
              <th class="p-4 w-24">參與人數</th>
              <th class="p-4 w-32">狀態</th>
              <th class="p-4 w-32">管理</th>
              <th class="p-4 w-24 text-center">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 text-sm">
            <tr v-if="filtered.length === 0">
              <td colspan="7" class="p-10 text-center text-xs text-gray-400">
                尚無符合條件的活動
              </td>
            </tr>
            <tr
              v-for="camp in filtered"
              :key="camp.id"
              class="group hover:bg-gray-50 transition-colors cursor-pointer"
              @click="emit('open', camp.id)"
            >
              <td class="p-4">
                <div class="font-bold text-gray-800 group-hover:text-emerald-700 line-clamp-2">
                  {{ camp.title }}
                </div>
                <div v-if="camp.description" class="text-xs text-gray-400 line-clamp-1 mt-0.5">
                  {{ camp.description }}
                </div>
              </td>
              <td class="p-4">
                <span class="inline-flex px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                  {{ camp.type === 'market' ? '市集' : '商圈' }}
                </span>
              </td>
              <td class="p-4">
                <div class="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar class="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span class="whitespace-nowrap">
                    {{ toDateInput(camp.startAt) }} ~ {{ toDateInput(camp.endAt) }}
                  </span>
                </div>
              </td>
              <td class="p-4">
                <div class="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users class="w-3.5 h-3.5 text-gray-400" />
                  {{ camp.participantsCount }}
                </div>
              </td>
              <td class="p-4">
                <select
                  :value="camp.status"
                  class="text-xs font-bold px-2 py-1 rounded border focus:outline-none cursor-pointer"
                  :class="
                    camp.status === 'active'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : camp.status === 'draft'
                        ? 'bg-gray-100 border-gray-200 text-gray-600'
                        : 'bg-red-50 border-red-100 text-red-600'
                  "
                  @click.stop
                  @change="
                    changeStatus(camp, ($event.target as HTMLSelectElement).value as AdminCampaign['status'])
                  "
                >
                  <option value="active">啟用中</option>
                  <option value="draft">草稿</option>
                  <option value="ended">已封存</option>
                </select>
              </td>
              <td class="p-4">
                <button
                  class="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                  @click.stop="emit('open', camp.id)"
                >
                  管理活動 ➔
                </button>
              </td>
              <td class="p-4">
                <div class="flex items-center justify-center gap-1">
                  <button
                    class="p-2 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-400 rounded-lg transition-colors"
                    title="編輯"
                    @click.stop="openEdit(camp)"
                  >
                    <Edit2 class="w-4 h-4" />
                  </button>
                  <button
                    class="p-2 bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-lg transition-colors"
                    title="刪除"
                    @click.stop="confirmTarget = camp"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AdminModal
      v-if="formOpen"
      :title="editingId ? '編輯活動' : '建立新活動'"
      subtitle="活動的基本資訊與檔期"
      @close="formOpen = false"
    >
      <form id="campaign-form" class="flex flex-col gap-4" @submit.prevent="save">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-bold text-gray-600">活動名稱 *</span>
          <input
            v-model="form.title"
            class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            placeholder="例：2026 加蚋仔春日漫遊集章祭"
          />
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-bold text-gray-600">活動說明</span>
          <textarea
            v-model="form.description"
            rows="3"
            class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white resize-none"
          />
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">開始日期</span>
            <input
              v-model="form.startAt"
              type="date"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">結束日期</span>
            <input
              v-model="form.endAt"
              type="date"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">活動類別</span>
            <select
              v-model="form.type"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            >
              <option value="district">商圈（景點）</option>
              <option value="market">市集（攤位）</option>
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">目標集章數</span>
            <input
              v-model.number="form.targetStampCount"
              type="number"
              min="0"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>
        </div>

        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-bold text-gray-600">現場核銷碼（4 碼數字）</span>
          <input
            v-model="form.staffPasscode"
            inputmode="numeric"
            maxlength="4"
            class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono tracking-[0.3em] focus:outline-none focus:border-emerald-400 focus:bg-white"
            placeholder="例：1234"
          />
          <span class="text-xs text-gray-400">
            民眾兌換獎項時，由現場工作人員在民眾手機上輸入這組碼完成核銷。留空則沿用系統預設核銷碼。
          </span>
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-bold text-gray-600">活動狀態</span>
          <select
            v-model="form.status"
            class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
          >
            <option value="draft">草稿</option>
            <option value="active">啟用中</option>
            <option value="ended">已封存</option>
          </select>
          <span class="text-xs text-gray-400">
            前台目前顯示最新一檔「啟用中」的活動。
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
          form="campaign-form"
          :disabled="saving"
          class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl text-sm transition-colors"
        >
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
      </template>
    </AdminModal>

    <AdminConfirm
      v-if="confirmTarget"
      :message="`確定要刪除活動「${confirmTarget.title}」嗎？其集章點與獎項會一併移除，此動作無法復原。`"
      @confirm="doDelete"
      @cancel="confirmTarget = null"
    />
  </div>
</template>
