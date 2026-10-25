<script setup lang="ts">
const { categories } = useCategories()
import type { ExpenseDTO } from '#shared/types/api'
import type { CategoryId } from '#shared/utils/categories'
import type { RatesPayload } from '#shared/utils/currency'

const { state, close } = useExpenseModal()
const toast = useToast()

const amountText = ref('')
const category = ref<CategoryId>(categories.value[0]?.id ?? '')
const date = ref(todayISO())
const description = ref('')
const note = ref('')
const submitted = ref(false)
const saving = ref(false)
const serverError = ref('')
const savedNote = ref('')

const amountInput = ref<HTMLInputElement>()
const dialog = ref<HTMLElement>()
let returnFocus: HTMLElement | null = null

const editing = computed(() => state.value.editing)
const amountMinor = computed(() => parseAmountInput(amountText.value))
const amountError = computed(() => (submitted.value && amountMinor.value === null ? 'Geçerli bir tutar gir (ör. 486,30)' : ''))
const descError = computed(() => (submitted.value && !description.value.trim() ? 'Ne için harcadığını yaz' : ''))
const dateError = computed(() => (submitted.value && !isISODate(date.value) ? 'Geçerli bir tarih seç' : ''))

const yesterday = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toISODate(d)
})

// Kaydedilecek kur: düzenlemede tarih değişmediyse kayıttaki kur, değilse o günün kuru.
const dateRates = ref<RatesPayload | null>(null)
const rateFailed = ref(false)
let rateTimer: ReturnType<typeof setTimeout> | undefined

watch(
  [() => state.value.open, date],
  ([open, d]) => {
    clearTimeout(rateTimer)
    if (!open || !isISODate(d)) return
    const e = editing.value
    if (e && e.date === d && e.fxDate && e.fxRates) {
      dateRates.value = { base: 'TRY', date: e.fxDate, rates: e.fxRates, fetchedAt: 0, stale: false }
      rateFailed.value = false
      return
    }
    rateTimer = setTimeout(async () => {
      try {
        dateRates.value = await $fetch<RatesPayload>('/api/rates', { query: { date: d } })
        rateFailed.value = false
      } catch {
        dateRates.value = null
        rateFailed.value = true
      }
    }, 250)
  },
  { immediate: true },
)

/** Yazarken döviz karşılığı (kaydedilecek kurla) */
const preview = computed(() => {
  if (amountMinor.value === null) return ''
  if (rateFailed.value) return 'Kur şu an alınamadı; kayıt sonra kendi tarihinin kuruyla tamamlanır.'
  const r = dateRates.value
  if (!r?.date) return ''
  const parts = FOREIGN_CURRENCIES.map((code) => {
    const v = convertMinor(amountMinor.value!, code, r.rates)
    return v === null ? null : formatAmount(v, code)
  }).filter(Boolean)
  return `${parts.join(' · ')} — ${formatDateTR(r.date)} kuruyla kaydedilir`
})

function fill(e: ExpenseDTO | null) {
  amountText.value = e ? minorToInput(e.amount) : ''
  category.value = e?.category ?? (categories.value.some((c) => c.id === category.value) ? category.value : categories.value[0]?.id ?? '')
  date.value = e?.date ?? todayISO()
  description.value = e?.description ?? ''
  note.value = e?.note ?? ''
  submitted.value = false
  serverError.value = ''
  savedNote.value = ''
}

watch(
  () => state.value.open,
  async (open) => {
    if (!import.meta.client) return
    if (open) {
      returnFocus = document.activeElement as HTMLElement | null
      fill(state.value.editing)
      document.body.style.overflow = 'hidden'
      await nextTick()
      amountInput.value?.focus()
    } else {
      document.body.style.overflow = ''
      returnFocus?.focus?.()
    }
  },
)

async function save(keepOpen: boolean) {
  submitted.value = true
  serverError.value = ''
  if (amountMinor.value === null || !description.value.trim() || !isISODate(date.value)) return
  if (!categories.value.some((c) => c.id === category.value)) {
    serverError.value = 'L?tfen bir kategori se?in.'
    return
  }
  saving.value = true
  const body = {
    amount: amountMinor.value,
    date: date.value,
    category: category.value,
    description: description.value.trim(),
    note: note.value.trim() || null,
  }
  try {
    if (editing.value) {
      await $fetch(`/api/expenses/${editing.value.id}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/expenses', { method: 'POST', body })
    }
    await refreshNuxtData()
    if (keepOpen && !editing.value) {
      savedNote.value = `Kaydedildi: ${body.description} · ${formatAmount(body.amount / 100, 'TRY')}`
      amountText.value = ''
      description.value = ''
      note.value = ''
      submitted.value = false
      amountInput.value?.focus()
    } else {
      close()
    }
  } catch (error) {
    serverError.value = apiErrorMessage(error, 'Kaydedilemedi, tekrar dene.')
    toast.show(serverError.value, { tone: 'error' })
  } finally {
    saving.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
    return
  }
  if (e.key !== 'Tab' || !dialog.value) return
  const focusables = dialog.value.querySelectorAll<HTMLElement>(
    'button:not(:disabled), input, textarea, select, [href], [tabindex]:not([tabindex="-1"])',
  )
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last?.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first?.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="state.open" class="backdrop" @pointerdown.self="close" @keydown="onKeydown">
      <div ref="dialog" class="dialog" role="dialog" aria-modal="true" aria-labelledby="expense-title">
        <div class="head">
          <h2 id="expense-title" class="title">{{ editing ? 'Harcamayı düzenle' : 'Yeni harcama' }}</h2>
          <button type="button" class="icon-btn icon-btn--thick" aria-label="Kapat" @click="close">
            <AppIcon name="close" :stroke="3" />
          </button>
        </div>

        <form class="body" novalidate @submit.prevent="save(false)">
          <label class="field">
            Tutar
            <span class="input-wrap amount" :data-invalid="Boolean(amountError)">
              <span class="amount-sym" aria-hidden="true">₺</span>
              <input
                ref="amountInput"
                v-model="amountText"
                inputmode="decimal"
                autocomplete="off"
                placeholder="0,00"
                aria-describedby="amount-help"
                :aria-invalid="Boolean(amountError)"
              />
            </span>
            <span v-if="amountError" class="field-error">{{ amountError }}</span>
            <span v-else id="amount-help" class="field-hint mono">{{ preview || 'Türk lirası girilir; döviz karşılığı o günün kuruyla saklanır' }}</span>
          </label>

          <fieldset class="cats">
            <legend class="legend">Kategori</legend>
            <div class="chips">
              <button
                v-for="c in categories"
                :key="c.id"
                type="button"
                class="chip"
                :aria-pressed="category === c.id"
                @click="category = c.id"
              >
                <span class="swatch swatch--dot chip-dot" :style="{ background: c.cssColor }" aria-hidden="true" />
                {{ c.name }}
              </button>
            </div>
          </fieldset>

          <div class="row">
            <label class="field grow">
              Tarih
              <span class="input-wrap" :data-invalid="Boolean(dateError)">
                <AppIcon name="calendar" :size="18" />
                <input v-model="date" type="date" class="mono" :max="todayISO()" />
              </span>
              <span v-if="dateError" class="field-error">{{ dateError }}</span>
            </label>
            <div class="quick" role="group" aria-label="Hızlı tarih">
              <button type="button" class="chip quick-btn" :aria-pressed="date === todayISO()" @click="date = todayISO()">Bugün</button>
              <button type="button" class="chip quick-btn" :aria-pressed="date === yesterday" @click="date = yesterday">Dün</button>
            </div>
          </div>

          <label class="field">
            Açıklama
            <span class="input-wrap" :data-invalid="Boolean(descError)">
              <input v-model="description" maxlength="120" placeholder="Örn. Migros" />
            </span>
            <span v-if="descError" class="field-error">{{ descError }}</span>
          </label>

          <label class="field">
            <span>Not <span class="field-hint">(isteğe bağlı)</span></span>
            <span class="input-wrap">
              <textarea v-model="note" rows="2" maxlength="500" placeholder="Örn. haftalık alışveriş" />
            </span>
          </label>

          <p v-if="savedNote" class="notice notice--ok" role="status">
            <AppIcon name="check" :stroke="3" />
            <span>{{ savedNote }}</span>
          </p>

          <div class="actions">
            <button type="button" class="btn-link" @click="close">Vazgeç</button>
            <div class="actions-main">
              <button v-if="!editing" type="button" class="btn" :disabled="saving" @click="save(true)">Kaydet, yenisini ekle</button>
              <button type="submit" class="btn btn--primary" :disabled="saving" :data-loading="saving">
                {{ saving ? 'Kaydediliyor…' : editing ? 'Değişiklikleri kaydet' : 'Kaydet' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 6vh var(--space-4) var(--space-6);
  overflow-y: auto;
  background-color: var(--color-backdrop);
}
.dialog {
  width: 100%;
  max-width: 640px;
  background: var(--color-surface);
  border: var(--rule);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6) var(--space-5) var(--space-7);
  background: var(--color-accent);
  color: var(--color-on-accent);
  border-bottom: var(--rule);
}
.title {
  font-size: 30px;
  letter-spacing: -0.03em;
}
.body {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-7);
}
.amount {
  min-height: 88px;
  padding: 0 20px;
}
.amount-sym {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 44px;
  color: var(--color-muted);
}
.amount input {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(36px, 8vw, 56px);
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}
.cats {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
.legend {
  padding: 0;
  margin-bottom: 10px;
  font-weight: 600;
  font-size: var(--text-base);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 16px 0 12px;
  border: var(--rule);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-ink);
  font: 500 var(--text-base) var(--font-body);
  cursor: pointer;
  white-space: nowrap;
}
.chip:hover {
  background: var(--color-accent-soft);
}
.chip[aria-pressed='true'] {
  background: var(--color-ink);
  color: var(--color-surface);
  box-shadow: 3px 3px 0 var(--color-accent);
  font-weight: 600;
}
.chip[aria-pressed='true'] .chip-dot {
  border-color: var(--color-surface);
}
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-4);
}
.grow {
  flex: 1 1 220px;
}
.quick {
  flex: 1 1 200px;
  display: flex;
  gap: 10px;
}
.quick-btn {
  flex: 1;
  min-height: 52px;
  border-radius: var(--radius);
  padding: 0 12px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-top: var(--space-5);
  border-top: var(--rule);
}
.actions-main {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.notice {
  margin: 0;
}
@media (max-width: 520px) {
  .body {
    padding: var(--space-5);
  }
  .head {
    padding: var(--space-4) var(--space-4) var(--space-4) var(--space-5);
  }
  .title {
    font-size: 24px;
  }
  .actions-main,
  .actions-main .btn {
    width: 100%;
  }
}
</style>
