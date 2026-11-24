<template>
  <section class="code-viewer" aria-label="Source code preview">
    <header class="code-header">
      <span>{{ label || fileName }}</span>
      <span>{{ lineCount }} lines</span>
    </header>

    <div class="code-scroll" tabindex="0" role="region" :aria-label="label || 'Code lines'">
      <template v-if="chunks.length">
        <article
          v-for="chunk in chunks"
          :key="chunk.id"
          class="chunk-block"
          :class="chunkColour(chunk.id)"
        >
          <p class="chunk-label">
            Chunk {{ chunk.id }}
            <span v-if="chunk.parentId">· Parent {{ chunk.parentId }}</span>
          </p>

          <div
            v-for="lineNumber in chunkLineNumbers(chunk)"
            :key="lineNumber"
            class="code-line"
          >
            <span class="line-number">{{ lineNumber }}</span>
            <span class="line-content" v-html="highlightLine(lines[lineNumber - 1])" />
          </div>
        </article>
      </template>

      <template v-else-if="showSourceWhenEmpty">
        <div v-for="(line, index) in lines" :key="index" class="code-line">
          <span class="line-number">{{ index + 1 }}</span>
          <span class="line-content" v-html="highlightLine(line)" />
        </div>
      </template>

      <p v-else class="empty-queue">All chunks have been embedded.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CodeChunk } from '../types/rag'

const props = withDefaults(defineProps<{
  fileName: string
  source: string
  chunks: CodeChunk[]
  label?: string
  showSourceWhenEmpty?: boolean
}>(), {
  label: '',
  showSourceWhenEmpty: true
})

const lines = computed(() => {
  if (!props.source) return []

  return props.source.replace(/\r?\n$/, '').split(/\r?\n/)
})
const lineCount = computed(() => lines.value.length)

function chunkLineNumbers(chunk: CodeChunk) {
  return Array.from(
    { length: chunk.endLine - chunk.startLine + 1 },
    (_, index) => chunk.startLine + index
  )
}

function chunkColour(chunkId: string) {
  return `chunk-${(Number.parseInt(chunkId, 10) - 1) % 4}`
}

function highlightLine(line: string | undefined) {
  const safeLine = (line ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

  return safeLine.replace(
    /(#.*$)|(".*?"|'.*?')|(@\w+)|\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b|\b(print|len|range|str|int|float|list|dict|set|tuple|open|input|enumerate|zip)\b|\b(\d+(?:\.\d+)?)\b/g,
    (match, comment, string, decorator, keyword, builtin, number) => {
      if (comment) return `<span class="token-comment">${match}</span>`
      if (string) return `<span class="token-string">${match}</span>`
      if (decorator) return `<span class="token-decorator">${match}</span>`
      if (keyword) return `<span class="token-keyword">${match}</span>`
      if (builtin) return `<span class="token-builtin">${match}</span>`
      if (number) return `<span class="token-number">${match}</span>`
      return match
    }
  )
}
</script>

<style scoped>
.code-viewer {
  display: flex;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  border: 1px solid #d7dee6;
  border-radius: 10px;
  background: white;
}

.code-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 8px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
}

.code-header span:last-child {
  color: #555;
  font-size: 12px;
}

.code-scroll {
  min-height: 0;
  flex: 1;
  overflow: auto;
  overscroll-behavior: contain;
}

.code-scroll:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}

.chunk-block {
  min-height: 120px;
  padding: 8px 0 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
}

.chunk-0 { background: #ffe7c7; }
.chunk-1 { background: #dce8fc; }
.chunk-2 { background: #dbeed7; }
.chunk-3 { background: #eadcf0; }

.chunk-label {
  margin: 0 0 20px;
  padding: 0 6px;
  font-size: 13px;
  font-weight: 500;
}

.empty-queue {
  padding: 24px 16px;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}

.code-line {
  display: grid;
  grid-template-columns: 36px 1fr;
  min-width: max-content;
  padding-right: 18px;
  font-size: 13px;
  line-height: 1.8;
  white-space: pre;
}

.line-number {
  padding-right: 12px;
  color: #555;
  text-align: right;
  user-select: none;
}

.line-content {
  color: #111;
}

:deep(.token-comment) { color: #555; }
:deep(.token-string) { color: #8a3d00; }
:deep(.token-keyword) { color: #4338ca; font-weight: 600; }
:deep(.token-decorator) { color: #a21caf; }
:deep(.token-builtin) { color: #0369a1; }
:deep(.token-number) { color: #075985; }

@media (max-width: 900px) {
  .code-viewer {
    height: min(60dvh, 480px);
    border-top: 1px solid #d7dee6;
    border-left: 0;
    border-radius: 0;
  }
}
</style>
