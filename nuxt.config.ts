import { defineNuxtConfig } from 'nuxt/config'
// import { resolve } from 'path'

export default defineNuxtConfig({
  ssr: true,
  // nitro: {
  //   preset: 'node',
  //   publicAssets: [
  //     // {
  //     //   dir: resolve('./ipas'),
  //     //   baseURL: 'files',
  //     //   maxAge: 0
  //     // }
  //   ]
  // },
  vite: ( {
    server: {
      // bind dev server to all interfaces so LAN devices can access
      // cast to any to avoid strict TS mismatch in some environments
      host: '0.0.0.0' as any
    }
  } as any ),
  css: [ '~/public/css/style.css' ]
})
