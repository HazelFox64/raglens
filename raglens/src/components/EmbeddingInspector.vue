<template>
  <section class="inspector" aria-label="Embedding inspector">
    <div class="view-buttons" role="group" aria-label="Inspector view">
      <button type="button" :aria-pressed="view === 'conversion'" @click="view = 'conversion'">
        How it’s made
      </button>
      <button type="button" :aria-pressed="view === 'query'" @click="view = 'query'">
        What it’s used for
      </button>
    </div>

    <div v-if="view === 'conversion'" class="inspector-content">
      <p v-if="!vector.length" class="note">Waiting for this chunk’s embedding.</p>
      <template v-else>
        <h3>1. Tokenise</h3>
        <p class="note">{{ tokensUsed }} of {{ tokenCount }} tokens used.</p>
        <ul v-if="tokens?.length" class="tokens" aria-label="First token pieces">
          <li v-for="(token, index) in tokens" :key="index"><code>{{ token }}</code></li>
          <li v-if="tokensUsed > tokens.length" aria-label="More tokens">…</li>
        </ul>
        <p v-if="tokenCount > tokenLimit" class="truncation">The rest of this chunk was outside the model’s token limit.</p>

        <h3>2. Encode and pool</h3>
        <p class="note">MiniLM creates a vector for each token using its surrounding context. We average those vectors and normalise the result to length 1.</p>
        <p class="shape">{{ tokensUsed }} tokens × {{ vector.length }} values <span aria-hidden="true">→</span><span class="sr-only"> becomes </span> 1 × {{ vector.length }}</p>

        <h3>3. Store the chunk vector</h3>
        <div class="vector-strip" aria-hidden="true">
          <span
            v-for="(value, index) in vector"
            :key="index"
            :class="{ negative: value < 0 }"
            :style="{ opacity: Math.min(1, Math.abs(value) * 5) }"
          />
        </div>
        <p class="note">Blue is positive, purple is negative. Stronger colour means a larger magnitude.</p>
        <details>
          <summary>View {{ vector.length }} vector values</summary>
          <pre class="numbers">{{ Array.from(vector).join(', ') }}</pre>
        </details>
      </template>
    </div>

    <div v-else class="inspector-content">
      <form class="query-form" @submit.prevent="submitQuery">
        <label for="embedding-query">Try a question about your code</label>
        <div class="query-input">
          <input id="embedding-query" v-model="question" type="text" maxlength="500">
          <button type="submit" :disabled="!ready || searching || !question.trim()">Find chunks</button>
        </div>
      </form>
      <p class="note">MiniLM embeds the question in the same space as the code. Cosine similarity ranks chunks by how closely the vectors point in the same direction, which can surface code that uses different words from your question.</p>
      <p v-if="!ready" class="note" role="status">Available when indexing is complete.</p>
      <p v-else-if="searching" class="note" role="status">Embedding the question…</p>
      <p v-else-if="searchError" class="truncation" role="alert">{{ searchError }}</p>
      <template v-else-if="matches.length">
        <p class="note" role="status">{{ matches.length }} closest chunks for “{{ searchedQuestion }}”</p>
        <p v-if="queryTokenCount > tokenLimit" class="truncation">The question was truncated to {{ tokenLimit }} tokens.</p>
        <ol class="matches">
          <li v-for="{ row, score, chunk } in matches" :key="chunk.id">
            <button class="match-button" type="button" @click="emit('inspect', row)">
              <span>Chunk {{ chunk.id }}</span>
              <span>{{ score.toFixed(3) }} similarity</span>
            </button>
            <p class="note">{{ chunk.sourcePath }} · Lines {{ chunk.startLine }}–{{ chunk.endLine }}</p>
            <pre>{{ excerpt(chunk.content) }}</pre>
          </li>
        </ol>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SimilarChunk } from '../embedding/similarity'
import type { CodeChunk } from '../types/rag'

const props = defineProps<{
  vector: Float32Array
  tokens?: string[]
  tokenCount: number
  tokenLimit: number
  ready: boolean
  searching: boolean
  searchError: string
  queryTokenCount: number
  results: SimilarChunk[]
  chunks: CodeChunk[]
}>()

const emit = defineEmits<{
  search: [question: string]
  inspect: [row: number]
}>()

const view = ref<'conversion' | 'query'>('conversion')
const question = ref('')
const searchedQuestion = ref('')
const tokensUsed = computed(() => Math.min(props.tokenCount, props.tokenLimit))
const matches = computed(() => props.results.flatMap(result => {
  const chunk = props.chunks[result.row]
  return chunk ? [{ ...result, chunk }] : []
}))

function submitQuery() {
  const text = question.value.trim()
  if (!props.ready || props.searching || !text) return

  searchedQuestion.value = text
  emit('search', text)
}

function excerpt(content: string) {
  const text = content.trimStart()
  const sample = text.split('\n').slice(0, 3).join('\n').slice(0, 220)
  return sample.length < text.length ? `${sample}…` : sample
}
</script>

<style scoped>
.inspector {
  overflow: hidden;
  border: 1px solid #d7dee6;
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
  font-size: 13px;
}

.view-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid #d7dee6;
}

button {
  padding: 5px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  color: #334155;
}

.view-buttons button[aria-pressed='true'] {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

.inspector-content {
  padding: 12px;
}

h3 {
  margin: 10px 0 3px;
  font-size: 13px;
}

h3:first-child {
  margin-top: 0;
}

.note, .truncation {
  margin: 4px 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.truncation {
  color: #9a3412;
}

.tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 6px 0;
  list-style: none;
}

.tokens li {
  padding: 2px 4px;
  border-radius: 4px;
  background: #e2e8f0;
  font-size: 12px;
}

.shape {
  margin-top: 5px;
  font-weight: 600;
}

.vector-strip {
  display: grid;
  grid-template-columns: repeat(48, minmax(0, 1fr));
  gap: 1px;
  margin: 6px 0;
}

.vector-strip span {
  height: 5px;
  background: #2563eb;
}

.vector-strip .negative {
  background: #7e22ce;
}

.numbers, .matches pre {
  margin: 6px 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.numbers {
  max-height: 120px;
  overflow: auto;
  font-size: 11px;
}

.query-input {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0;
}

.query-input input {
  flex: 1 1 160px;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font: inherit;
}

.matches {
  margin-top: 8px;
  padding-left: 1.5em;
}

.matches li + li {
  margin-top: 10px;
}

.match-button {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  text-align: left;
}

.match-button span:first-child {
  font-weight: 600;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
</style>
