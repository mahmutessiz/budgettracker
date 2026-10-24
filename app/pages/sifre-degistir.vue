<script setup lang="ts">
definePageMeta({ layout: 'bare' })
useHead({ title: 'Şifreni değiştir — defter.' })

const { user, signOut } = useAuthUser()
const current = ref('')
const next = ref('')
const repeat = ref('')
const loading = ref(false)
const error = ref('')

const forced = computed(() => Boolean(user.value?.mustChangePassword))

async function submit() {
  error.value = ''
  if (next.value.length < 8) return (error.value = 'Yeni şifre en az 8 karakter olmalı.')
  if (next.value !== repeat.value) return (error.value = 'Yeni şifreler birbirini tutmuyor.')
  loading.value = true
  try {
    await $fetch('/api/me/password', { method: 'POST', body: { currentPassword: current.value, newPassword: next.value } })
    await navigateTo('/')
  } catch (e) {
    error.value = apiErrorMessage(e, 'Şifre değiştirilemedi.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="wrap">
    <form class="card form" novalidate @submit.prevent="submit">
      <span class="wordmark">defter.</span>
      <div class="head">
        <h1 class="section-title title">Şifreni değiştir</h1>
        <p class="muted">
          {{ forced ? 'Hesabın geçici bir şifreyle açıldı. Devam etmeden önce kendi şifreni belirle.' : 'Mevcut şifreni ve yenisini gir.' }}
        </p>
      </div>

      <label class="field">
        {{ forced ? 'Geçici şifre' : 'Mevcut şifre' }}
        <span class="input-wrap"><input v-model="current" type="password" autocomplete="current-password" /></span>
      </label>
      <label class="field">
        Yeni şifre
        <span class="input-wrap"><input v-model="next" type="password" autocomplete="new-password" minlength="8" /></span>
        <span class="field-hint">En az 8 karakter.</span>
      </label>
      <label class="field">
        Yeni şifre (tekrar)
        <span class="input-wrap"><input v-model="repeat" type="password" autocomplete="new-password" /></span>
      </label>

      <button type="submit" class="btn btn--primary btn--lg" :disabled="loading">
        {{ loading ? 'Kaydediliyor…' : 'Şifremi kaydet' }}
      </button>

      <div v-if="error" class="notice notice--error" role="alert">
        <AppIcon name="alert" />
        <span>{{ error }}</span>
      </div>

      <button type="button" class="btn-link" @click="signOut">Çıkış yap</button>
    </form>
  </div>
</template>

<style scoped>
.wrap {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-4);
}
.form {
  width: 100%;
  max-width: 460px;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-8);
  box-shadow: 8px 8px 0 var(--color-ink);
}
.wordmark {
  align-self: flex-start;
  padding: 2px 10px;
  border: var(--rule);
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 24px;
  letter-spacing: -0.03em;
}
.head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.head p {
  margin: 0;
}
.title {
  font-size: 32px;
}
</style>
