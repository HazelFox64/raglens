<template>
  <label
    for="python-file"
    class="upload-area"
    :class="{ selected: selectedFile }"
  >
    <span class="upload-icon">
      {{ selectedFile ? '✓' : '↑' }}
    </span>

    <span class="upload-text">
      <strong>
        {{ selectedFile ? selectedFile.name : 'Upload a Python file' }}
      </strong>

      <span class="upload-description">
        {{ selectedFile ? 'File selected' : 'Click to choose a .py file' }}
      </span>
    </span>

    <input
      id="python-file"
      type="file"
      accept=".py"
      @change="handleFileChange"
    />
  </label>
</template>

<script setup lang="ts">
defineProps<{
  selectedFile: File | null
}>()

const emit = defineEmits<{
  fileSelected: [file: File]
}>()

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  if (!file.name.toLowerCase().endsWith('.py')) {
    alert('Please select a Python (.py) file.')
    input.value = ''
    return
  }

  emit('fileSelected', file)

  // Allows the same file to be selected again later.
  input.value = ''
}
</script>

<style scoped>
.upload-area {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 76px;
  padding: 14px;
  border: 1px dashed #aaa;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.upload-area:hover {
  border-color: #555;
  background: #fafafa;
}

.upload-area.selected {
  border: 1px dashed #2563eb;
  background: #eff6ff;
}

.upload-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  color: #555;
  font-size: 18px;
}

.selected .upload-icon {
  color: #2563eb;
}

.upload-text {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.upload-text strong {
  font-size: 13px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.upload-description {
  font-size: 12px;
  color: #777;
}

input[type="file"] {
  display: none;
}
</style>
