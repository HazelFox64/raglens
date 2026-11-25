<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import LandingView from './views/LandingView.vue'
import IngestionView from './views/IngestionView.vue'
import IngestionVisualisationView from './views/IngestionVisualisationView.vue'
import RetrievalView from './views/RetrievalView.vue'
import ComparisonView from './views/ComparisonView.vue'
import type { IngestionSettings, RunSnapshot, SourceSelection } from './types/rag'
import type { EmbeddingIndex } from './embedding/index'
import { loadSnapshots, storeSnapshot } from './embedding/savedRuns'

const currentView = ref<'landing' | 'ingestion' | 'ingestion-visualisation' | 'retrieval' | 'comparison'>('landing')
const selectedSource = ref<SourceSelection | null>(null)
const ingestionSettings = ref<IngestionSettings | null>(null)
const embeddingIndex = shallowRef<EmbeddingIndex | null>(null)
const snapshots = ref<RunSnapshot[]>([])
const comparisonBackView = ref<'landing' | 'retrieval'>('landing')

function openIngestion(source: SourceSelection) {
  selectedSource.value = source
  ingestionSettings.value = null
  embeddingIndex.value = null
  currentView.value = 'ingestion'
}

function openIngestionVisualisation(settings: IngestionSettings) {
  ingestionSettings.value = settings
  embeddingIndex.value = null
  currentView.value = 'ingestion-visualisation'
}

function openRetrieval(index: EmbeddingIndex) {
  embeddingIndex.value = index
  currentView.value = 'retrieval'
}

async function saveSnapshot(snapshot: RunSnapshot) {
  const index = embeddingIndex.value
  if (!index) throw new Error('The current run has no embedding index.')

  await storeSnapshot(snapshot, index)
  snapshots.value = [...snapshots.value, { ...snapshot, embeddingIndexId: index.id }]
}

function openComparison() {
  if (!snapshots.value.length) return

  comparisonBackView.value = currentView.value === 'retrieval' ? 'retrieval' : 'landing'
  currentView.value = 'comparison'
}

function startNewRun() {
  selectedSource.value = null
  ingestionSettings.value = null
  embeddingIndex.value = null
  currentView.value = 'landing'
}

onMounted(async () => {
  try {
    const saved = await loadSnapshots()
    const known = new Set(snapshots.value.map(snapshot => snapshot.id))
    snapshots.value = [...saved.filter(snapshot => !known.has(snapshot.id)), ...snapshots.value]
  } catch (error) {
    console.warn('Could not read saved RAGLens snapshots', error)
  }
})
</script>

<template>
  <LandingView
    v-if="currentView === 'landing'"
    :has-snapshots="snapshots.length > 0"
    @continue="openIngestion"
    @compare="openComparison"
  />

  <IngestionView
    v-else-if="currentView === 'ingestion' && selectedSource"
    :source="selectedSource"
    @back="currentView = 'landing'"
    @ingest="openIngestionVisualisation"
  />

  <IngestionVisualisationView
    v-else-if="currentView === 'ingestion-visualisation' && selectedSource && ingestionSettings"
    :source="selectedSource"
    :settings="ingestionSettings"
    :existing-index="embeddingIndex"
    @back="currentView = 'ingestion'"
    @continue="openRetrieval"
  />

  <RetrievalView
    v-if="(currentView === 'retrieval' || currentView === 'comparison') && selectedSource && ingestionSettings && embeddingIndex"
    v-show="currentView === 'retrieval'"
    :source="selectedSource"
    :ingestion-settings="ingestionSettings"
    :snapshot-count="snapshots.length"
    :save-run="saveSnapshot"
    @back="currentView = 'ingestion-visualisation'"
    @compare="openComparison"
  />

  <ComparisonView
    v-if="currentView === 'comparison'"
    :snapshots="snapshots"
    :return-to-retrieval="comparisonBackView === 'retrieval'"
    @back="currentView = comparisonBackView"
    @start-new-run="startNewRun"
  />
</template>
