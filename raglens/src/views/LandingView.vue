<template>
  <main class="landing-page">
    <header class="header">
      <h2>RAGLens</h2>
      <span>Start a run</span>
    </header>

    <section class="main-content">
      <h1>RAGLens</h1>

      <p class="description">
        RAGLens is an interactive tool for exploring retrieval-augmented
        generation with Python code. Choose a source file, configure how it is
        chunked and embedded, then compare how retrieval settings influence
        generated answers.
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
            <label for="python-file">Upload file</label>

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
            Continue
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

const emit = defineEmits<{
  continue: [file: File]
}>()

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

  emit('continue', selectedFile.value)
}
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.header {
  display: flex;
  height: 64px;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.header h2 {
  margin: 0;
  color: #1e293b;
  font-size: 20px;
  font-weight: 600;
}

.header span {
  color: #64748b;
  font-size: 13px;
}

.main-content {
  width: min(100% - 36px, 820px);
  margin: 76px auto;
}

h1 {
  color: #1e293b;
  font-size: 30px;
  font-weight: 600;
  margin-bottom: 12px;
}

.description {
  max-width: 690px;
  margin-bottom: 32px;
  color: #475569;
  font-size: 15px;
  line-height: 1.6;
}

.file-panel {
  border: 1px solid #d7dee6;
  border-radius: 10px;
  background: white;
  overflow: hidden;
}

.panel-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.panel-header h3 {
  color: #1e293b;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.panel-header p {
  color: #64748b;
  font-size: 13px;
}

.file-options {
  display: grid;
  grid-template-columns: 1fr 32px 1fr;
  align-items: start;
  gap: 16px;
  padding: 24px;
}

.sample-section,
.upload-section {
  min-width: 0;
}

.sample-section label,
.upload-section > label {
  display: block;
  margin-bottom: 10px;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.sample-input select {
  width: 100%;
  height: 42px;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: white;
  color: #1e293b;
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
  color: #047857;
}

.separator {
  margin-top: 40px;
  text-align: center;
  font-size: 12px;
  color: #64748b;
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
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
}

.file-status {
  color: #64748b;
  font-size: 13px;
}

.status-ready {
  color: #047857;
}

.start-button {
  padding: 10px 16px;
  border: 1px solid #2563eb;
  border-radius: 7px;
  background: #2563eb;
  color: white;
}

.start-button:hover:not(:disabled) {
  background: #1d4ed8;
}

.start-button:disabled {
  border-color: #cbd5e1;
  background: #cbd5e1;
  cursor: not-allowed;
}

@media (max-width: 650px) {
  .main-content {
    margin: 52px auto;
  }

  .file-options {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .separator {
    margin-top: 0;
  }
}
</style>
