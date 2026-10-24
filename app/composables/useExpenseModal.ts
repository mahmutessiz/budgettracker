import type { ExpenseDTO } from '#shared/types/api'

interface ModalState {
  open: boolean
  editing: ExpenseDTO | null
}

export function useExpenseModal() {
  const state = useState<ModalState>('expense-modal', () => ({ open: false, editing: null }))
  return {
    state,
    openNew: () => (state.value = { open: true, editing: null }),
    openEdit: (expense: ExpenseDTO) => (state.value = { open: true, editing: expense }),
    close: () => (state.value = { open: false, editing: null }),
  }
}
