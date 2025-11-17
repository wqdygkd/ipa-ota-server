<template>
  <div class="container">
    <div style="display:flex;gap:16px;align-items:center">
      <img :src="meta && meta.icon" alt="icon" style="width:72px;height:72px;border-radius:12px;object-fit:cover" />
      <div>
        <h1 style="margin:0">{{ (meta && meta.title) || ipa }}</h1>
        <div class="muted">包名：{{ meta?.bundleIdentifier || '' }} · 版本：{{ meta?.bundleVersion || '' }}</div>
      </div>
    </div>
    <p style="margin-top:16px">
      <a class="btn" :href="installLink">安装</a>
      <a class="btn btn-light" :href="fetchurl" style="margin-left:8px">下载 IPA</a>
    </p>
  </div>
</template>

<script setup>
const route = useRoute()
const ipa = route.params.ipa
const { data: meta } = await useFetch(`/api/meta/${decodeURIComponent(ipa)}`)
const runtimeBase = useRuntimeConfig().public?.baseUrl

const headers = useRequestHeaders(['host', 'x-forwarded-proto'])
const origin = runtimeBase || (process.client ? window.location.origin : `${headers['x-forwarded-proto'] || 'https'}://${headers.host || ''}`)

const url = 'itms-services://?action=download-manifest&url='
// const fetchurl = `${origin}/files/${encodeURIComponent(ipa)}`
const fetchurl = `https://ghfast.top/https://github.com/wqdygkd/ipa-ota-server/blob/main/ipas/${encodeURIComponent(ipa)}`

const metaData = (meta && meta.value) || {}
// prefer cached public icon if generate-cache produced it, otherwise fall back to API
const iconSrc = metaData.icon ? `${origin}${metaData.icon}` : `${origin}/api/icon/${encodeURIComponent(ipa)}`

const Api = `https://api.palera.in/genPlist?bundleid=${encodeURIComponent(metaData.bundleIdentifier || '')}&name=${encodeURIComponent(metaData.title || ipa)}&version=${encodeURIComponent(metaData.bundleVersion || '')}&fetchurl=${encodeURIComponent(fetchurl)}`

const installLink = `${url}${encodeURIComponent(Api)}`
</script>
