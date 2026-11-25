<template>
  <main class="comparison-page">
    <header class="app-header">
      <h2>RAGLens</h2>
      <span>Stage 4 · Comparison</span>
    </header>

    <section class="comparison-content">
      <header class="comparison-header">
        <div>
          <button class="back-button" type="button" @click="$emit('back')">
            {{ returnToRetrieval ? '← Back to retrieval' : '← Back to start' }}
          </button>
          <h1>Comparison</h1>
        </div>

        <div class="header-actions">
          <button
            type="button"
            :disabled="!canOpenSnapshot"
            :aria-expanded="showSnapshotPicker"
            aria-controls="snapshot-picker"
            @click="showSnapshotPicker = !showSnapshotPicker"
          >
            + Open snapshot
          </button>
          <button class="primary-button" type="button" @click="$emit('start-new-run')">
            Start new run
          </button>
        </div>
      </header>

      <section v-show="showSnapshotPicker" id="snapshot-picker" class="snapshot-picker" aria-labelledby="snapshot-picker-title">
        <h2 id="snapshot-picker-title">Saved snapshots</h2>
        <ul>
          <li v-for="snapshot in availableSnapshots" :key="snapshot.id">
            <button type="button" @click="openSnapshot(snapshot.id)">
              <strong>{{ snapshot.name }}</strong>
              <span>{{ snapshot.fileName }}</span>
            </button>
          </li>
        </ul>
      </section>

      <p v-if="!openSnapshots.length" class="empty-state">
        {{ snapshots.length ? 'Open a saved snapshot to compare it here.' : 'Save a run snapshot from Retrieval to compare it here.' }}
      </p>

      <div v-else class="comparison-grid">
        <article v-for="snapshot in openSnapshots" :key="snapshot.id" class="snapshot-card">
          <header class="snapshot-header">
            <div>
              <h2>{{ snapshot.name }}</h2>
              <p>{{ snapshot.fileName }}</p>
              <details v-if="snapshot.sourcePaths" class="snapshot-files">
                <summary>{{ snapshot.sourcePaths.length }} Python {{ snapshot.sourcePaths.length === 1 ? 'file' : 'files' }}</summary>
                <ul>
                  <li v-for="path in snapshot.sourcePaths" :key="path">{{ path }}</li>
                </ul>
              </details>
            </div>
            <button type="button" :aria-label="`Close ${snapshot.name}`" @click="closeSnapshot(snapshot.id)">×</button>
          </header>

          <div class="settings-summary">
            <section>
              <h3>Ingestion</h3>
              <p>{{ ingestionSummary(snapshot) }}</p>
              <details>
                <summary>More settings</summary>
                <dl>
                  <dt>Chunks</dt>
                  <dd>{{ snapshot.ingestionSettings.chunks.length }}</dd>
                  <template v-if="!snapshot.ingestionSettings.astTargetSize">
                    <dt>Minimum size</dt>
                    <dd>{{ snapshot.ingestionSettings.minimumSize }} lines</dd>
                  </template>
                  <dt>Parent context</dt>
                  <dd>{{ snapshot.ingestionSettings.parentContext }}</dd>
                  <dt>Metadata</dt>
                  <dd>{{ snapshot.ingestionSettings.metadata }}</dd>
                </dl>
              </details>
            </section>
            <section>
              <h3>Retrieval</h3>
              <p>{{ describeRetrieval(snapshot.retrievalSettings) }}</p>
            </section>
          </div>

          <div class="snapshot-chat">
            <p class="chat-title">Chat history</p>
            <p v-if="!snapshot.messages.length" class="no-messages">No messages saved.</p>

            <article
              v-for="message in snapshot.messages"
              :key="message.id"
              class="message"
              :class="message.role"
            >
              <span>{{ message.role === 'user' ? 'You' : 'RAGLens' }}</span>
              <p>{{ message.text }}</p>
              <small v-if="message.retrievalSettings">
                {{ describeRetrieval(message.retrievalSettings) }}
              </small>
            </article>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { describeRetrieval } from '../types/rag'
import type { RunSnapshot } from '../types/rag'

const props = defineProps<{
  snapshots: RunSnapshot[]
  returnToRetrieval: boolean
}>()

defineEmits<{
  back: []
  'start-new-run': []
}>()

const maximumOpenSnapshots = 3
const openSnapshotIds = ref(props.snapshots.slice(-1).map(snapshot => snapshot.id))
const showSnapshotPicker = ref(false)

const openSnapshots = computed(() =>
  props.snapshots.filter(snapshot => openSnapshotIds.value.includes(snapshot.id))
)
const availableSnapshots = computed(() =>
  props.snapshots.filter(snapshot => !openSnapshotIds.value.includes(snapshot.id))
)
const canOpenSnapshot = computed(() =>
  openSnapshotIds.value.length < maximumOpenSnapshots && availableSnapshots.value.length > 0
)

function openSnapshot(snapshotId: number) {
  if (!canOpenSnapshot.value || !availableSnapshots.value.some(snapshot => snapshot.id === snapshotId)) return

  openSnapshotIds.value.push(snapshotId)
  showSnapshotPicker.value = false
}

function closeSnapshot(snapshotId: number) {
  openSnapshotIds.value = openSnapshotIds.value.filter(id => id !== snapshotId)
}

function ingestionSummary(snapshot: RunSnapshot) {
  const { method, chunkSize, astTargetSize, overlap } = snapshot.ingestionSettings

  const labels = {
    'parent-child': 'Parent/Child',
    'function-aware': 'Function/Class Aware',
    'ast-based': 'AST'
  }
  const parts = [labels[method]]
  if (chunkSize !== null) parts.push(`${chunkSize} lines`)
  if (astTargetSize !== undefined) {
    parts.push(`${astTargetSize}-line target`)
  } else {
    parts.push(`${overlap} line overlap`)
  }
  return parts.join(' · ')
}
</script>

<style scoped>
.comparison-page {
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

.comparison-content {
  max-width: 1480px;
  margin: 0 auto;
  padding: 28px;
}

.comparison-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.back-button {
  margin-bottom: 14px;
  border: 0;
  background: transparent;
  color: #475569;
  font: inherit;
  font-size: 13px;
}

h1 {
  color: #1e293b;
  font-size: 28px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.header-actions button {
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: white;
  color: #334155;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
}

.header-actions button:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.header-actions .primary-button {
  border-color: #2563eb;
  background: #2563eb;
  color: white;
}

.snapshot-picker {
  max-width: 420px;
  margin: 0 0 18px auto;
  padding: 14px;
  border: 1px solid #d7dee6;
  border-radius: 10px;
  background: white;
}

.snapshot-picker h2 {
  margin-bottom: 8px;
  font-size: 14px;
}

.snapshot-picker ul {
  max-height: 240px;
  overflow: auto;
  list-style: none;
}

.snapshot-picker button {
  width: 100%;
  padding: 8px;
  border: 0;
  border-radius: 6px;
  background: white;
  color: #1e293b;
  font-size: 13px;
  text-align: left;
  overflow-wrap: anywhere;
}

.snapshot-picker button:hover,
.snapshot-picker button:focus-visible {
  background: #eff6ff;
}

.snapshot-picker span {
  display: block;
  margin-top: 3px;
  color: #475569;
  font-size: 12px;
}

.empty-state {
  padding: 48px;
  border: 1px solid #d7dee6;
  border-radius: 10px;
  background: white;
  color: #64748b;
  font-size: 14px;
  text-align: center;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 18px;
}

.snapshot-card {
  display: flex;
  min-height: 550px;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #d7dee6;
  border-radius: 14px;
  background: white;
}

.snapshot-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
  border-bottom: 1px solid #e5e7eb;
}

.snapshot-header h2 {
  margin-bottom: 4px;
  color: #1e293b;
  font-size: 16px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.snapshot-header p {
  color: #64748b;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.snapshot-files {
  margin-top: 6px;
  color: #475569;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.snapshot-files summary {
  cursor: pointer;
}

.snapshot-files ul {
  margin: 4px 0 0 16px;
}

.snapshot-header button {
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #64748b;
  font-size: 21px;
  line-height: 1;
}

.snapshot-header button:hover {
  background: #f1f5f9;
  color: #334155;
}

.settings-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid #e5e7eb;
}

.settings-summary section {
  padding: 14px;
}

.settings-summary section + section {
  border-left: 1px solid #e5e7eb;
}

.settings-summary h3 {
  margin-bottom: 6px;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.settings-summary p {
  color: #334155;
  font-size: 12px;
  line-height: 1.5;
}

.settings-summary details {
  margin-top: 8px;
  color: #475569;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.settings-summary summary {
  cursor: pointer;
}

.settings-summary dt {
  margin-top: 6px;
  font-weight: 600;
}

.message small {
  color: #64748b;
  font-size: 12px;
}

.snapshot-chat {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.chat-title {
  margin-bottom: 14px;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.no-messages {
  color: #94a3b8;
  font-size: 13px;
}

.message {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message + .message {
  margin-top: 14px;
}

.message.user {
  align-items: flex-end;
}

.message span {
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
}

.message p {
  padding: 9px 11px;
  border: 1px solid #d7dee6;
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
  line-height: 1.5;
}

.message.user p {
  border-color: #2563eb;
  background: #2563eb;
  color: white;
}

@media (max-width: 700px) {
  .app-header {
    padding: 0 20px;
  }

  .comparison-content {
    padding: 22px 20px;
  }

  .comparison-header {
    display: block;
  }

  .header-actions {
    margin-top: 18px;
  }
}
</style>
