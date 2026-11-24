<script setup lang="ts">
import { ref } from 'vue'
import LandingView from './views/LandingView.vue'
import IngestionView from './views/IngestionView.vue'
import IngestionVisualisationView from './views/IngestionVisualisationView.vue'
import RetrievalView from './views/RetrievalView.vue'
import ComparisonView from './views/ComparisonView.vue'
import type { IngestionSettings, RunSnapshot } from './types/rag'

const currentView = ref<'landing' | 'ingestion' | 'ingestion-visualisation' | 'retrieval' | 'comparison'>('landing')
const selectedFile = ref<File | null>(null)
const ingestionSettings = ref<IngestionSettings | null>(null)
const snapshots = ref<RunSnapshot[]>([])

function openIngestion(file: File) {
  selectedFile.value = file
  ingestionSettings.value = null
  currentView.value = 'ingestion'
}

function openIngestionVisualisation(settings: IngestionSettings) {
  ingestionSettings.value = settings
  currentView.value = 'ingestion-visualisation'
}

function openRetrieval() {
  currentView.value = 'retrieval'
}

function saveSnapshot(snapshot: RunSnapshot) {
  snapshots.value = [...snapshots.value, snapshot]
}

function openComparison() {
  if (!snapshots.value.length) return

  currentView.value = 'comparison'
}

function startNewRun() {
  selectedFile.value = null
  ingestionSettings.value = null
  currentView.value = 'landing'
}
</script>

<template>
  <LandingView
    v-if="currentView === 'landing'"
    @continue="openIngestion"
  />

  <IngestionView
    v-else-if="currentView === 'ingestion' && selectedFile"
    :file="selectedFile"
    @back="currentView = 'landing'"
    @ingest="openIngestionVisualisation"
  />

  <IngestionVisualisationView
    v-else-if="currentView === 'ingestion-visualisation' && selectedFile && ingestionSettings"
    :file="selectedFile"
    :settings="ingestionSettings"
    @back="currentView = 'ingestion'"
    @continue="openRetrieval"
  />

  <RetrievalView
    v-if="(currentView === 'retrieval' || currentView === 'comparison') && selectedFile && ingestionSettings"
    v-show="currentView === 'retrieval'"
    :file="selectedFile"
    :ingestion-settings="ingestionSettings"
    :snapshot-count="snapshots.length"
    @back="currentView = 'ingestion-visualisation'"
    @save-snapshot="saveSnapshot"
    @compare="openComparison"
  />

  <ComparisonView
    v-if="currentView === 'comparison'"
    :snapshots="snapshots"
    @back="currentView = 'retrieval'"
    @start-new-run="startNewRun"
  />
</template>
