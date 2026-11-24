<template>
  <div class="parameter-label">
    <label :for="inputId">{{ label }}</label>
    <details>
      <summary :aria-label="`Help for ${label}`">i</summary>
      <p>{{ help }}</p>
    </details>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  inputId: string
  label: string
  help: string
}>()
</script>

<style scoped>
.parameter-label {
  margin-bottom: 7px;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
}

details {
  display: inline;
}

summary {
  display: inline-grid;
  width: 24px;
  height: 24px;
  margin-left: 6px;
  place-items: center;
  border: 1px solid #93c5fd;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 400;
  vertical-align: middle;
  cursor: pointer;
}

summary::-webkit-details-marker {
  display: none;
}

p {
  margin-top: 6px;
  color: #475569;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.45;
}
</style>
