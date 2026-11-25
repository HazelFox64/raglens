import { Language, Parser } from 'web-tree-sitter'
import type { Node } from 'web-tree-sitter'
import runtimeUrl from 'web-tree-sitter/web-tree-sitter.wasm?url'
import grammarUrl from 'tree-sitter-python/tree-sitter-python.wasm?url'
import type { CodeChunk, SourceFile } from '../types/rag'
import { chunkSyntax } from './syntaxChunks'

export interface AstRequest {
  id: number
  files: SourceFile[]
  target: number
}

export interface AstResponse {
  id: number
  chunks: CodeChunk[]
  errors: string[]
}

let parserPromise: Promise<Parser> | undefined

async function createParser() {
  await Parser.init({ locateFile: () => runtimeUrl })
  const language = await Language.load(grammarUrl)
  const parser = new Parser()
  parser.setLanguage(language)
  return parser
}

function syntaxErrorLine(node: Node): number {
  if (node.isError || node.isMissing) return node.startPosition.row + 1
  // Missing tokens can be anonymous, so inspect all children when looking for an error.
  const child = node.children.find(child => child.hasError || child.isMissing)
  return child ? syntaxErrorLine(child) : node.startPosition.row + 1
}

self.addEventListener('message', async ({ data }: MessageEvent<AstRequest>) => {
  const { id, files, target } = data
  const response: AstResponse = { id, chunks: [], errors: [] }

  try {
    const parser = await (parserPromise ??= createParser())
    for (const file of files) {
      if (!file.lines.length) continue

      const tree = parser.parse(file.lines.join('\n') + '\n')
      if (!tree) {
        response.errors.push(`${file.path}: the parser returned no syntax tree.`)
        continue
      }

      try {
        const root = tree.rootNode
        if (root.hasError) {
          response.errors.push(`${file.path}:${syntaxErrorLine(root)}: Python syntax error.`)
        } else {
          for (const chunk of chunkSyntax(file, root, target, response.chunks.length + 1)) {
            response.chunks.push(chunk)
          }
        }
      } finally {
        tree.delete()
      }
    }
  } catch {
    parserPromise = undefined
    response.errors.push('The AST preview could not be generated. Try selecting AST again.')
  }

  self.postMessage(response)
})
