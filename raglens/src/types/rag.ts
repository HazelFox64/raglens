export type ChunkingStrategy =
  | 'fixed-size'
  | 'function-aware'
  | 'ast-based'

export interface CodeChunk {
  id: string
  content: string
  startLine: number
  endLine: number
}