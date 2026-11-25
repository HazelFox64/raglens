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
        generation with Python code. Choose a file or folder, configure how its
        code is chunked and embedded, then compare how retrieval settings influence
        generated answers.
      </p>

      <div class="file-panel">
        <div class="panel-header">
          <h3>Choose your source</h3>
          <p>Select a sample or upload a Python file or folder.</p>
        </div>

        <div class="file-options">
          <div class="sample-section">
            <label for="sample-file">Sample file</label>

            <div
              class="sample-input"
              :class="{ selected: selectedSample && selectedSource }"
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
              v-if="selectedSample && selectedSource"
              class="sample-status"
            >
              ✓ Sample selected
            </p>
          </div>

          <div class="separator">or</div>

          <div class="upload-section">
            <p class="upload-label">Upload source</p>

            <FileUploader
              input-id="python-file"
              :selected-name="!selectedSample && !selectedSource?.isFolder ? selectedSource?.name : undefined"
              @files-selected="handleFilesSelected"
              @invalid-selection="errorMessage = $event"
            />
            <FileUploader
              input-id="python-folder"
              folder
              :selected-name="selectedSource?.isFolder ? selectedSource.name : undefined"
              @files-selected="handleFilesSelected"
              @invalid-selection="errorMessage = $event"
            />
          </div>
        </div>

        <p v-if="errorMessage" class="error-message" role="alert">
          {{ errorMessage }}
        </p>

        <div class="panel-footer">
          <span class="file-status" role="status">
            <span v-if="loading">Reading Python files…</span>
            <span v-else-if="selectedSource" class="status-ready">
              {{ selectedSource.files.length }} Python {{ selectedSource.files.length === 1 ? 'file' : 'files' }} selected
            </span>
            <span v-else>
              No file selected
            </span>
          </span>

          <button
            class="start-button"
            :disabled="!selectedSource || loading"
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
import type { SourceFile, SourceSelection } from '../types/rag'

const emit = defineEmits<{
  continue: [source: SourceSelection]
}>()

const selectedSource = ref<SourceSelection | null>(null)
const selectedSample = ref('')
const errorMessage = ref('')
const loading = ref(false)

let selectionVersion = 0

function readSourceLines(path: string, text: string): SourceFile {
  return { path, lines: text ? text.replace(/\r?\n$/, '').split(/\r?\n/) : [] }
}

async function handleSampleChange() {
  const version = ++selectionVersion

  errorMessage.value = ''
  selectedSource.value = null
  loading.value = Boolean(selectedSample.value)

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

    selectedSource.value = {
      name: fileName,
      isFolder: false,
      files: [readSourceLines(fileName, content)]
    }
  } catch {
    if (version !== selectionVersion) return

    errorMessage.value = 'Unable to load this sample. Please try again.'
    selectedSample.value = ''
  } finally {
    if (version === selectionVersion) loading.value = false
  }
}

async function handleFilesSelected(files: File[], isFolder: boolean) {
  const version = ++selectionVersion
  selectedSource.value = null
  selectedSample.value = ''
  errorMessage.value = ''
  loading.value = true

  const firstPath = files[0]?.webkitRelativePath
  const name = isFolder ? firstPath?.split('/')[0] || 'Python folder' : files[0]?.name || 'Python file'

  try {
    const sources = await Promise.all(files.map(async file => {
      const relativePath = file.webkitRelativePath
      const path = relativePath ? relativePath.slice(relativePath.indexOf('/') + 1) : file.name
      return readSourceLines(path, await file.text())
    }))
    if (version !== selectionVersion) return

    sources.sort((a, b) => a.path.localeCompare(b.path, 'en'))
    selectedSource.value = { name, isFolder, files: sources }
  } catch {
    if (version === selectionVersion) errorMessage.value = 'Unable to read the selected Python files.'
  } finally {
    if (version === selectionVersion) loading.value = false
  }
}

function startExploring() {
  if (!selectedSource.value || loading.value) return

  emit('continue', selectedSource.value)
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
.upload-label {
  display: block;
  margin-bottom: 10px;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.upload-section :deep(.upload-area + .upload-area) {
  margin-top: 8px;
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
