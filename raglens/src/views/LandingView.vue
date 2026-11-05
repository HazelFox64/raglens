<template>
  <main class="landing-page">
    <header class="header">
      <h2>RAGLens</h2>
    </header>

    <section class="main-content">
      <h1>Explore RAG with Python code</h1>

      <p class="description">
        Upload a Python file to explore how it is split into chunks,
        how relevant code is retrieved, and how answers are generated.
      </p>

      <div class="file-panel">
        <div class="panel-header">
          <h3>Choose a source file</h3>
          <p>Select a sample or upload your own.</p>
        </div>

        <div class="file-options">
          <div class="sample-section">
            <label for="sample-file">Sample file</label>

            <div
              class="sample-input"
              :class="{ selected: selectedSample && selectedFile }"
            >
              <select
                id="sample-file"
                v-model="selectedSample"
                @change="handleSampleChange"
              >
                <option value="">Select a sample...</option>

                <option
                  v-for="fileName in sampleFiles"
                  :key="fileName"
                  :value="fileName"
                >
                  {{ fileName }}
                </option>
              </select>
            </div>

            <p
              v-if="selectedSample && selectedFile"
              class="sample-status"
            >
              ✓ Sample selected
            </p>
          </div>

          <div class="separator">or</div>

          <div class="upload-section">
            <label>Upload file</label>

            <FileUploader
              :selected-file="selectedSample ? null : selectedFile"
              @file-selected="handleFileSelected"
            />
          </div>
        </div>

        <p v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </p>

        <div class="panel-footer">
          <span class="file-status">
            <span v-if="selectedFile" class="status-ready">
              ✓ Ready to configure
            </span>
            <span v-else>
              No file selected
            </span>
          </span>

          <button
            class="start-button"
            :disabled="!selectedFile"
            @click="startExploring"
          >
            Continue →
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileUploader from '../components/FileUploader.vue'
import sampleFiles from 'virtual:sample-files'

const selectedFile = ref<File | null>(null)
const selectedSample = ref('')
const errorMessage = ref('')

let selectionVersion = 0

async function handleSampleChange() {
  const version = ++selectionVersion

  errorMessage.value = ''
  selectedFile.value = null

  if (!selectedSample.value) return

  const fileName = selectedSample.value

  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}samples/${encodeURIComponent(fileName)}`
    )

    if (!response.ok) {
      throw new Error('Could not load the selected sample.')
    }

    const content = await response.text()

    if (version !== selectionVersion) return

    selectedFile.value = new File(
      [content],
      fileName,
      { type: 'text/x-python' }
    )
  } catch {
    if (version !== selectionVersion) return

    errorMessage.value = 'Unable to load this sample. Please try again.'
    selectedSample.value = ''
  }
}

function handleFileSelected(file: File) {
  selectionVersion++

  selectedFile.value = file
  selectedSample.value = ''
  errorMessage.value = ''
}

function startExploring() {
  if (!selectedFile.value) return

  console.log('Selected file:', selectedFile.value.name)

  // Navigation to the ingestion screen will be added later.
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
  max-width: 750px;
  margin: 90px auto;
}

h1 {
  font-size: 30px;
  font-weight: 600;
  margin-bottom: 16px;
}

.description {
  color: #555;
  line-height: 1.6;
  margin-bottom: 36px;
}

.file-panel {
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.panel-header {
  padding: 22px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.panel-header h3 {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 8px;
}

.panel-header p {
  font-size: 14px;
  color: #777;
}

.file-options {
  display: grid;
  grid-template-columns: 1fr 40px 1fr;
  align-items: center;
  gap: 16px;
  padding: 28px 24px;
}

.sample-section,
.upload-section {
  min-width: 0;
}

.sample-section label,
.upload-section > label {
  display: block;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #555;
}

.sample-input select {
  width: 100%;
  min-height: 76px;
  padding: 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.sample-input.selected select {
  border-color: #2563eb;
  background: #eff6ff;
}

.sample-status {
  margin-top: 8px;
  font-size: 12px;
  color: #2563eb;
}

.separator {
  text-align: center;
  font-size: 12px;
  color: #999;
}

.error-message {
  padding: 0 24px 18px;
  color: #b42318;
  font-size: 14px;
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
}

.file-status {
  font-size: 13px;
  color: #777;
}

.status-ready {
  color: #2563eb;
}

.start-button {
  padding: 11px 20px;
  border: 1px solid #333;
  border-radius: 5px;
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

@media (max-width: 650px) {
  .main-content {
    margin: 50px auto;
  }

  .file-options {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .separator {
    text-align: center;
  }
}
</style>
