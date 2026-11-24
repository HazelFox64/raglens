<template>
  <aside class="settings-bar" aria-label="Applied settings">
    <p class="settings-title">Settings</p>

    <div class="source-file">
      <strong>Source File:</strong>
      <span>{{ fileName }}</span>
    </div>

    <section class="stage-section">
      <p class="stage-title"><span>1</span> Ingestion</p>

      <dl v-if="methodLabel" class="stage-settings">
        <div class="setting-item">
          <span class="setting-bullet" />
          <div>
            <dt>Chunking Method:</dt>
            <dd>{{ methodLabel }}</dd>
          </div>
        </div>

        <div v-if="chunkSize" class="setting-item">
          <span class="setting-bullet" />
          <div>
            <dt>Chunk Size:</dt>
            <dd>{{ chunkSize }} Lines</dd>
          </div>
        </div>

        <div class="setting-item">
          <span class="setting-bullet" />
          <div>
            <dt>Chunk Overlap:</dt>
            <dd>{{ overlap }} Lines</dd>
          </div>
        </div>

        <div class="setting-item">
          <span class="setting-bullet" />
          <div>
            <dt>Minimum Chunk Size:</dt>
            <dd>{{ minimumSize }} {{ minimumSize === 1 ? 'Line' : 'Lines' }}</dd>
          </div>
        </div>

        <div class="setting-item">
          <span class="setting-bullet" />
          <div>
            <dt>Parent Context:</dt>
            <dd>{{ parentContext }}</dd>
          </div>
        </div>

        <div class="setting-item">
          <span class="setting-bullet" />
          <div>
            <dt>Chunk Metadata:</dt>
            <dd>{{ metadata }}</dd>
          </div>
        </div>

        <div class="setting-item">
          <span class="setting-bullet" />
          <div>
            <dt>Chunks:</dt>
            <dd>{{ chunkCount }}</dd>
          </div>
        </div>
      </dl>
    </section>

    <section v-if="retrievalSettings" class="stage-section retrieval-stage">
      <p class="stage-title"><span>2</span> Retrieval</p>

      <dl class="stage-settings">
        <div class="setting-item">
          <span class="setting-bullet" />
          <div>
            <dt>Search Method:</dt>
            <dd>{{ retrievalSettings.searchMethod }}</dd>
          </div>
        </div>

        <div class="setting-item">
          <span class="setting-bullet" />
          <div>
            <dt>Top K:</dt>
            <dd>{{ retrievalSettings.topK }} Chunks</dd>
          </div>
        </div>

        <div class="setting-item">
          <span class="setting-bullet" />
          <div>
            <dt>Reranking:</dt>
            <dd>{{ retrievalSettings.reranking ? 'Enabled' : 'Disabled' }}</dd>
          </div>
        </div>

        <div v-if="retrievalSettings.rerankTopN" class="setting-item">
          <span class="setting-bullet" />
          <div>
            <dt>Reranking Top N:</dt>
            <dd>{{ retrievalSettings.rerankTopN }} {{ retrievalSettings.rerankTopN === 1 ? 'Chunk' : 'Chunks' }}</dd>
          </div>
        </div>
      </dl>
    </section>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  fileName: string
  methodLabel: string
  chunkSize: number | null
  chunkCount: number
  overlap: number
  minimumSize: number
  parentContext: string
  metadata: string
  retrievalSettings?: {
    searchMethod: string
    topK: number
    reranking: boolean
    rerankTopN: number | null
  }
}>()
</script>

<style scoped>
.settings-bar {
  min-height: 0;
  border: 1px solid #d7dee6;
  border-radius: 10px;
  background: white;
  overflow: auto;
}

.settings-title {
  padding: 15px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafafa;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.source-file {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
  line-height: 1.45;
}

.source-file strong {
  margin-right: 4px;
  font-weight: 700;
}

.source-file span {
  overflow-wrap: anywhere;
  color: #334155;
}

.stage-section {
  padding: 18px 16px;
}

.retrieval-stage {
  border-top: 1px solid #e5e7eb;
}

.stage-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 600;
}

.stage-title span {
  display: grid;
  width: 21px;
  height: 21px;
  place-items: center;
  border: 1px solid #93c5fd;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 400;
}

.stage-settings {
  margin-top: 12px;
  display: grid;
  gap: 13px;
}

.setting-item {
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr);
  align-items: start;
  gap: 8px;
}

.setting-bullet {
  width: 6px;
  height: 6px;
  margin-top: 6px;
  border-radius: 50%;
  background: #93c5fd;
}

.setting-item > div {
  min-width: 0;
}

.stage-settings dt,
.stage-settings dd {
  font-size: 13px;
  line-height: 1.4;
}

.stage-settings dt {
  font-weight: 700;
}

.stage-settings dd {
  margin-top: 2px;
  color: #334155;
}

@media (max-width: 800px) {
  .settings-bar {
    border-right: 0;
    border-bottom: 1px solid #111;
  }
}
</style>
