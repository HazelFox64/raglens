<template>
  <div class="file-upload">
    <label for="python-file" class="upload-area">
      <span class="upload-icon">↑</span>
      <strong>Select a Python file</strong>
      <span class="upload-description">
        Choose a .py file from your computer
      </span>
      <input
        id="python-file"
        type="file"
        accept=".py"
        @change="handleFileChange"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
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
    }
</script>

<style scoped>
    .file-upload {
    width: 100%;
    }

    .upload-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 35px 20px;
    border: 1px dashed #999;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    }

    .upload-area:hover {
    border-color: #333;
    background: #fafafa;
    }

    .upload-icon {
    font-size: 28px;
    color: #555;
    }

    .upload-description {
    font-size: 14px;
    color: #777;
    }

    input[type="file"] {
    display: none;
    }
</style>
