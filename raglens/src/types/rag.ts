export type ChunkingStrategy =
  | 'parent-child'
  | 'function-aware'
  | 'ast-based'

export interface CodeChunk {
  id: string
  parentId?: string
  content: string
  startLine: number
  endLine: number
}

export interface IngestionSettings {
  method: ChunkingStrategy
  chunkSize: number | null
  chunks: CodeChunk[]
  overlap: number
  minimumSize: number
  parentContext: string
  metadata: string
}

export interface RetrievalSettings {
  searchMethod: string
  topK: number
  reranking: boolean
  rerankTopN: number | null
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  retrievalSettings?: RetrievalSettings
}

export interface RunSnapshot {
  id: number
  name: string
  fileName: string
  ingestionSettings: IngestionSettings
  retrievalSettings: RetrievalSettings
  messages: ChatMessage[]
}

export function describeRetrieval(settings: RetrievalSettings) {
  const { searchMethod, topK, reranking, rerankTopN } = settings
  const rerankingLabel = reranking ? `reranked to ${rerankTopN}` : 'no reranking'
  return `${searchMethod} search · top ${topK} · ${rerankingLabel}`
}
