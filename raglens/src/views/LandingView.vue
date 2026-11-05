
<template>
  <main class="landing-page">
    <header class="header">
      <h2>RAGLens</h2>
    </header>

    <section class="main-content">
      <h1>Explore RAG over Python code</h1>

      <p class="description">
        Upload a Python file to explore how it is split into chunks,
        how relevant code is retrieved, and how answers are generated.
      </p>

      <div class="upload-section">
        <h3>Select a Python file</h3>

        <FileUploader @file-selected="handleFileSelected" />

        <p v-if="selectedFile" class="selected-file">
          Selected file: {{ selectedFile.name }}
        </p>

        <button
          class="start-button"
          :disabled="!selectedFile"
          @click="startExploring"
        >
          Continue
        </button>
      </div>
    </section>

    <footer class="footer">
      RAGLens
    </footer>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileUploader from '../components/FileUploader.vue'

const selectedFile = ref<File | null>(null)

function handleFileSelected(file: File) {
  selectedFile.value = file
}

function startExploring() {
  if (!selectedFile.value) return

  console.log('Selected file:', selectedFile.value.name)

  // file processing and navigation will be added later
}
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 20px 40px;
  border-bottom: 1px solid #e5e7eb;
}

.header h2 {
  font-size: 20px;
  font-weight: 600;
}

.main-content {
  width: 90%;
  max-width: 650px;
  margin: 100px auto;
}

h1 {
  font-size: 30px;
  font-weight: 600;
  margin-bottom: 16px;
}

.description {
  color: #555;
  line-height: 1.6;
  margin-bottom: 40px;
}

.upload-section h3 {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 16px;
}

.selected-file {
  margin-top: 12px;
  font-size: 14px;
  color: #333;
}

.start-button {
  margin-top: 24px;
  padding: 10px 20px;
  border: 1px solid #333;
  border-radius: 4px;
  background: #333;
  color: white;
}

.start-button:hover:not(:disabled) {
  background: #555;
}

.start-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.footer {
  margin-top: auto;
  padding: 20px 40px;
  border-top: 1px solid #e5e7eb;
  color: #777;
  font-size: 13px;
}
</style>
