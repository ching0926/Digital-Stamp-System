<script setup lang="ts">
import { X } from 'lucide-vue-next'

// 後台共用彈窗殼：標題列 + 可捲動內容 + 底部動作區（由 slot 提供）
defineProps<{ title: string; subtitle?: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-6"
    @click.self="emit('close')"
  >
    <div
      class="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85dvh]"
    >
      <div class="flex items-start justify-between gap-4 p-5 border-b border-gray-100 shrink-0">
        <div>
          <h3 class="text-base font-black text-gray-800">{{ title }}</h3>
          <p v-if="subtitle" class="text-[11px] text-gray-400 mt-0.5">{{ subtitle }}</p>
        </div>
        <button
          type="button"
          class="p-1.5 -m-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          @click="emit('close')"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-5">
        <slot />
      </div>

      <div v-if="$slots.actions" class="p-5 border-t border-gray-100 shrink-0 flex gap-3">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
