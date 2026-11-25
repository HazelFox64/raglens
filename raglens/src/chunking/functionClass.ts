import type { CodeChunk, SourceFile } from '../types/rag'

interface StatementStart {
  line: number
  decorator: boolean
  symbolName?: string
}

export function chunkFunctionsAndClasses(files: SourceFile[]): CodeChunk[] {
  const chunks: CodeChunk[] = []

  for (const file of files) {
    const statements = topLevelStatements(file.lines)
    let nextLine = 0

    function addChunk(start: number, end: number, symbolName?: string) {
      if (start >= end) return

      chunks.push({
        id: String(chunks.length + 1).padStart(2, '0'),
        sourcePath: file.path,
        startLine: start + 1,
        endLine: end,
        content: file.lines.slice(start, end).join('\n'),
        symbolName
      })
    }

    for (const [index, statement] of statements.entries()) {
      if (!statement.symbolName) continue

      let start = statement.line
      for (let previous = index - 1; statements[previous]?.decorator; previous--) {
        start = statements[previous]!.line
      }

      const end = statements[index + 1]?.line ?? file.lines.length
      addChunk(nextLine, start)
      addChunk(start, end, statement.symbolName)
      nextLine = end
    }

    addChunk(nextLine, file.lines.length)
  }

  return chunks
}

function topLevelStatements(lines: string[]) {
  const statements: StatementStart[] = []
  let quote = ''
  let brackets = 0
  let continued = false

  for (const [lineNumber, source] of lines.entries()) {
    const line = lineNumber === 0 ? source.replace(/^\uFEFF/, '') : source

    // A line can look like a definition while inside a string or continued statement.
    if (!quote && brackets === 0 && !continued && /^[^\s#]/.test(line)) {
      const definition = /^(?:async\s+def|def|class)\s+([_\p{ID_Start}][_\p{ID_Continue}]*)/u.exec(line)
      statements.push({
        line: lineNumber,
        decorator: line.startsWith('@'),
        symbolName: definition?.[1]
      })
    }

    continued = false
    for (let index = 0; index < line.length; index++) {
      const char = line[index]

      if (char === '\\') {
        continued = index === line.length - 1
        index++
        continue
      }

      if (quote) {
        if (line.startsWith(quote, index)) {
          index += quote.length - 1
          quote = ''
        }
        continue
      }

      if (char === '#') break
      if (char === '"' || char === "'") {
        const tripleQuote = char.repeat(3)
        quote = line.startsWith(tripleQuote, index) ? tripleQuote : char
        index += quote.length - 1
      } else if (char === '(' || char === '[' || char === '{') {
        brackets++
      } else if (char === ')' || char === ']' || char === '}') {
        brackets = Math.max(0, brackets - 1)
      }
    }

    if (quote.length === 1 && !continued) quote = ''
  }

  return statements
}
