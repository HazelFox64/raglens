<template>
  <main class="visualisation-page">
    <header class="app-header">
      <h2>RAGLens</h2>
      <span>Stage 2 · Embedding</span>
    </header>

    <div class="visualisation-layout">
      <SettingsBar
        :file-name="source.name"
        :is-folder="source.isFolder"
        :method-label="methodLabel"
        :chunk-size="settings.chunkSize"
        :ast-target-size="settings.astTargetSize"
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
            <p class="progress-status" role="status">{{ progressStatus }}</p>
            <div
              class="progress-track"
              role="progressbar"
              aria-label="Embedding progress"
              :aria-valuenow="processedCount"
              aria-valuemin="0"
              :aria-valuemax="settings.chunks.length"
            >
              <span :style="{ width: `${progressPercent}%` }" />
            </div>
            <strong>{{ processedCount }} / {{ settings.chunks.length }} chunks indexed</strong>
            <p v-if="embeddingError" class="embedding-error" role="alert">{{ embeddingError }}</p>
            <button v-if="embeddingError" class="retry-button" type="button" @click="startEmbedding">Retry embedding</button>
          </section>

          <p class="eyebrow">Current chunk</p>

          <article class="code-card" :class="currentChunkColour">
            <header>
              <span :title="chunkHeading">{{ chunkHeading }}</span>
              <span>{{ currentChunkLineCount }} lines</span>
            </header>
            <pre ref="codePreview" tabindex="0" role="region" aria-label="Current chunk code">{{ currentChunk?.content ?? '' }}</pre>
          </article>

          <div class="conversion-arrow" aria-hidden="true">↓</div>

          <article class="vector-card">
            <header>
              <span>Vector equivalent</span>
              <span>{{ embeddingModel.dimensions }} dimensions</span>
            </header>
            <div class="vector-values">
              <template v-if="vectorValues.length">
                <div v-for="(value, index) in vectorValues" :key="index" class="vector-row">
                  <span>{{ index + 1 }}</span>
                  <div class="vector-track">
                    <i :class="{ negative: value < 0 }" :style="{ width: `${Math.abs(value) * 100}%` }" />
                  </div>
                  <b>{{ value.toFixed(3) }}</b>
                </div>
              </template>
              <p v-else class="vector-note">Waiting for this chunk’s embedding.</p>
            </div>
            <p class="vector-note vector-caption">{{ embeddingModel.id }} · First 6 values shown</p>
            <p v-if="currentTokenCount > embeddingModel.tokenLimit" class="vector-note vector-caption">
              Input truncated to {{ embeddingModel.tokenLimit }} tokens (original: {{ currentTokenCount }}).
            </p>
          </article>

          <p class="embedding-explanation">
            MiniLM runs in your browser. The first run downloads model files, and the progress bar tracks chunks whose vectors are ready. Playback controls which chunk you’re viewing.
          </p>
        </div>
        <footer class="chunk-controls">
          <div class="playback-buttons" role="group" aria-label="Chunk playback">
            <button
              type="button"
              aria-label="Previous chunk"
              title="Previous chunk"
              :disabled="activeChunkIndex === 0"
              @click="stepChunk(-1)"
            >
              <span aria-hidden="true">⏮︎</span>
            </button>
            <button
              class="primary-button"
              type="button"
              :aria-label="playbackAction"
              :title="playbackAction"
              :disabled="settings.chunks.length < 2"
              @click="togglePlayback"
            >
              <span aria-hidden="true">{{ isPlaying ? '⏸︎' : isLastChunk ? '↻' : '▶︎' }}</span>
            </button>
            <button
              type="button"
              aria-label="Next chunk"
              title="Next chunk"
              :disabled="!canStepForward"
              @click="stepChunk(1)"
            >
              <span aria-hidden="true">⏭︎</span>
            </button>
          </div>

          <div class="playback-speed">
            <label for="playback-speed">Speed <span aria-hidden="true">{{ playbackSpeed }}×</span></label>
            <input
              id="playback-speed"
              v-model.number="speedPosition"
              type="range"
              min="0"
              :max="playbackSpeeds.length - 1"
              step="1"
              :aria-valuetext="`${playbackSpeed} times normal speed`"
              :disabled="settings.chunks.length < 2"
            >
            <div class="speed-ticks" aria-hidden="true">
              <span>0.25×</span>
              <span>1×</span>
              <span>2×</span>
            </div>
          </div>

          <button class="continue-button" type="button" :disabled="!canContinue" @click="continueToRetrieval">
            Continue to retrieval
          </button>
        </footer>
      </section>

      <CodeViewer
        class="embedding-queue"
        label="Embedding queue"
        :files="source.files"
        :chunks="queuedChunks"
        :show-file-tabs="source.isFolder"
        :show-source-when-empty="false"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import CodeViewer from '../components/CodeViewer.vue'
import SettingsBar from '../components/SettingsBar.vue'
import type { IngestionSettings, SourceSelection } from '../types/rag'
import EmbedWorker from '../embedding/embed.worker?worker'
import { embeddingModel } from '../embedding/index'
import type { EmbeddingIndex, EmbeddingMessage } from '../embedding/index'

const props = defineProps<{
  source: SourceSelection
  settings: IngestionSettings
  existingIndex: EmbeddingIndex | null
}>()

const emit = defineEmits<{
  back: []
  continue: [index: EmbeddingIndex]
}>()

const activeChunkIndex = ref(0)
const isPlaying = ref(false)
const playbackSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
const speedPosition = ref(playbackSpeeds.indexOf(1))
const playbackSpeed = computed(() => playbackSpeeds[speedPosition.value] ?? 1)
const codePreview = ref<HTMLPreElement | null>(null)
const processedCount = ref(props.existingIndex?.chunks.length ?? 0)
const modelReady = ref(Boolean(props.existingIndex))
const embeddingError = ref('')
let worker: Worker | undefined
const embeddingIndex = shallowRef(props.existingIndex)

const methodLabel = computed(() => {
  const labels = {
    'parent-child': 'Parent/Child',
    'function-aware': 'Function/Class Aware',
    'ast-based': 'AST'
  }

  return labels[props.settings.method]
})
const currentChunk = computed(() => props.settings.chunks[activeChunkIndex.value])
const chunkHeading = computed(() => {
  const chunk = currentChunk.value
  if (!chunk) return 'Chunk —'

  const labels = [`Chunk ${chunk.id}`]
  if (chunk.parentId) labels.push(`Parent ${chunk.parentId}`)
  if (chunk.symbolName) labels.push(chunk.symbolName)
  if (props.source.isFolder) labels.push(chunk.sourcePath)
  return labels.join(' · ')
})
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
const isLastChunk = computed(() => activeChunkIndex.value === props.settings.chunks.length - 1)
const canContinue = computed(() => isComplete.value && processedCount.value > 0)
const canStepForward = computed(() => activeChunkIndex.value + 1 < processedCount.value)
const playbackAction = computed(() => {
  if (isPlaying.value) return 'Pause'
  return isLastChunk.value ? 'Replay' : 'Play'
})
const progressStatus = computed(() => {
  if (!currentChunk.value) return 'No chunks to index.'
  if (isComplete.value) return 'Embedding complete.'
  if (embeddingError.value) return 'Embedding stopped.'
  return modelReady.value ? 'Embedding chunks…' : 'Loading MiniLM…'
})
const vectorValues = computed(() => {
  const index = embeddingIndex.value
  if (!index || activeChunkIndex.value >= processedCount.value) return []

  const offset = activeChunkIndex.value * index.model.dimensions
  return Array.from(index.vectors.subarray(offset, offset + 6))
})
const currentTokenCount = computed(() => {
  if (activeChunkIndex.value >= processedCount.value) return 0
  return embeddingIndex.value?.tokenCounts[activeChunkIndex.value] ?? 0
})

function stepChunk(direction: -1 | 1) {
  isPlaying.value = false
  const nextIndex = activeChunkIndex.value + direction
  if (nextIndex >= 0 && (direction < 0 || canStepForward.value)) {
    activeChunkIndex.value = nextIndex
  }
}

function togglePlayback() {
  if (props.settings.chunks.length < 2) return
  if (isPlaying.value) {
    isPlaying.value = false
    return
  }

  if (isLastChunk.value) activeChunkIndex.value = 0
  isPlaying.value = true
}

function stopWorker() {
  worker?.terminate()
  worker = undefined
}

function stopWithError(message: string) {
  stopWorker()
  isPlaying.value = false
  embeddingError.value = message
}

function startEmbedding() {
  stopWorker()
  const chunks = props.settings.chunks.map(chunk => ({ ...chunk }))
  if (!chunks.length) return

  activeChunkIndex.value = 0
  processedCount.value = 0
  modelReady.value = false
  embeddingError.value = ''

  try {
    const index: EmbeddingIndex = {
      id: crypto.randomUUID(),
      model: embeddingModel,
      chunks,
      vectors: new Float32Array(chunks.length * embeddingModel.dimensions),
      tokenCounts: []
    }
    embeddingIndex.value = index
    const run = new EmbedWorker()
    worker = run
    run.onmessage = ({ data }: MessageEvent<EmbeddingMessage>) => {
      if (worker !== run) return
      if (data.type === 'ready') modelReady.value = true
      if (data.type === 'error') stopWithError(data.message)
      if (data.type === 'batch') {
        index.vectors.set(data.vectors, data.offset * embeddingModel.dimensions)
        index.tokenCounts.push(...data.tokenCounts)
        processedCount.value += data.tokenCounts.length
        if (isComplete.value) stopWorker()
      }
    }
    run.onerror = () => {
      if (worker === run) stopWithError('Could not start the embedding worker. You can try again.')
    }
    run.postMessage(chunks.map(chunk => chunk.content))
  } catch {
    stopWithError('Could not start embedding in this browser. You can try again.')
  }
}

function continueToRetrieval() {
  if (embeddingIndex.value && canContinue.value) emit('continue', embeddingIndex.value)
}

onMounted(() => {
  if (!props.existingIndex) startEmbedding()
})
onBeforeUnmount(stopWorker)

watch(activeChunkIndex, () => {
  codePreview.value?.scrollTo(0, 0)
}, { flush: 'post' })

watch([isPlaying, playbackSpeed, activeChunkIndex, canStepForward], ([playing, speed, , canStep], _, onCleanup) => {
  if (!playing || !canStep) return

  const timer = window.setTimeout(() => {
    activeChunkIndex.value += 1
    if (isLastChunk.value) isPlaying.value = false
  }, 1500 / speed)

  onCleanup(() => window.clearTimeout(timer))
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
  flex-shrink: 0;
  color: #64748b;
  font-weight: 400;
}

.code-card header span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.code-card pre {
  height: clamp(145px, 23dvh, 220px);
  margin: 0;
  padding: 14px 16px;
  overflow: auto;
  overscroll-behavior: contain;
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

.vector-note {
  color: #475569;
  font-size: 12px;
  line-height: 1.45;
}

.vector-caption {
  padding: 0 14px 10px;
}

.embedding-error {
  margin-top: 8px;
  color: #b91c1c;
  font-size: 13px;
}

.retry-button {
  margin-top: 6px;
  padding: 5px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  color: #334155;
  font-size: 13px;
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
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
}

.playback-buttons {
  display: flex;
  gap: 6px;
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

.playback-buttons button {
  display: grid;
  width: 36px;
  height: 36px;
  padding: 0;
  place-items: center;
  font-size: 16px;
}

.playback-speed {
  flex: 1 1 110px;
  min-width: 0;
  color: #475569;
  font-size: 12px;
}

.playback-speed label {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}

.playback-speed input {
  display: block;
  width: 100%;
  margin-top: 3px;
  accent-color: #2563eb;
}

.speed-ticks {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 2px;
}

.speed-ticks span:nth-child(2) {
  text-align: center;
}

.speed-ticks span:last-child {
  text-align: right;
}

.continue-button {
  margin-left: auto;
}

.chunk-controls .continue-button:not(:disabled),
.chunk-controls .primary-button {
  border-color: #2563eb;
  background: #2563eb;
  color: white;
}

.chunk-controls .continue-button:hover:not(:disabled),
.chunk-controls .primary-button:hover:not(:disabled) {
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
