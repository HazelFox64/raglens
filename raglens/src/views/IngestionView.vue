<template>
  <main class="ingestion-page">
    <header class="app-header">
      <h2>RAGLens</h2>
      <span>Stage 1 · Ingestion</span>
    </header>

    <div class="ingestion-layout">
      <SettingsBar
        :file-name="file.name"
        :method-label="selectedMethod.label"
        :chunk-size="usesChunkSize ? chunkSize : null"
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
              help="The maximum number of source lines in each chunk."
            />

            <select id="chunk-size" v-model="chunkSize">
              <option v-for="size in chunkSizes" :key="size" :value="size">
                {{ size }} Lines
              </option>
            </select>
          </div>

          <div class="form-field">
            <ParameterLabel
              input-id="chunk-overlap"
              label="Chunk Overlap"
              help="The number of lines repeated from the previous chunk."
            />

            <select id="chunk-overlap" v-model="overlap">
              <option v-for="size in overlapOptions" :key="size" :value="size">
                {{ size }} Lines
              </option>
            </select>
          </div>

          <div class="form-field">
            <ParameterLabel
              input-id="minimum-size"
              label="Minimum Chunk Size"
              help="Very small chunks can later be merged with nearby source code."
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
                <strong>{{ sourceLines.length }}</strong>
                <span>Source lines</span>
              </div>
              <div>
                <strong>{{ averageChunkLines }}</strong>
                <span>Avg. lines</span>
              </div>
            </div>
            <p>{{ boundaryDescription }}</p>
            <p>Overlap, minimum size, parent context, and metadata are recorded for comparison. This preview uses the chunking method and, where available, the chunk size.</p>
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

      <CodeViewer :file-name="file.name" :source="source" :chunks="chunks" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import CodeViewer from '../components/CodeViewer.vue'
import SettingsBar from '../components/SettingsBar.vue'
import ParameterLabel from '../components/ParameterLabel.vue'
import type { ChunkingStrategy, CodeChunk, IngestionSettings } from '../types/rag'

const props = defineProps<{
  file: File
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
const overlapOptions = [0, 2, 5]
const minimumSizeOptions = [1, 5, 10]
const parentContextOptions = ['None', 'Parent name', 'Signature and docstring']
const metadataOptions = ['Line ranges', 'Line ranges and chunk ID', 'Full source metadata']
const source = ref('')
const chunkingMethod = ref<ChunkingStrategy>('parent-child')
const chunkSize = ref(10)
const overlap = ref(0)
const minimumSize = ref(5)
const parentContext = ref('Parent name')
const metadata = ref('Line ranges and chunk ID')

const selectedMethod = computed(() =>
  chunkingMethods.find(method => method.value === chunkingMethod.value)!
)
const usesChunkSize = computed(() => chunkingMethod.value === 'parent-child')
const sourceLines = computed(() => {
  if (!source.value) return []

  return source.value.replace(/\r?\n$/, '').split(/\r?\n/)
})
const chunks = computed(() => createChunks(sourceLines.value, chunkingMethod.value, chunkSize.value))
const canIngest = computed(() => sourceLines.value.length > 0 && chunks.value.length > 0)
const averageChunkLines = computed(() => {
  if (!chunks.value.length) return 0

  return Math.round(sourceLines.value.length / chunks.value.length)
})
const boundaryDescription = computed(() => {
  if (chunkingMethod.value === 'parent-child') {
    return `Boundaries are created every ${chunkSize.value} lines.`
  }

  return 'Both structural previews use top-level Python definitions. The AST option currently uses the same preview as Function/Class Aware.'
})

async function loadSource(file: File) {
  source.value = await file.text()
}

function createChunks(
  lines: string[],
  method: ChunkingStrategy,
  size: number
): CodeChunk[] {
  if (!source.value) return []

  if (method === 'parent-child') {
    return createLineChunks(lines, size)
  }

  const starts = lines.reduce<number[]>((boundaries, line, index) => {
    if (/^(async\s+def|def|class)\s+/.test(line)) {
      boundaries.push(index)
    }

    return boundaries
  }, [0])

  return starts
    .filter((line, index, all) => index === 0 || line !== all[index - 1])
    .map((start, index, all) => makeChunk(lines, start, all[index + 1] ?? lines.length, index))
}

function createLineChunks(lines: string[], size: number) {
  const chunks: CodeChunk[] = []

  for (let start = 0; start < lines.length; start += size) {
    chunks.push(makeChunk(lines, start, Math.min(start + size, lines.length), chunks.length))
  }

  return chunks
}

function makeChunk(lines: string[], start: number, end: number, index: number): CodeChunk {
  return {
    id: String(index + 1).padStart(2, '0'),
    content: lines.slice(start, end).join('\n'),
    startLine: start + 1,
    endLine: end
  }
}

function startIngestion() {
  if (!canIngest.value) return

  emit('ingest', {
    method: chunkingMethod.value,
    chunkSize: usesChunkSize.value ? chunkSize.value : null,
    chunks: chunks.value,
    overlap: overlap.value,
    minimumSize: minimumSize.value,
    parentContext: parentContext.value,
    metadata: metadata.value
  })
}

onMounted(() => loadSource(props.file))
watch(() => props.file, loadSource)
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
