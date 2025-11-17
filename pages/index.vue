<template>
  <div class="container">
    <h1>可用安装包</h1>
    <div v-if="!list.length">
      <p>目录 <code>ipas/</code> 中没有 IPA 文件。请把 .ipa 放到此目录后刷新。</p>
    </div>
    <ul v-else class="ipa-list">
      <li v-for="item in list" :key="item.file" class="ipa-item">
        <div class="meta">
          <div style="display:flex;align-items:center;gap:12px">
            <img v-if="item.icon" :src="item.icon" alt="icon" style="width:48px;height:48px;border-radius:10px;object-fit:cover" />
            <div>
              <strong>{{ item.title || item.file }}</strong>
              <small class="muted">{{ item.file }} — {{ item.bundleIdentifier }} {{ item.bundleVersion }}</small>
            </div>
          </div>
        </div>
        <div class="actions">
          <a class="btn" :href="installHref(item)">安装</a>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
const { data: list } = await useFetch('/api/list')
function installHref(item) {
  return `/app/${encodeURIComponent(item.file)}`
}
</script>
