interface Toast {
  id: number
  message: string
  tone: 'info' | 'error'
  actionLabel?: string
  action?: () => void | Promise<void>
}

let timer: ReturnType<typeof setTimeout> | undefined

export function useToast() {
  const toast = useState<Toast | null>('toast', () => null)

  function dismiss() {
    clearTimeout(timer)
    toast.value = null
  }

  function show(message: string, opts: Omit<Toast, 'id' | 'message' | 'tone'> & { tone?: Toast['tone'] } = {}) {
    clearTimeout(timer)
    toast.value = { id: Date.now(), message, tone: opts.tone ?? 'info', actionLabel: opts.actionLabel, action: opts.action }
    timer = setTimeout(dismiss, opts.action ? 8000 : 4000)
  }

  return { toast, show, dismiss }
}
