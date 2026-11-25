<template>
  <main class="ingestion-page">
    <header class="app-header">
      <h2>RAGLens</h2>
      <span>Stage 1 · Ingestion</span>
    </header>

    <div class="ingestion-layout">
      <SettingsBar
        :file-name="source.name"
        :is-folder="source.isFolder"
        :method-label="selectedMethod.label"
        :chunk-size="usesChunkSize ? chunkSize : null"
        :ast-target-size="usesAst ? astTargetSize : undefined"
        :chunk-count="chunks.length"
        :overlap="overlap"
        :minimum-size="minimumSize"
        :parent-context="parentContext"
        :metadata="metadata"
      />

      <section class="configuration-panel">
        <div class="back-row">
          <button type="button" @click="$emit('back')">← Back</button>
        </div>

        <div class="configuration-content">
          <h1>Ingestion</h1>

          <div class="form-field">
            <ParameterLabel
              input-id="chunking-method"
              label="Chunking Method"
              help="The rule used to decide where one chunk ends and the next begins."
            />

            <select id="chunking-method" v-model="chunkingMethod">
              <option
                v-for="method in chunkingMethods"
                :key="method.value"
                :value="method.value"
              >
                {{ method.label }}
              </option>
            </select>
          </div>

          <div v-if="usesChunkSize" class="form-field">
            <ParameterLabel
              input-id="chunk-size"
              label="Chunk Size"
              help="Maximum lines per child. Parent sections can hold up to three times this many lines."
            />

            <select id="chunk-size" v-model="chunkSize">
              <option v-for="size in chunkSizes" :key="size" :value="size">
                {{ size }} Lines
              </option>
            </select>
          </div>

          <div v-if="usesAst" class="form-field">
            <ParameterLabel
              input-id="ast-target-size"
              label="Target Chunk Size"
              help="AST groups statements up to this size where possible. A statement that cannot be split safely can produce a larger chunk."
            />

            <select id="ast-target-size" v-model="astTargetSize">
              <option v-for="size in astTargets" :key="size" :value="size">{{ size }} Lines</option>
            </select>
          </div>

          <div v-if="!usesAst" class="form-field">
            <ParameterLabel
              input-id="chunk-overlap"
              label="Chunk Overlap"
              help="For Parent/Child, this many lines are shared by adjacent children in the same parent."
            />

            <select id="chunk-overlap" v-model="overlap">
              <option v-for="size in overlapOptions" :key="size" :value="size">
                {{ size }} Lines
              </option>
            </select>
          </div>

          <div v-if="!usesAst" class="form-field">
            <ParameterLabel
              input-id="minimum-size"
              label="Minimum Chunk Size"
              help="For Parent/Child, the splitter aims for this minimum without exceeding the maximum. Some chunks may be shorter when there is too little code."
            />

            <select id="minimum-size" v-model="minimumSize">
              <option v-for="size in minimumSizeOptions" :key="size" :value="size">
                {{ size }} {{ size === 1 ? 'Line' : 'Lines' }}
              </option>
            </select>
          </div>

          <div class="form-field">
            <ParameterLabel
              input-id="parent-context"
              label="Parent Context"
              help="Extra surrounding context attached to a child chunk."
            />

            <select id="parent-context" v-model="parentContext">
              <option v-for="option in parentContextOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </div>

          <div class="form-field">
            <ParameterLabel
              input-id="metadata"
              label="Chunk Metadata"
              help="Labels saved alongside chunks to explain where they came from."
            />

            <select id="metadata" v-model="metadata">
              <option v-for="option in metadataOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </div>

          <section class="output-card" aria-label="Estimated output">
            <h2>Estimated Output:</h2>
            <div class="output-stats">
              <div>
                <strong>{{ chunks.length }}</strong>
                <span>{{ chunks.length === 1 ? 'Chunk' : 'Chunks' }}</span>
              </div>
              <div>
                <strong>{{ sourceLineCount }}</strong>
                <span>Source lines</span>
              </div>
              <div>
                <strong>{{ averageChunkLines }}</strong>
                <span>Avg. lines</span>
              </div>
            </div>
            <p v-if="parents.length">{{ parents.length }} parent {{ parents.length === 1 ? 'section' : 'sections' }}</p>
            <p>{{ boundaryDescription }}</p>
            <p v-if="usesAst && astLoading" role="status">Parsing Python files…</p>
            <template v-else-if="usesAst && astErrors.length">
              <p role="alert">AST couldn’t process all selected files.</p>
              <ul class="ast-errors">
                <li v-for="error in astErrors" :key="error">{{ error }}</li>
              </ul>
            </template>
            <p v-else-if="!chunks.length">The selected source has no code to ingest.</p>
            <p>{{ previewNote }}</p>
          </section>
        </div>

        <footer class="ingestion-actions">
          <button
            class="ingest-button"
            type="button"
            :disabled="!canIngest"
            @click="startIngestion"
          >
            Ingest
          </button>
        </footer>
      </section>

      <CodeViewer :files="source.files" :chunks="chunks" :show-file-tabs="source.isFolder" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import CodeViewer from '../components/CodeViewer.vue'
import SettingsBar from '../components/SettingsBar.vue'
import ParameterLabel from '../components/ParameterLabel.vue'
import { chunkParentChild } from '../chunking/parentChild'
import { chunkFunctionsAndClasses } from '../chunking/functionClass'
import AstWorker from '../chunking/ast.worker?worker'
import type { AstRequest, AstResponse } from '../chunking/ast.worker'
import type { ChunkingStrategy, CodeChunk, IngestionSettings, SourceSelection } from '../types/rag'

const props = defineProps<{
  source: SourceSelection
}>()

const emit = defineEmits<{
  back: []
  ingest: [settings: IngestionSettings]
}>()

const chunkingMethods: Array<{
  value: ChunkingStrategy
  label: string
}> = [
  { value: 'parent-child', label: 'Parent/Child' },
  { value: 'function-aware', label: 'Function/Class Aware' },
  { value: 'ast-based', label: 'AST' }
]

const chunkSizes = [10, 20, 30]
const astTargets = [15, 30, 60]
const overlapOptions = [0, 2, 5]
const minimumSizeOptions = [1, 5, 10]
const parentContextOptions = ['None', 'Parent name', 'Signature and docstring']
const metadataOptions = ['Line ranges', 'Line ranges and chunk ID', 'Full source metadata']
const chunkingMethod = ref<ChunkingStrategy>('parent-child')
const chunkSize = ref(10)
const astTargetSize = ref(30)
const overlap = ref(0)
const minimumSize = ref(5)
const parentContext = ref('Parent name')
const metadata = ref('Line ranges and chunk ID')
const astChunks = ref<CodeChunk[]>([])
const astErrors = ref<string[]>([])
const astLoading = ref(false)
let astWorker: Worker | undefined
let astRequestId = 0

const selectedMethod = computed(() =>
  chunkingMethods.find(method => method.value === chunkingMethod.value)!
)
const usesChunkSize = computed(() => chunkingMethod.value === 'parent-child')
const usesAst = computed(() => chunkingMethod.value === 'ast-based')
const sourceLineCount = computed(() =>
  props.source.files.reduce((total, file) => total + file.lines.length, 0)
)
const chunkOutput = computed(() => {
  if (usesChunkSize.value) {
    return chunkParentChild(props.source.files, {
      size: chunkSize.value,
      overlap: overlap.value,
      minimumSize: minimumSize.value
    })
  }

  if (chunkingMethod.value === 'function-aware') {
    return { chunks: chunkFunctionsAndClasses(props.source.files), parents: [] }
  }

  return { chunks: astChunks.value, parents: [] }
})
const chunks = computed(() => chunkOutput.value.chunks)
const parents = computed(() => chunkOutput.value.parents)
const canIngest = computed(() =>
  chunks.value.length > 0 && (!usesAst.value || (!astLoading.value && !astErrors.value.length))
)
const averageChunkLines = computed(() => {
  if (!chunks.value.length) return 0

  const total = chunks.value.reduce((sum, chunk) => sum + chunk.endLine - chunk.startLine + 1, 0)
  return Math.round(total / chunks.value.length)
})
const boundaryDescription = computed(() => {
  if (chunkingMethod.value === 'parent-child') {
    return `Each file is split by line count into parents and children. Children contain up to ${chunkSize.value} lines.`
  }

  if (chunkingMethod.value === 'function-aware') {
    return 'Each top-level function or class stays together. Other module code is grouped between definitions.'
  }

  return 'AST groups statements and splits larger blocks at syntax boundaries.'
})
const previewNote = computed(() => usesChunkSize.value || usesAst.value
  ? 'Parent context and metadata are saved for comparison.'
  : 'Overlap, minimum size, parent context, and metadata are saved for comparison.'
)

function createAstWorker() {
  const worker = new AstWorker()
  worker.onmessage = ({ data }: MessageEvent<AstResponse>) => {
    if (data.id !== astRequestId) return

    astChunks.value = data.chunks
    astErrors.value = data.errors
    astLoading.value = false
  }
  worker.onerror = () => {
    worker.terminate()
    astWorker = undefined
    showAstWorkerError()
  }
  return worker
}

function showAstWorkerError() {
  astLoading.value = false
  astErrors.value = ['The AST preview could not be loaded. Try selecting AST again.']
}

watch([usesAst, astTargetSize, () => props.source], ([enabled, target, source]) => {
  const id = ++astRequestId
  astChunks.value = []
  astErrors.value = []
  astLoading.value = enabled
  if (!enabled) return

  try {
    astWorker ??= createAstWorker()
    // Copy Vue's reactive file arrays into plain data for the worker.
    const files = source.files.map(file => ({ path: file.path, lines: [...file.lines] }))
    const request: AstRequest = { id, files, target }
    astWorker.postMessage(request)
  } catch {
    showAstWorkerError()
  }
}, { immediate: true })

onBeforeUnmount(() => astWorker?.terminate())

function startIngestion() {
  if (!canIngest.value) return

  emit('ingest', {
    method: chunkingMethod.value,
    chunkSize: usesChunkSize.value ? chunkSize.value : null,
    astTargetSize: usesAst.value ? astTargetSize.value : undefined,
    chunks: chunks.value,
    parents: parents.value,
    overlap: overlap.value,
    minimumSize: minimumSize.value,
    parentContext: parentContext.value,
    metadata: metadata.value
  })
}
</script>

<style scoped>
.ingestion-page {
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

.ingestion-layout {
  display: grid;
  height: calc(100vh - 64px);
  grid-template-columns: 250px minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
  overflow: hidden;
}

.configuration-panel {
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
  color: #111;
  font: inherit;
  font-size: 13px;
}

.configuration-content {
  flex: 1;
  overflow: auto;
  padding: 24px 26px 28px;
}

h1 {
  margin-bottom: 34px;
  color: #1e293b;
  font-size: 24px;
  font-weight: 600;
}

.form-field + .form-field {
  margin-top: 24px;
}

select {
  width: 100%;
  height: 33px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: white;
  color: #111;
  font: inherit;
  font-size: 13px;
}

.output-card {
  width: min(100%, 290px);
  margin: 36px auto 0;
  padding: 20px;
  border: 1px solid #d7dee6;
  border-radius: 14px;
  background: #fafafa;
  text-align: center;
}

.output-card h2 {
  margin-bottom: 18px;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
}

.output-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.output-stats div {
  min-width: 0;
}

.output-stats strong,
.output-stats span {
  display: block;
}

.output-stats strong {
  color: #1e293b;
  font-size: 20px;
  font-weight: 600;
}

.output-stats span {
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
}

.output-card p {
  margin-top: 18px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.ast-errors {
  margin: 6px 0 0;
  padding-left: 18px;
  color: #b91c1c;
  font-size: 12px;
  line-height: 1.45;
  text-align: left;
  overflow-wrap: anywhere;
}

.ingestion-actions {
  flex-shrink: 0;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
}

.ingest-button {
  display: block;
  width: 142px;
  margin: 0 auto;
  padding: 10px 16px;
  border: 1px solid #2563eb;
  border-radius: 7px;
  background: #2563eb;
  color: white;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
}

.ingest-button:hover {
  background: #1d4ed8;
}

.ingest-button:disabled {
  border-color: #cbd5e1;
  background: #cbd5e1;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .ingestion-layout {
    display: block;
    height: auto;
    min-height: calc(100vh - 64px);
    padding: 0;
    gap: 0;
  }

  .configuration-panel {
    border-right: 0;
    border-bottom: 1px solid #d7dee6;
    border-radius: 0;
  }
}
</style>
