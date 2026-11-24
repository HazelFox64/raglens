<template>
  <main class="visualisation-page">
    <header class="app-header">
      <h2>RAGLens</h2>
      <span>Stage 2 · Embedding</span>
    </header>

    <div class="visualisation-layout">
      <SettingsBar
        :file-name="file.name"
        :method-label="methodLabel"
        :chunk-size="settings.chunkSize"
        :chunk-count="settings.chunks.length"
        :overlap="settings.overlap"
        :minimum-size="settings.minimumSize"
        :parent-context="settings.parentContext"
        :metadata="settings.metadata"
      />

      <section class="embedding-panel">
        <div class="back-row">
          <button type="button" @click="$emit('back')">← Back</button>
        </div>

        <div class="embedding-content">
          <section class="progress-area">
            <p class="progress-status">{{ progressStatus }}</p>
            <div
              class="progress-track"
              role="progressbar"
              aria-label="Simulated embedding progress"
              :aria-valuenow="processedCount"
              aria-valuemin="0"
              :aria-valuemax="settings.chunks.length"
            >
              <span :style="{ width: `${progressPercent}%` }" />
            </div>
            <strong>{{ processedCount }} / {{ settings.chunks.length }} chunks indexed</strong>
          </section>

          <p class="eyebrow">Current chunk</p>

          <article class="code-card" :class="currentChunkColour">
            <header>
              <span>Chunk {{ currentChunk?.id ?? '—' }}</span>
              <span>{{ currentChunkLineCount }} lines</span>
            </header>
            <pre>{{ currentChunk?.content || 'Preparing source…' }}</pre>
          </article>

          <div class="conversion-arrow" aria-hidden="true">↓</div>

          <article class="vector-card">
            <header>
              <span>Vector equivalent</span>
              <span>Simulated example</span>
            </header>
            <div class="vector-values">
              <div v-for="(value, index) in vectorValues" :key="index" class="vector-row">
                <span>{{ index + 1 }}</span>
                <div class="vector-track">
                  <i :class="{ negative: value < 0 }" :style="{ width: `${Math.abs(value) * 100}%` }" />
                </div>
                <b>{{ value.toFixed(3) }}</b>
              </div>
            </div>
          </article>

          <p class="embedding-explanation">
            An embedding model converts the meaning of this code into numbers. Similar code creates vectors that sit closer together in the vector index, making relevant chunks easier to retrieve.
          </p>
        </div>
        <footer class="chunk-controls">
          <button type="button" :disabled="activeChunkIndex === 0" @click="previousChunk">
            Previous chunk
          </button>
          <button class="primary-button" type="button" @click="nextChunk">
            {{ canContinue ? 'Continue to retrieval' : 'Next chunk' }}
          </button>
        </footer>
      </section>

      <CodeViewer
        class="embedding-queue"
        label="Embedding queue"
        :file-name="file.name"
        :source="source"
        :chunks="queuedChunks"
        :show-source-when-empty="false"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CodeViewer from '../components/CodeViewer.vue'
import SettingsBar from '../components/SettingsBar.vue'
import type { IngestionSettings } from '../types/rag'

const props = defineProps<{
  file: File
  settings: IngestionSettings
}>()

const emit = defineEmits<{
  back: []
  continue: []
}>()

const source = ref('')
const activeChunkIndex = ref(0)
const processedCount = computed(() =>
  Math.min(activeChunkIndex.value + 1, props.settings.chunks.length)
)

const methodLabel = computed(() => {
  const labels = {
    'parent-child': 'Parent/Child',
    'function-aware': 'Function/Class Aware',
    'ast-based': 'AST'
  }

  return labels[props.settings.method]
})
const currentChunk = computed(() => props.settings.chunks[activeChunkIndex.value])
const currentChunkColour = computed(() => {
  if (!currentChunk.value) return ''

  return `chunk-${(Number.parseInt(currentChunk.value.id, 10) - 1) % 4}`
})
const queuedChunks = computed(() => props.settings.chunks.slice(processedCount.value))
const currentChunkLineCount = computed(() => {
  if (!currentChunk.value) return 0

  return currentChunk.value.endLine - currentChunk.value.startLine + 1
})
const progressPercent = computed(() => {
  if (!props.settings.chunks.length) return 0

  return (processedCount.value / props.settings.chunks.length) * 100
})
const isComplete = computed(() => processedCount.value === props.settings.chunks.length)
const canContinue = computed(() =>
  isComplete.value && activeChunkIndex.value === props.settings.chunks.length - 1
)
const progressStatus = computed(() => {
  if (!currentChunk.value) return 'No chunks to index.'
  if (isComplete.value) return 'All chunks indexed in the simulation.'

  return `Chunk ${currentChunk.value.id} indexed in the simulation.`
})
const vectorValues = computed(() => {
  const seed = activeChunkIndex.value + 1

  return [0.82, -0.31, 0.57, 0.16, -0.68, 0.41].map((value, index) => {
    const adjusted = value + ((seed * (index + 2)) % 5) / 100

    return Math.max(-0.99, Math.min(0.99, adjusted))
  })
})

function previousChunk() {
  if (activeChunkIndex.value === 0) return

  activeChunkIndex.value -= 1
}

function nextChunk() {
  if (canContinue.value) {
    emit('continue')
    return
  }

  if (activeChunkIndex.value < props.settings.chunks.length - 1) {
    activeChunkIndex.value += 1
  }
}

onMounted(async () => {
  source.value = await props.file.text()
})
</script>

<style scoped>
.visualisation-page {
  min-height: 100vh;
  background: #f8fafc;
}

.app-header {
  display: flex;
  height: 64px;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.app-header h2 {
  color: #1e293b;
  font-size: 20px;
  font-weight: 600;
}

.app-header span {
  color: #64748b;
  font-size: 13px;
}

.visualisation-layout {
  display: grid;
  height: calc(100vh - 64px);
  grid-template-columns: 250px minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
  overflow: hidden;
}

.embedding-queue {
  grid-column: 3;
  grid-row: 1;
}

.embedding-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid #d7dee6;
  border-radius: 10px;
  background: white;
  overflow: hidden;
}

.back-row {
  flex-shrink: 0;
  height: 42px;
  padding: 0 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafafa;
}

.back-row button {
  height: 100%;
  border: 0;
  background: transparent;
  color: #334155;
  font: inherit;
  font-size: 13px;
}

.embedding-content {
  flex: 1;
  overflow: auto;
  padding: 22px 26px 28px;
}

.progress-area {
  margin-bottom: 24px;
}

.progress-status {
  margin-bottom: 9px;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
}

.progress-track {
  height: 9px;
  overflow: hidden;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #2563eb;
  transition: width 350ms ease;
}

.progress-area strong {
  display: block;
  margin-top: 9px;
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
}

.eyebrow {
  margin-bottom: 9px;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.code-card,
.vector-card {
  overflow: hidden;
  border: 1px solid #d7dee6;
  border-radius: 8px;
}

.code-card {
  background: #fff3df;
}

.code-card.chunk-0 { background: #fff3df; }
.code-card.chunk-1 { background: #e8f0fe; }
.code-card.chunk-2 { background: #e5f2e1; }
.code-card.chunk-3 { background: #efe4f3; }

.code-card header,
.vector-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.code-card header span:last-child,
.vector-card header span:last-child {
  color: #64748b;
  font-weight: 400;
}

.code-card pre {
  min-height: 145px;
  margin: 0;
  padding: 14px 16px;
  overflow: auto;
  color: #334155;
  font: inherit;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.conversion-arrow {
  margin: 12px 0;
  color: #2563eb;
  font-size: 24px;
  line-height: 1;
  text-align: center;
}

.vector-card {
  background: #eff6ff;
}

.vector-values {
  padding: 13px 14px;
}

.vector-row {
  display: grid;
  grid-template-columns: 20px 1fr 46px;
  align-items: center;
  gap: 8px;
}

.vector-row + .vector-row {
  margin-top: 8px;
}

.vector-row > span,
.vector-row b {
  color: #475569;
  font-size: 11px;
  font-weight: 500;
}

.vector-row b {
  text-align: right;
}

.vector-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #cbd5e1;
}

.vector-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #2563eb;
}

.vector-track i.negative {
  background: #64748b;
}

.embedding-explanation {
  margin: 16px 0 20px;
  color: #475569;
  font-size: 13px;
  line-height: 1.55;
}

.chunk-controls {
  display: flex;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
}

.chunk-controls button {
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: white;
  color: #334155;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
}

.chunk-controls button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.chunk-controls .primary-button {
  border-color: #2563eb;
  background: #2563eb;
  color: white;
}

.chunk-controls .primary-button:hover {
  background: #1d4ed8;
}

@media (max-width: 900px) {
  .visualisation-layout {
    display: block;
    height: auto;
    min-height: calc(100vh - 64px);
    padding: 0;
  }

  .embedding-panel {
    border: 0;
    border-bottom: 1px solid #d7dee6;
    border-radius: 0;
  }
}

@media (max-width: 600px) {
  .app-header {
    padding: 0 20px;
  }

  .embedding-content {
    padding: 18px 20px 24px;
  }
}
</style>
