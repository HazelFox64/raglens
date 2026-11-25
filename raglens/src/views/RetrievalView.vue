<template>
  <main class="retrieval-page">
    <header class="app-header">
      <h2>RAGLens</h2>
      <span>Stage 3 · Retrieval</span>
    </header>

    <div class="retrieval-layout">
      <SettingsBar
        :file-name="source.name"
        :is-folder="source.isFolder"
        :method-label="ingestionMethod"
        :chunk-size="ingestionSettings.chunkSize"
        :ast-target-size="ingestionSettings.astTargetSize"
        :chunk-count="ingestionSettings.chunks.length"
        :overlap="ingestionSettings.overlap"
        :minimum-size="ingestionSettings.minimumSize"
        :parent-context="ingestionSettings.parentContext"
        :metadata="ingestionSettings.metadata"
        :retrieval-settings="currentSettings"
      />

      <section class="configuration-panel">
        <div class="back-row">
          <button type="button" @click="$emit('back')">← Back</button>
        </div>

        <div class="configuration-content">
          <h1>Retrieval</h1>

          <div class="form-field">
            <ParameterLabel
              input-id="search-method"
              label="Search Method"
              help="The way RAGLens finds relevant chunks."
            />
            <select id="search-method" v-model="searchMethod">
              <option>Hybrid</option>
              <option>Semantic</option>
              <option>Keyword</option>
            </select>
          </div>

          <div class="form-field">
            <ParameterLabel
              input-id="top-k"
              label="Top K"
              help="How many chunks are selected before reranking."
            />
            <select id="top-k" v-model.number="topK">
              <option v-for="value in topKOptions" :key="value" :value="value">
                {{ value }} Chunks
              </option>
            </select>
          </div>

          <div class="reranking-row">
            <div class="form-field">
              <ParameterLabel
                input-id="reranking"
                label="Reranking"
                help="A second pass that orders the selected chunks by relevance."
              />
              <label class="toggle" for="reranking">
                <input id="reranking" v-model="reranking" type="checkbox">
                <span aria-hidden="true" />
                <b>{{ reranking ? 'On' : 'Off' }}</b>
              </label>
            </div>

            <div v-if="reranking" class="form-field">
              <ParameterLabel
                input-id="rerank-top-n"
                label="Reranking Top N"
                help="The number of reranked chunks sent to generation."
              />
              <select id="rerank-top-n" v-model.number="rerankTopN">
                <option v-for="value in rerankTopNOptions" :key="value" :value="value">
                  {{ value }} {{ value === 1 ? 'Chunk' : 'Chunks' }}
                </option>
              </select>
            </div>
          </div>

          <form class="save-area" @submit.prevent="saveSnapshot">
            <div class="run-name">
              <label for="run-name">Run name</label>
              <input id="run-name" v-model="runName" type="text" maxlength="80" :placeholder="defaultRunName">
            </div>
            <p v-if="snapshotMessage" class="snapshot-message" role="status">{{ snapshotMessage }}</p>
            <div class="save-actions">
              <button class="save-button" type="submit" :disabled="!canSave">
                Save run snapshot
              </button>
              <button class="compare-button" type="button" :disabled="!canCompare" @click="openComparison">
                Compare results
              </button>
            </div>
          </form>
        </div>
      </section>

      <section class="chat-panel">
        <header class="chat-header">
          <div>
            <h1>Generation</h1>
            <p>Ask questions about your selected Python code.</p>
          </div>
          <button type="button" :disabled="!messages.length" @click="clearChat">Clear chat</button>
        </header>

        <div class="messages" aria-live="polite">
          <p v-if="!messages.length" class="empty-chat">Your messages and generated responses will appear here.</p>

          <article
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="message.role"
          >
            <span class="message-role">{{ message.role === 'user' ? 'You' : 'RAGLens' }}</span>
            <p>{{ message.text }}</p>
            <small v-if="message.retrievalSettings">
              {{ describeRetrieval(message.retrievalSettings) }}
            </small>
            <button class="delete-message" type="button" @click="deleteMessage(message.id)">
              Delete
            </button>
          </article>
        </div>

        <form class="chat-form" @submit.prevent="sendMessage">
          <label class="sr-only" for="chat-message">Ask about your source code</label>
          <textarea
            id="chat-message"
            v-model="draftMessage"
            rows="2"
            placeholder="Ask about your source code…"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <button type="submit" :disabled="!draftMessage.trim()">Send</button>
        </form>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SettingsBar from '../components/SettingsBar.vue'
import ParameterLabel from '../components/ParameterLabel.vue'
import { describeRetrieval } from '../types/rag'
import type { ChatMessage, IngestionSettings, RetrievalSettings, RunSnapshot, SourceSelection } from '../types/rag'

const props = defineProps<{
  source: SourceSelection
  ingestionSettings: IngestionSettings
  snapshotCount: number
}>()

const emit = defineEmits<{
  back: []
  compare: []
  'save-snapshot': [snapshot: RunSnapshot]
}>()

const topKOptions = [3, 5, 10]
const searchMethod = ref('Hybrid')
const topK = ref(5)
const reranking = ref(true)
const rerankTopN = ref(3)
const rerankTopNOptions = computed(() => [1, 3, 5].filter(value => value <= topK.value))
watch(topK, value => {
  rerankTopN.value = Math.min(rerankTopN.value, value)
})
const draftMessage = ref('')
const messages = ref<ChatMessage[]>([])
const snapshotMessage = ref('')
const runName = ref('')
const defaultRunName = computed(() => `Run ${props.snapshotCount + 1}`)
let nextMessageId = 1

const ingestionMethod = computed(() => {
  const labels = {
    'parent-child': 'Parent/Child',
    'function-aware': 'Function/Class Aware',
    'ast-based': 'AST'
  }

  return labels[props.ingestionSettings.method]
})
const currentSettings = computed<RetrievalSettings>(() => ({
  searchMethod: searchMethod.value,
  topK: topK.value,
  reranking: reranking.value,
  rerankTopN: reranking.value ? Math.min(rerankTopN.value, topK.value) : null
}))
const hasResponse = computed(() => messages.value.some(message => message.role === 'assistant'))
const canSave = computed(() => hasResponse.value && topK.value > 0)
const canCompare = computed(() => props.snapshotCount > 0)

function sendMessage() {
  const text = draftMessage.value.trim()
  if (!text) return

  messages.value.push({ id: nextMessageId++, role: 'user', text })
  messages.value.push({
    id: nextMessageId++,
    role: 'assistant',
    text: `This sample response uses a simulated retrieval of ${topK.value} chunks from ${props.source.name}.`,
    retrievalSettings: { ...currentSettings.value }
  })
  draftMessage.value = ''
  snapshotMessage.value = ''
}

function clearChat() {
  messages.value = []
  snapshotMessage.value = ''
}

function deleteMessage(messageId: number) {
  messages.value = messages.value.filter(message => message.id !== messageId)
  snapshotMessage.value = ''
}

function saveSnapshot() {
  if (!canSave.value) return

  const name = runName.value.trim() || defaultRunName.value

  emit('save-snapshot', {
    id: Date.now(),
    name,
    fileName: props.source.name,
    sourcePaths: props.source.isFolder ? props.source.files.map(file => file.path) : undefined,
    ingestionSettings: {
      ...props.ingestionSettings,
      chunks: [...props.ingestionSettings.chunks],
      parents: props.ingestionSettings.parents?.map(parent => ({ ...parent }))
    },
    retrievalSettings: { ...currentSettings.value },
    messages: messages.value.map(message => ({
      ...message,
      retrievalSettings: message.retrievalSettings && { ...message.retrievalSettings }
    }))
  })
  runName.value = ''
  snapshotMessage.value = `“${name}” saved with ${messages.value.length} messages.`
}

function openComparison() {
  if (!canCompare.value) return

  emit('compare')
}
</script>

<style scoped>
.retrieval-page {
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

.retrieval-layout {
  display: grid;
  min-height: calc(100vh - 64px);
  grid-template-columns: 250px minmax(410px, 0.9fr) minmax(480px, 1.1fr);
  gap: 18px;
  padding: 18px;
}

.configuration-panel,
.chat-panel {
  min-width: 0;
  border: 1px solid #d7dee6;
  border-radius: 10px;
  background: white;
  overflow: hidden;
}

.back-row {
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

.configuration-content {
  padding: 24px 26px 28px;
}

h1 {
  color: #1e293b;
  font-size: 24px;
  font-weight: 600;
}

.configuration-content > h1 {
  margin-bottom: 32px;
}

.form-field + .form-field {
  margin-top: 22px;
}

select,
textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: white;
  color: #1e293b;
  font: inherit;
  font-size: 13px;
}

select {
  height: 34px;
  padding: 0 8px;
}

.reranking-row {
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  align-items: start;
  gap: 18px;
  margin-top: 22px;
}

.reranking-row .form-field + .form-field {
  margin-top: 0;
}

.toggle {
  display: flex;
  height: 34px;
  align-items: center;
  gap: 8px;
  margin: 0;
  cursor: pointer;
}

.toggle input {
  position: absolute;
  opacity: 0;
}

.toggle span {
  position: relative;
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: #cbd5e1;
  transition: background 160ms ease;
}

.toggle span::after {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  content: '';
  transition: transform 160ms ease;
}

.toggle input:checked + span {
  background: #2563eb;
}

.toggle input:checked + span::after {
  transform: translateX(16px);
}

.toggle b {
  color: #475569;
  font-size: 13px;
  font-weight: 500;
}

.save-area {
  margin-top: 34px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
}

.run-name {
  margin-bottom: 16px;
  text-align: left;
}

.run-name label {
  display: block;
  margin-bottom: 7px;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
}

.run-name input {
  width: 100%;
  height: 34px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  color: #1e293b;
  font: inherit;
  font-size: 13px;
}

.save-button {
  padding: 10px 16px;
  border: 1px solid #2563eb;
  border-radius: 7px;
  background: #2563eb;
  color: white;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
}

.save-button:disabled {
  border-color: #cbd5e1;
  background: #cbd5e1;
  cursor: not-allowed;
}

.save-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
}

.compare-button {
  padding: 10px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: white;
  color: #334155;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
}

.compare-button:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.snapshot-message {
  margin-bottom: 10px;
  color: #047857;
  font-size: 12px;
}

.chat-panel {
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.chat-header h1 {
  margin-bottom: 5px;
}

.chat-header p {
  color: #64748b;
  font-size: 13px;
}

.chat-header button {
  border: 0;
  background: transparent;
  color: #475569;
  font: inherit;
  font-size: 13px;
}

.chat-header button:disabled {
  opacity: 0.45;
}

.messages {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 20px 22px;
}

.empty-chat {
  color: #94a3b8;
  font-size: 13px;
  text-align: center;
}

.message {
  display: flex;
  max-width: 84%;
  flex-direction: column;
  gap: 5px;
}

.message + .message {
  margin-top: 16px;
}

.message.user {
  margin-left: auto;
  align-items: flex-end;
}

.message-role {
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
}

.message p {
  padding: 11px 13px;
  border: 1px solid #d7dee6;
  border-radius: 9px;
  background: #f8fafc;
  color: #334155;
  font-size: 13px;
  line-height: 1.5;
}

.message.user p {
  border-color: #2563eb;
  background: #2563eb;
  color: white;
}

.message small {
  color: #64748b;
  font-size: 11px;
}

.delete-message {
  border: 0;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-size: 11px;
  text-decoration: underline;
}

.chat-form {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
}

.chat-form textarea {
  min-height: 42px;
  padding: 10px;
  resize: vertical;
}

.chat-form button {
  align-self: flex-end;
  padding: 10px 14px;
  border: 1px solid #2563eb;
  border-radius: 7px;
  background: #2563eb;
  color: white;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
}

.chat-form button:disabled {
  border-color: #cbd5e1;
  background: #cbd5e1;
  cursor: not-allowed;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (max-width: 1230px) {
  .retrieval-layout {
    grid-template-columns: 250px minmax(0, 1fr);
  }

  .chat-panel {
    grid-column: 1 / -1;
    min-height: 520px;
  }
}

@media (max-width: 800px) {
  .retrieval-layout {
    display: block;
    padding: 0;
  }

  .configuration-panel,
  .chat-panel {
    border: 0;
    border-bottom: 1px solid #d7dee6;
    border-radius: 0;
  }

  .reranking-row {
    grid-template-columns: 1fr;
  }
}
</style>
