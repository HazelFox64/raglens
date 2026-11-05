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

      <div class="file-options">
        <div class="sample-section">
          <h3>Use a sample</h3>
          <p>Choose an example Python file to get started.</p>

          <select v-model="selectedSample" @change="handleSampleChange">
            <option value="">Select a sample</option>

            <option
              v-for="fileName in sampleFiles"
              :key="fileName"
              :value="fileName"
            >
              {{ fileName }}
            </option>
          </select>
        </div>

        <div class="upload-section">
          <h3>Upload your own</h3>
          <p>Select a Python file from your computer.</p>

          <FileUploader @file-selected="handleFileSelected" />
        </div>
      </div>

      <p v-if="selectedFile" class="selected-file">
        Selected file: {{ selectedFile.name }}
      </p>

      <p v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </p>

      <button
        class="start-button"
        :disabled="!selectedFile"
        @click="startExploring"
      >
        Continue
      </button>
    </section>

    <footer class="footer">
      RAGLens
    </footer>
  </main>
</template>

<script setup lang="ts">
    import { ref } from 'vue'
    import FileUploader from '../components/FileUploader.vue'
    import sampleFiles from 'virtual:sample-files'

    const selectedFile = ref<File | null>(null)
    const selectedSample = ref('')
    const errorMessage = ref('')

    async function handleSampleChange() {
    errorMessage.value = ''
    selectedFile.value = null

    if (!selectedSample.value) return

    try {
        const response = await fetch(
        `/samples/${selectedSample.value}`
        )

        if (!response.ok) {
        throw new Error('Could not load the selected sample.')
        }

        const content = await response.text()

        selectedFile.value = new File(
        [content],
        selectedSample.value,
        { type: 'text/x-python' }
        )
    } catch {
        errorMessage.value = 'Unable to load this sample. Please try again.'
        selectedSample.value = ''
    }
    }

    function handleFileSelected(file: File) {
    selectedFile.value = file
    selectedSample.value = ''
    errorMessage.value = ''
    }

    function startExploring() {
    if (!selectedFile.value) return

    console.log('Selected file:', selectedFile.value.name)

    // File processing and navigation will be added later.
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
    max-width: 850px;
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

    .file-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    }

    .sample-section,
    .upload-section {
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    }

    .sample-section h3,
    .upload-section h3 {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 10px;
    }

    .sample-section p,
    .upload-section p {
    font-size: 14px;
    color: #777;
    line-height: 1.5;
    margin-bottom: 20px;
    }

    .sample-section select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
    font: inherit;
    }

    .selected-file {
    margin-top: 20px;
    font-size: 14px;
    color: #333;
    }

    .error-message {
    margin-top: 12px;
    color: #b42318;
    font-size: 14px;
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

    @media (max-width: 650px) {
    .file-options {
        grid-template-columns: 1fr;
    }

    .main-content {
        margin: 50px auto;
    }
    }
</style>
