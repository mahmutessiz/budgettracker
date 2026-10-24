<script setup lang="ts">
import { authClient } from '~/lib/auth-client'

definePageMeta({ layout: 'bare' })
useHead({ title: 'Giriş — defter.' })

const email = ref('')
const password = ref('')
const remember = ref(true)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!email.value.trim() || !password.value) {
    error.value = 'E-posta ve şifreni gir.'
    return
  }
  loading.value = true
  const { error: err } = await authClient.signIn.email({
    email: email.value.trim(),
    password: password.value,
    rememberMe: remember.value,
  })
  loading.value = false
  if (err) {
    error.value =
      err.status === 429
        ? 'Çok fazla deneme yaptın. Biraz bekleyip tekrar dene.'
        : 'E-posta ya da şifre yanlış. Tekrar dene veya yöneticiden şifreni sıfırlamasını iste.'
    return
  }
  // Ara katman yönlendirmeyi rolüne göre yapar.
  await navigateTo('/')
}
</script>

<template>
  <div class="login">
    <section class="hero">
      <span class="wordmark">defter.</span>
      <div class="hero-text">
        <h1 class="hero-title">Para nereye gitti?</h1>
        <p class="hero-sub">Harcamanı yaz, ay sonunda nereye gittiğini gör.</p>
      </div>
      <div class="swatches" aria-hidden="true">
        <span v-for="c in CATEGORIES.slice(0, 6)" :key="c.id" :style="{ background: c.cssColor }" />
      </div>
    </section>

    <section class="side">
      <form class="card form" novalidate @submit.prevent="submit">
        <div class="form-head">
          <h2 class="section-title form-title">Giriş yap</h2>
          <p class="muted">Hesabın yoksa yöneticiden iste.</p>
        </div>

        <label class="field">
          E-posta
          <span class="input-wrap">
            <input v-model="email" type="email" autocomplete="email" placeholder="ornek@ev.local" required />
          </span>
        </label>

        <label class="field">
          Şifre
          <span class="input-wrap">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
            />
            <button type="button" class="addon" :aria-pressed="showPassword" @click="showPassword = !showPassword">
              {{ showPassword ? 'Gizle' : 'Göster' }}
            </button>
          </span>
        </label>

        <label class="check">
          <input v-model="remember" type="checkbox" />
          Beni hatırla
        </label>

        <button type="submit" class="btn btn--primary btn--lg" :disabled="loading" :data-loading="loading">
          {{ loading ? 'Giriş yapılıyor…' : 'Giriş yap' }}
        </button>

        <div v-if="error" class="notice notice--error" role="alert">
          <AppIcon name="alert" />
          <span>{{ error }}</span>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  flex-wrap: wrap;
  min-height: 100vh;
  min-height: 100dvh;
}
.hero {
  flex: 1 1 420px;
  min-height: 320px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-10);
  padding: 48px 56px;
  background: var(--color-accent);
  color: var(--color-on-accent);
  border-right: var(--rule);
}
.wordmark {
  align-self: flex-start;
  padding: 2px 12px;
  border: var(--rule);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-ink);
  box-shadow: var(--shadow);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 32px;
  letter-spacing: -0.03em;
}
.hero-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.hero-title {
  max-width: 11ch;
  font-size: clamp(48px, 7vw, 84px);
  line-height: 0.95;
  letter-spacing: -0.045em;
  overflow-wrap: anywhere;
}
.hero-sub {
  margin: 0;
  max-width: 36ch;
  font-size: var(--text-lg);
}
.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.swatches span {
  width: 44px;
  height: 44px;
  border: var(--rule);
  border-radius: var(--radius-sm);
}
.side {
  flex: 1 1 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px var(--space-8);
}
.form {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 36px var(--space-8);
  border-radius: 14px;
  box-shadow: 8px 8px 0 var(--color-ink);
}
.form-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-head p {
  margin: 0;
}
.form-title {
  font-size: 34px;
  letter-spacing: -0.03em;
}
@media (max-width: 900px) {
  .hero {
    border-right: 0;
    border-bottom: var(--rule);
    padding: var(--space-8) var(--space-6);
    min-height: 0;
  }
  .side {
    padding: var(--space-8) var(--space-4);
  }
  .form {
    padding: var(--space-6);
  }
}
</style>
