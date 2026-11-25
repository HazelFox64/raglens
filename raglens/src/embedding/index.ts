import type { CodeChunk } from '../types/rag'

export const embeddingModel = {
  id: 'Xenova/all-MiniLM-L6-v2',
  revision: '751bff37182d3f1213fa05d7196b954e230abad9',
  dtype: 'q8',
  dimensions: 384,
  tokenLimit: 256,
  inputFormat: 'raw-code-v1',
  pooling: 'mean-l2'
} as const

export interface EmbeddingIndex {
  id: string
  model: typeof embeddingModel
  chunks: CodeChunk[]
  vectors: Float32Array
  tokenCounts: number[]
}

export type EmbeddingMessage =
  | { type: 'ready' }
  | { type: 'batch'; offset: number; vectors: Float32Array; tokenCounts: number[] }
  | { type: 'error'; message: string }
