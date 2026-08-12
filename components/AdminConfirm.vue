<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'

// 刪除等破壞性操作前的確認對話框
defineProps<{ message: string; confirmLabel?: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-6"
    @click.self="emit('cancel')"
  >
    <div class="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-4">
      <div class="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
        <AlertTriangle class="w-7 h-7 text-red-500" />
      </div>
      <p class="text-sm text-gray-700 text-center leading-relaxed">{{ message }}</p>
      <div class="flex gap-3 w-full mt-1">
        <button
          type="button"
          class="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-sm transition-colors"
          @click="emit('cancel')"
        >
          取消
        </button>
        <button
          type="button"
          class="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm transition-colors"
          @click="emit('confirm')"
        >
          {{ confirmLabel ?? '確定刪除' }}
        </button>
      </div>
    </div>
  </div>
</template>
