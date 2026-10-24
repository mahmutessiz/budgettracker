export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  nitro: {
    externals: {
      // pdfkit @noble/hashes v1, better-auth v2 kullanıyor; dış bırakılınca
      // izleyici iki sürümü karıştırıyor. Paketin içine gömünce her biri doğru sürümü çözer.
      inline: ['pdfkit', '@noble/hashes', '@noble/ciphers'],
    },
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'tr' },
      title: 'defter.',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#FFD43B' },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Geist:wght@400;500;600&family=Geist+Mono:wght@500;600&display=swap',
        },
      ],
    },
  },
})
