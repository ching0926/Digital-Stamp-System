// 後台共用的提示訊息。用 useState 讓頁面外殼與各分頁元件共享同一份狀態，
// 分頁元件操作完直接 toast()，由 admin.vue 統一顯示。
export function useAdminToast() {
  const message = useState<string>('adminToast', () => '')
  const tone = useState<'ok' | 'error'>('adminToastTone', () => 'ok')
  const timer = useState<ReturnType<typeof setTimeout> | null>('adminToastTimer', () => null)

  function show(msg: string, kind: 'ok' | 'error' = 'ok') {
    message.value = msg
    tone.value = kind
    if (timer.value) clearTimeout(timer.value)
    timer.value = setTimeout(() => {
      message.value = ''
    }, 3000)
  }

  // 從 API 錯誤取出後端的中文訊息（後端一律用 createError 的 message）
  function showError(err: unknown, fallback = '操作失敗，請再試一次') {
    const e = err as { data?: { message?: string }; statusMessage?: string }
    show(e.data?.message ?? e.statusMessage ?? fallback, 'error')
  }

  return { message, tone, show, showError }
}
