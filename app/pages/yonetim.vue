<script setup lang="ts">
import type { AdminUserDTO } from '#shared/types/api'

useHead({ title: 'Kullanıcılar — defter.' })

const toast = useToast()
const { data: users, refresh, status } = await useFetch<AdminUserDTO[]>('/api/admin/users', { default: () => [] })

const WORDS = ['kavun', 'lacivert', 'çınar', 'martı', 'pusula', 'limon', 'fener', 'kestane', 'yaprak', 'bulut', 'kuzey', 'zeytin', 'karpuz', 'vapur', 'simit', 'mercan']

function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint32Array(3))
  return `${WORDS[bytes[0]! % WORDS.length]}-${WORDS[bytes[1]! % WORDS.length]}-${10 + (bytes[2]! % 90)}`
}

const name = ref('')
const email = ref('')
const password = ref('')
const submitted = ref(false)
const saving = ref(false)
const error = ref('')
const created = ref<{ name: string; email: string; password: string } | null>(null)

onMounted(() => (password.value = generatePassword()))

const nameError = computed(() => (submitted.value && !name.value.trim() ? 'Ad gerekli' : ''))
const emailError = computed(() => (submitted.value && !/^\S+@\S+\.\S+$/.test(email.value.trim()) ? 'Geçerli bir e-posta gir' : ''))
const passwordError = computed(() => (submitted.value && password.value.length < 8 ? 'En az 8 karakter' : ''))

async function submit() {
  submitted.value = true
  error.value = ''
  if (nameError.value || emailError.value || passwordError.value) return
  saving.value = true
  try {
    const res = await $fetch<{ name: string; email: string }>('/api/admin/users', {
      method: 'POST',
      body: { name: name.value.trim(), email: email.value.trim(), password: password.value },
    })
    created.value = { ...res, password: password.value }
    name.value = ''
    email.value = ''
    password.value = generatePassword()
    submitted.value = false
    await refresh()
  } catch (e) {
    error.value = apiErrorMessage(e, 'Kullanıcı eklenemedi.')
  } finally {
    saving.value = false
  }
}

async function copyCreated() {
  if (!created.value) return
  try {
    await navigator.clipboard.writeText(`E-posta: ${created.value.email}\nGeçici şifre: ${created.value.password}`)
    toast.show('Giriş bilgileri kopyalandı')
  } catch {
    toast.show('Kopyalanamadı; elle seç ve kopyala.', { tone: 'error' })
  }
}

const fmtDate = (iso: string) => formatDateTR(iso.slice(0, 10))
function lastSeen(u: AdminUserDTO) {
  if (!u.lastLoginAt) return 'Hiç girmedi'
  const d = new Date(u.lastLoginAt)
  return toISODate(d) === todayISO() ? `Bugün ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : formatDateTR(toISODate(d))
}
const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase('tr-TR'))
    .join('')
</script>

<template>
  <div class="page">
    <header class="top">
      <h1 class="page-title">Kullanıcılar</h1>
      <span class="muted">{{ users.length }} hesap</span>
    </header>

    <div class="layout">
      <section aria-label="Kullanıcı listesi" class="card list">
        <div v-if="status === 'error'" class="notice notice--error" role="alert">
          <AppIcon name="alert" />
          <span>Liste yüklenemedi.</span>
        </div>
        <div v-else class="table-scroll">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">Kullanıcı</th>
                <th scope="col">Rol</th>
                <th scope="col">Eklendi</th>
                <th scope="col">Son giriş</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td>
                  <div class="who">
                    <span class="avatar" :data-admin="u.role === 'admin'" aria-hidden="true">{{ initials(u.name) }}</span>
                    <div class="who-text">
                      <div class="who-name">{{ u.name }}</div>
                      <div class="muted small">{{ u.email }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge" :class="{ 'badge--ink': u.role === 'admin' }">{{ u.role === 'admin' ? 'Yönetici' : 'Kullanıcı' }}</span>
                </td>
                <td class="mono muted small nowrap">{{ fmtDate(u.createdAt) }}</td>
                <td class="small nowrap" :class="{ muted: !u.lastLoginAt }">
                  {{ lastSeen(u) }}
                  <div v-if="u.mustChangePassword" class="muted tiny">geçici şifrede</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="new-user" class="card form-card">
        <div class="form-head">
          <h2 id="new-user" class="section-title">Yeni kullanıcı</h2>
        </div>
        <form class="form" novalidate @submit.prevent="submit">
          <label class="field">
            Ad soyad
            <span class="input-wrap" :data-invalid="Boolean(nameError)"><input v-model="name" autocomplete="off" placeholder="Örn. Ece Arslan" maxlength="80" /></span>
            <span v-if="nameError" class="field-error">{{ nameError }}</span>
          </label>
          <label class="field">
            E-posta
            <span class="input-wrap" :data-invalid="Boolean(emailError)"><input v-model="email" type="email" autocomplete="off" placeholder="ornek@ev.local" /></span>
            <span v-if="emailError" class="field-error">{{ emailError }}</span>
          </label>
          <label class="field">
            Geçici şifre
            <span class="input-wrap" :data-invalid="Boolean(passwordError)">
              <input v-model="password" class="mono" autocomplete="off" spellcheck="false" />
              <button type="button" class="addon" @click="password = generatePassword()">Yeniden üret</button>
            </span>
            <span v-if="passwordError" class="field-error">{{ passwordError }}</span>
            <span v-else class="field-hint">Kişiye sen ileteceksin. İlk girişte değiştirmesi istenir.</span>
          </label>
          <button type="submit" class="btn btn--primary btn--lg" :disabled="saving">
            {{ saving ? 'Ekleniyor…' : 'Kullanıcıyı ekle' }}
          </button>

          <div v-if="error" class="notice notice--error" role="alert">
            <AppIcon name="alert" />
            <span>{{ error }}</span>
          </div>
          <div v-if="created" class="notice notice--ok created" role="status">
            <AppIcon name="check" :stroke="3" />
            <div class="created-body">
              <span><strong>{{ created.name }}</strong> eklendi. Giriş bilgilerini kendisine ilet:</span>
              <span class="mono">{{ created.email }} · {{ created.password }}</span>
              <button type="button" class="btn-link" @click="copyCreated">Bilgileri kopyala</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
}
.top {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-4);
}
.layout {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--space-7);
}
.list {
  flex: 3 1 520px;
  padding: 0;
  overflow: hidden;
}
.list .notice {
  margin: var(--space-5);
}
.table {
  min-width: 560px;
}
.who {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.who-text {
  min-width: 0;
}
.who-name {
  font-weight: 600;
}
.avatar {
  width: 40px;
  height: 40px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--rule);
  border-radius: 50%;
  background: var(--color-surface);
  font-weight: 600;
  font-size: 14px;
}
.avatar[data-admin='true'] {
  background: var(--color-accent);
  color: var(--color-on-accent);
}
.small {
  font-size: 14px;
}
.tiny {
  font-size: var(--text-xs);
}
.nowrap {
  white-space: nowrap;
}
.form-card {
  flex: 2 1 360px;
  padding: 0;
  overflow: hidden;
}
.form-head {
  padding: 18px var(--space-6);
  background: var(--color-accent);
  color: var(--color-on-accent);
  border-bottom: var(--rule);
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-6);
}
.created-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.created .btn-link {
  min-height: 36px;
  align-self: flex-start;
}
</style>
