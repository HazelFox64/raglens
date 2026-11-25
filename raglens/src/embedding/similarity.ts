import type { EmbeddingIndex } from './index'

export interface SimilarChunk {
  row: number
  score: number
}

export function rankSimilarChunks(index: EmbeddingIndex, query: Float32Array, limit = 3): SimilarChunk[] {
  const { dimensions } = index.model
  if (query.length !== dimensions || index.vectors.length !== index.chunks.length * dimensions) {
    throw new Error('Vector dimensions do not match the index.')
  }

  // Unit-length vectors make the dot product equal to cosine similarity.
  return index.chunks.map((_, row) => {
    const offset = row * dimensions
    let score = 0
    for (let dim = 0; dim < dimensions; dim++) {
      score += query[dim]! * index.vectors[offset + dim]!
    }
    return { row, score: Math.max(-1, Math.min(1, score)) }
  }).sort((a, b) => b.score - a.score || a.row - b.row).slice(0, limit)
}
