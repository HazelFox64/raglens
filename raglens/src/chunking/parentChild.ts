import type { CodeChunk, ParentChunk, SourceFile, SourceSpan } from '../types/rag'

// Line offsets are zero-based with an exclusive end until they leave the splitter.
interface LineRange {
  start: number
  end: number
}

interface ChunkLimits {
  size: number
  overlap: number
  minimumSize: number
}

export function chunkParentChild(files: SourceFile[], limits: ChunkLimits) {
  const { size, overlap, minimumSize } = limits
  if (![size, overlap, minimumSize].every(Number.isSafeInteger) ||
      size < 1 || overlap < 0 || overlap >= size || minimumSize < 1 || minimumSize > size) {
    throw new RangeError('Invalid parent-child chunk limits.')
  }

  const parents: ParentChunk[] = []
  const chunks: CodeChunk[] = []

  for (const file of files) {
    const { lines } = file
    const parentRanges = splitLines(
      { start: 0, end: lines.length },
      { size: size * 3, overlap: 0, minimumSize: size * 2 }
    )

    for (const range of parentRanges) {
      const parentId = String(parents.length + 1).padStart(2, '0')
      parents.push({ id: parentId, ...sourceSpan(file, range) })

      for (const childRange of splitLines(range, limits)) {
        chunks.push({
          id: String(chunks.length + 1).padStart(2, '0'),
          parentId,
          ...sourceSpan(file, childRange)
        })
      }
    }
  }

  return { parents, chunks }
}

function splitLines(range: LineRange, limits: ChunkLimits) {
  const { size, overlap, minimumSize } = limits
  const length = range.end - range.start
  if (length === 0) return []
  if (length <= size) return [range]

  const stride = size - overlap
  const count = Math.ceil((length - overlap) / stride)
  // Lower the minimum only when the range cannot support it for every child.
  const average = Math.floor((length + (count - 1) * overlap) / count)
  const minimum = Math.min(Math.max(minimumSize, overlap + 1), average)
  const ranges: LineRange[] = []
  let start = range.start

  for (let remaining = count - 1; remaining > 0; remaining--) {
    // Leave enough lines for the remaining chunks and room for their overlap.
    const end = Math.min(start + size, range.end - remaining * (minimum - overlap))
    ranges.push({ start, end })
    start = end - overlap
  }

  ranges.push({ start, end: range.end })
  return ranges
}

function sourceSpan(file: SourceFile, range: LineRange): SourceSpan {
  return {
    sourcePath: file.path,
    content: file.lines.slice(range.start, range.end).join('\n'),
    startLine: range.start + 1,
    endLine: range.end
  }
}
