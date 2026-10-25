<script lang="ts" setup>
import { CATEGORY_ICONS, type Category, type CategoryIcon } from '#shared/utils/categories'
const {data: categories, status, error, refresh} = await useFetch('/api/expenses/category', { key: 'categories' });

const modalOpen = ref(false);
const name = ref('');
const color = ref('#8A8578')
const icon = ref<CategoryIcon>('tag')
const colorChanged = ref(false)
const showMoreIcons = ref(false)
const visibleIcons = computed(() => showMoreIcons.value
  ? CATEGORY_ICONS
  : CATEGORY_ICONS.filter((option, index) => index < 10 || option === icon.value))
const iconLabels: Record<CategoryIcon, string> = {
  briefcase: 'İş', plane: 'Seyahat', utensils: 'Yemek', shirt: 'Giyim', paw: 'Evcil hayvan',
  dumbbell: 'Spor', phone: 'Telefon', laptop: 'Bilgisayar', leaf: 'Doğa', wallet: 'Cüzdan',
  users: 'Aile', calendar: 'Takvim', key: 'Anahtar', sun: 'Güneş', moon: 'Ay',
  tag: 'Etiket', home: 'Ev', cart: 'Market', receipt: 'Fatura', car: 'Ulaşım',
  music: 'Müzik', heart: 'Sağlık', gift: 'Hediye', book: 'Kitap', coffee: 'Kahve',
}
const saving = ref(false);
const saveError = ref('');
const editingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const deleteError = ref('')

function openModal() {
  editingId.value = null
  showMoreIcons.value = false
  name.value = ''
  color.value = '#8A8578'
  icon.value = 'tag'
  colorChanged.value = false
  saveError.value = ''
  modalOpen.value = true
}

function editCategory(category: Category) {
  editingId.value = category.id
  showMoreIcons.value = false
  name.value = category.name
  color.value = category.color
  icon.value = category.icon
  colorChanged.value = false
  saveError.value = ''
  modalOpen.value = true
}

async function deleteCategory(category: { id: string; name: string }) {
  if (deletingId.value || !window.confirm(`“${category.name}” kategorisi silinsin mi?`)) return
  deletingId.value = category.id
  deleteError.value = ''
  try {
    await $fetch(`/api/expenses/category/${encodeURIComponent(category.id)}`, { method: 'DELETE' })
    await refresh()
  } catch (error: unknown) {
    const status = (error as { statusCode?: number }).statusCode
    deleteError.value = status === 409
      ? 'Bu kategori harcamalarda kullanılıyor. Silmeden önce ilgili harcamaların kategorisini değiştirin.'
      : 'Kategori silinemedi. Tekrar deneyin.'
  } finally {
    deletingId.value = null
  }
}

async function saveCategory() {
  const trimmedName = name.value.trim()
  if (!trimmedName || saving.value) return

  saving.value = true
  saveError.value = ''

  try {
    await $fetch(editingId.value ? `/api/expenses/category/${encodeURIComponent(editingId.value)}` : '/api/expenses/category', {
      method: editingId.value ? 'PATCH' : 'POST',
      body: { name: trimmedName, icon: icon.value, ...(!editingId.value || colorChanged.value ? { color: color.value } : {}) },
    })

    modalOpen.value = false
    await refresh()
  } catch {
    saveError.value = 'Kategori kaydedilemedi. Tekrar deneyin.'
  } finally {
    saving.value = false
  }
}

</script>
<template>
  <div class="categories-page">
    <div style="width: 100%; display: flex; flex-direction: row; flex-wrap: wrap; justify-content: end; align-items: end;">
        <button type="button" class="btn btn--primary" :disabled="!!deletingId" @click="openModal">
            Kategori ekle
        </button>
    </div>
    <p v-if="status === 'pending'">Yükleniyor...</p>
    <p v-else-if="error">Kategoriler yüklenemedi.</p>
    <p v-else-if="!categories?.length">Henüz hiçbir kategori eklenmedi.</p>

    <ul v-else class="category-list">
        <li v-for="category in categories" :key="category.id">
          <span class="category-label"><AppIcon :name="category.icon" :style="{ color: category.cssColor }" />{{ category.name }}</span>
          <div class="category-row-actions">
            <button type="button" class="btn" :disabled="!!deletingId" :aria-label="`${category.name} kategorisini düzenle`" @click="editCategory(category)">Düzenle</button>
            <button type="button" class="btn" :disabled="!!deletingId" :aria-label="`${category.name} kategorisini sil`" @click="deleteCategory(category)">{{ deletingId === category.id ? 'Siliniyor...' : 'Sil' }}</button>
          </div>
        </li>
    </ul>
    <p v-if="deleteError" role="alert">{{ deleteError }}</p>

    <Teleport to="body">
    <div
      v-if="modalOpen"
      class="category-overlay"
      @click.self="!saving && (modalOpen = false)"
    >
      <section
        class="category-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-title"
      >
        <h2 id="category-title">{{ editingId ? 'Kategori düzenle' : 'Kategori ekle' }}</h2>

        <form @submit.prevent="saveCategory">
          <label for="category-name">Kategori adı</label>
          <input
            id="category-name"
            v-model="name"
            type="text"
            required
            maxlength="80"
            :disabled="saving"
          >

          <div class="color-field">
            <label for="category-color">Renk</label>
            <input id="category-color" v-model="color" type="color" :disabled="saving" @input="colorChanged = true">
            <span>{{ color }}</span>
          </div>

          <fieldset class="icon-field" :disabled="saving">
            <legend>Simge</legend>
            <div id="category-icon-options" class="icon-options">
              <button v-for="option in visibleIcons" :key="option" type="button"
                class="icon-option" :aria-label="iconLabels[option]" :title="iconLabels[option]"
                :aria-pressed="icon === option" @click="icon = option">
                <AppIcon :name="option" :size="24" />
              </button>
            </div>
            <button type="button" class="btn more-icons" :aria-expanded="showMoreIcons"
              aria-controls="category-icon-options" @click="showMoreIcons = !showMoreIcons">
              {{ showMoreIcons ? 'Daha az göster' : 'Daha fazla simge' }}
            </button>
          </fieldset>

          <div class="category-preview">
            <AppIcon :name="icon" :style="{ color }" />
            <span>{{ name.trim() || 'Kategori adı' }}</span>
          </div>

          <p v-if="saveError" role="alert">{{ saveError }}</p>

          <div class="category-actions">
            <button
              type="button"
              class="btn"
              :disabled="saving"
              @click="modalOpen = false"
            >
              Vazgeç
            </button>

            <button
              type="submit"
              class="btn btn--primary"
              :disabled="saving || !name.trim()"
            >
              {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
  </div>
</template>

<style scoped>
.category-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  list-style: none;
  padding: 0;
}
.category-label, .category-preview {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  overflow-wrap: anywhere;
}
.category-label svg, .category-preview svg { flex-shrink: 0; }
.color-field {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}
.color-field input[type='color'] {
  width: 48px;
  height: 40px;
  padding: 3px;
  margin: 0;
  cursor: pointer;
}
.icon-field { border: 0; padding: 0; margin: 1rem 0; }
.more-icons { margin-top: 0.75rem; width: 100%; }
.icon-options { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; margin-top: 0.5rem; }
.icon-option {
  display: grid;
  place-items: center;
  min-height: 44px;
  border: var(--rule);
  border-radius: var(--radius-sm);
  background: var(--color-paper);
  color: var(--color-ink);
  cursor: pointer;
}
.icon-option[aria-pressed='true'] { background: var(--color-accent); color: var(--color-on-accent); }
.icon-option:focus-visible { outline: 3px solid var(--color-ink); outline-offset: 2px; }
.category-preview { max-width: 100%; padding: 0.5rem 0; }
.category-list li {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  border: var(--rule);
  border-radius: var(--radius-sm);
}
.category-list li > span {
  overflow-wrap: anywhere;
}
@media (max-width: 1100px) {
  .category-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .category-list {
    grid-template-columns: minmax(0, 1fr);
  }
}
.category-row-actions {
  display: flex;
  gap: 0.5rem;
}
.category-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgb(0 0 0 / 50%);
}

.category-modal {
  box-sizing: border-box;
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  width: 100%;
  max-width: 400px;
  padding: 1.5rem;
  border-radius: 12px;
  background: Canvas;
  color: CanvasText;
}

.category-modal input {
  box-sizing: border-box;
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.75rem;
}

.category-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}
</style>
