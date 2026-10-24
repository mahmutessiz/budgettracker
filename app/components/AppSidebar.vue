<script setup lang="ts">
const { user, signOut } = useAuthUser()
const theme = useTheme()
const themeIcon = computed(() => ({ system: 'contrast', light: 'sun', dark: 'moon' }) as const)
const isAdmin = computed(() => user.value?.role === 'admin')

const items = computed(() =>
  isAdmin.value
    ? [{ to: '/yonetim', label: 'Kullanıcılar', icon: 'users' as const }]
    : [
        { to: '/', label: 'Panel', icon: 'panel' as const },
        { to: '/harcamalar', label: 'Harcamalar', icon: 'list' as const },
        { to: '/istatistikler', label: 'İstatistikler', icon: 'pie' as const },
      ],
)

const initials = computed(() =>
  (user.value?.name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase('tr-TR'))
    .join(''),
)
</script>

<template>
  <aside class="sidebar" :data-admin="isAdmin">
    <div class="brand">
      <div class="brand-row">
        <NuxtLink :to="isAdmin ? '/yonetim' : '/'" class="wordmark">defter.</NuxtLink>
        <button
          type="button"
          class="icon-btn icon-btn--thick theme-btn"
          :aria-label="`Tema: ${theme.label.value}. Değiştir`"
          :title="`Tema: ${theme.label.value}`"
          @click="theme.cycle"
        >
          <AppIcon :name="themeIcon[theme.pref.value]" />
        </button>
      </div>
      <span v-if="isAdmin" class="role">YÖNETİCİ</span>
    </div>

    <nav :aria-label="isAdmin ? 'Yönetim menüsü' : 'Ana menü'" class="nav">
      <NuxtLink v-for="item in items" :key="item.to" :to="item.to" class="nav-link">
        <AppIcon :name="item.icon" :size="22" />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div v-if="user" class="me">
      <span class="avatar" aria-hidden="true">{{ initials }}</span>
      <div class="me-text">
        <div class="me-name">{{ user.name }}</div>
        <div class="me-mail">{{ user.email }}</div>
      </div>
      <button type="button" class="icon-btn icon-btn--thick logout" aria-label="Çıkış yap" @click="signOut">
        <AppIcon name="logout" />
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  flex: 0 0 248px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding: var(--space-7) var(--space-5);
  border-right: var(--rule);
  background: var(--color-paper);
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100dvh;
}
.sidebar[data-admin='true'] {
  background: var(--color-inverse);
  color: var(--color-on-inverse);
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}
.brand-row {
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.wordmark {
  display: inline-block;
  padding: 2px 10px;
  border: var(--rule);
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: var(--color-on-accent);
  box-shadow: var(--shadow-sm);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 28px;
  letter-spacing: -0.03em;
  text-decoration: none;
  white-space: nowrap;
}
.wordmark:hover {
  color: var(--color-on-accent);
}
[data-admin='true'] .wordmark {
  border-color: var(--color-on-inverse);
  box-shadow: none;
}
.role {
  border: 2px solid currentColor;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 48px;
  padding: 0 14px;
  border: 3px solid transparent;
  border-radius: var(--radius-sm);
  color: inherit;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
}
.nav-link:hover {
  background: var(--color-accent-soft);
  color: var(--color-ink);
}
.nav-link.router-link-exact-active {
  border-color: var(--color-ink);
  background: var(--color-accent);
  color: var(--color-on-accent);
  box-shadow: var(--shadow);
  font-weight: 600;
}
[data-admin='true'] .nav-link.router-link-exact-active {
  border-color: var(--color-on-inverse);
  box-shadow: 4px 4px 0 var(--color-on-inverse);
}

.me {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-top: var(--space-5);
  border-top: 3px solid currentColor;
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
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-weight: 600;
  font-size: 14px;
}
[data-admin='true'] .avatar {
  border-color: var(--color-on-inverse);
}
.me-text {
  flex: 1;
  min-width: 0;
}
.me-name {
  font-weight: 600;
  font-size: var(--text-base);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.me-mail {
  font-size: var(--text-sm);
  color: var(--color-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-admin='true'] .me-mail {
  color: var(--color-on-inverse-muted);
}
[data-admin='true'] .theme-btn,
[data-admin='true'] .logout {
  border-color: var(--color-on-inverse);
  background: var(--color-inverse);
  color: var(--color-on-inverse);
}
[data-admin='true'] .theme-btn:hover,
[data-admin='true'] .logout:hover {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

/* Telefonda üst çubuk */
@media (max-width: 900px) {
  .sidebar {
    position: static;
    height: auto;
    flex: 1 1 100%;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3) var(--space-4);
    padding: var(--space-4);
    border-right: 0;
    border-bottom: var(--rule);
  }
  .brand {
    flex-direction: row;
    align-items: center;
  }
  .wordmark {
    font-size: 22px;
  }
  .nav {
    order: 3;
    flex: 1 1 100%;
    flex-direction: row;
    overflow-x: auto;
    padding: 2px 6px 8px 2px;
  }
  .nav-link {
    min-height: 44px;
    padding: 0 12px;
  }
  .me {
    margin: 0 0 0 auto;
    padding: 0;
    border: 0;
  }
  .me-text {
    display: none;
  }
}
</style>
