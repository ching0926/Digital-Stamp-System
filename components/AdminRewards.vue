<script setup lang="ts">
import { Gift, Plus, Edit2, Trash2, Coffee, FileText, Award } from 'lucide-vue-next'
import type { AdminReward } from '~/stores/admin'

const admin = useAdminStore()
const { show: toast, showError } = useAdminToast()

const ICONS = [
  { value: 'postcard', label: '明信片', icon: FileText },
  { value: 'coffee', label: '飲品', icon: Coffee },
  { value: 'bag', label: '袋物 / 周邊', icon: Gift },
] as const

const iconOf = (type: string) =>
  type === 'coffee' ? Coffee : type === 'bag' ? Gift : type === 'postcard' ? FileText : Award

const formOpen = ref(false)
const editingId = ref('')
const saving = ref(false)

const emptyForm = () => ({
  title: '',
  rewardName: '',
  requirementCount: 3,
  iconType: 'postcard' as AdminReward['iconType'],
  stock: -1,
  perUserLimit: 1,
})
const form = reactive(emptyForm())

function openCreate() {
  editingId.value = ''
  Object.assign(form, emptyForm())
  formOpen.value = true
}

function openEdit(r: AdminReward) {
  editingId.value = r.id
  Object.assign(form, {
    title: r.title,
    rewardName: r.rewardName,
    requirementCount: r.requirementCount,
    iconType: r.iconType,
    stock: r.stock,
    perUserLimit: r.perUserLimit,
  })
  formOpen.value = true
}

async function save() {
  if (!form.title.trim() || !form.rewardName.trim()) {
    toast('請填寫獎項名稱與兌換品項', 'error')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await admin.updateReward(editingId.value, { ...form })
      toast(`已更新獎項：${form.title}`)
    } else {
      await admin.createReward({ ...form })
      toast(`已新增獎項：${form.title}`)
    }
    formOpen.value = false
  } catch (err) {
    showError(err)
  } finally {
    saving.value = false
  }
}

const confirmTarget = ref<AdminReward | null>(null)

async function doDelete() {
  const target = confirmTarget.value
  confirmTarget.value = null
  if (!target) return
  try {
    await admin.deleteReward(target.id)
    toast(`已刪除獎項：${target.title}`)
  } catch (err) {
    showError(err)
  }
}

// 可集章的點數上限，提醒營運別把門檻設得無法達成
const stampableCount = computed(() => admin.stations.filter((s) => !s.noStamp).length)
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-black tracking-tight flex items-center gap-2">
          <Gift class="w-5 h-5 text-emerald-600" />
          獎項設定
        </h2>
        <p class="text-xs text-gray-400 mt-1">
          設定集滿幾章可兌換什麼。目前此活動有 {{ stampableCount }} 個可集章點位。
        </p>
      </div>
      <button
        class="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors shrink-0"
        @click="openCreate"
      >
        <Plus class="w-4 h-4 stroke-[3]" />
        新增獎項
      </button>
    </div>

    <p
      v-if="admin.rewards.length === 0"
      class="bg-white rounded-2xl border border-gray-100 p-10 text-center text-xs text-gray-400"
    >
      尚無獎項，點右上角新增。
    </p>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="reward in admin.rewards"
        :key="reward.id"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 text-emerald-600"
          >
            <component :is="iconOf(reward.iconType)" class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <h4 class="font-black text-gray-800 text-sm line-clamp-1">{{ reward.title }}</h4>
            <p class="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{{ reward.rewardName }}</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <span class="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold">
            集滿 {{ reward.requirementCount }} 章
          </span>
          <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-[11px] font-bold">
            {{ reward.stock < 0 ? '不限量' : `庫存 ${reward.stock}` }}
          </span>
          <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-[11px] font-bold">
            每人 {{ reward.perUserLimit }} 次
          </span>
        </div>

        <p
          v-if="stampableCount > 0 && reward.requirementCount > stampableCount"
          class="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5"
        >
          門檻高於可集章點位數（{{ stampableCount }}），民眾無法達成。
        </p>

        <div class="flex gap-2 mt-auto pt-1">
          <button
            class="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-500 font-bold rounded-xl text-xs transition-colors"
            @click="openEdit(reward)"
          >
            <Edit2 class="w-3.5 h-3.5" />
            編輯
          </button>
          <button
            class="px-3 py-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-colors"
            title="刪除"
            @click="confirmTarget = reward"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <AdminModal
      v-if="formOpen"
      :title="editingId ? '編輯獎項' : '新增獎項'"
      subtitle="兌換門檻與品項"
      @close="formOpen = false"
    >
      <form id="reward-form" class="flex flex-col gap-4" @submit.prevent="save">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-bold text-gray-600">獎項名稱 *</span>
          <input
            v-model="form.title"
            class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            placeholder="例：集章小禮"
          />
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-bold text-gray-600">兌換品項 *</span>
          <input
            v-model="form.rewardName"
            class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            placeholder="例：加蚋仔限定明信片"
          />
        </label>

        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-bold text-gray-600">圖示</span>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in ICONS"
              :key="opt.value"
              type="button"
              class="flex flex-col items-center gap-1.5 py-3 rounded-xl border text-[11px] font-bold transition-colors"
              :class="
                form.iconType === opt.value
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
              "
              @click="form.iconType = opt.value"
            >
              <component :is="opt.icon" class="w-5 h-5" />
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">兌換門檻（章）*</span>
            <input
              v-model.number="form.requirementCount"
              type="number"
              min="1"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">庫存（-1 不限）</span>
            <input
              v-model.number="form.stock"
              type="number"
              min="-1"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-600">每人可兌換次數</span>
            <input
              v-model.number="form.perUserLimit"
              type="number"
              min="1"
              class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>
        </div>
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
          form="reward-form"
          :disabled="saving"
          class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl text-sm transition-colors"
        >
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
      </template>
    </AdminModal>

    <AdminConfirm
      v-if="confirmTarget"
      :message="`確定要刪除獎項「${confirmTarget.title}」嗎？此動作無法復原。`"
      @confirm="doDelete"
      @cancel="confirmTarget = null"
    />
  </div>
</template>
