export type ChunkingStrategy =
  | 'parent-child'
  | 'function-aware'
  | 'ast-based'

export interface SourceFile {
  path: string
  lines: string[]
}

export interface SourceSelection {
  name: string
  isFolder: boolean
  files: SourceFile[]
}

export interface SourceSpan {
  sourcePath: string
  content: string
  startLine: number
  endLine: number
}

export interface CodeChunk extends SourceSpan {
  id: string
  parentId?: string
  symbolName?: string
}

export interface ParentChunk extends SourceSpan {
  id: string
}

export interface IngestionSettings {
  method: ChunkingStrategy
  chunkSize: number | null
  astTargetSize?: number
  chunks: CodeChunk[]
  parents?: ParentChunk[]
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
  embeddingIndexId?: string
  name: string
  fileName: string
  sourcePaths?: string[]
  ingestionSettings: IngestionSettings
  retrievalSettings: RetrievalSettings
  messages: ChatMessage[]
}

export function describeRetrieval(settings: RetrievalSettings) {
  const { searchMethod, topK, reranking, rerankTopN } = settings
  const rerankingLabel = reranking ? `reranked to ${rerankTopN}` : 'no reranking'
  return `${searchMethod} search · top ${topK} · ${rerankingLabel}`
}
