import type { Node } from 'web-tree-sitter'
import type { CodeChunk, SourceFile } from '../types/rag'

interface Section {
  start: number
  end: number
  symbolName?: string
  definition?: boolean
}

const clauses = new Set(['elif_clause', 'else_clause', 'except_clause', 'finally_clause', 'case_clause'])

export function chunkSyntax(file: SourceFile, root: Node, target: number, firstChunk: number): CodeChunk[] {
  if (!file.lines.length) return []

  const sections = root.namedChildren
    .filter(node => node.type !== 'comment')
    .flatMap(node => splitNode(node, target))
  const groups: Section[] = []

  for (const section of sections) {
    const previous = groups[groups.length - 1]
    // The viewer highlights whole lines, so statements sharing a line stay together.
    const sharesLine = previous && section.start < previous.end
    const fits = previous && !section.definition && !previous.definition &&
      section.symbolName === previous.symbolName && section.end - previous.start <= target

    if (previous && (sharesLine || fits)) {
      previous.end = Math.max(previous.end, section.end)
    } else {
      groups.push({ ...section })
    }
  }

  if (!groups.length) groups.push({ start: 0, end: file.lines.length })

  return groups.map((group, index) => {
    // Carry the gaps between syntax nodes into the source ranges so no lines are lost.
    const start = index === 0 ? 0 : group.start
    const end = groups[index + 1]?.start ?? file.lines.length
    return {
      id: String(firstChunk + index).padStart(2, '0'),
      sourcePath: file.path,
      startLine: start + 1,
      endLine: end,
      content: file.lines.slice(start, end).join('\n'),
      symbolName: group.symbolName
    }
  })
}

function splitNode(node: Node, target: number, scope?: string): Section[] {
  const inner = node.type === 'decorated_definition' ? node.childForFieldName('definition') ?? node : node
  const isDefinition = inner.type === 'class_definition' || inner.type === 'function_definition'
  const name = isDefinition ? inner.childForFieldName('name')?.text : undefined
  const symbolName = scope && name ? `${scope}.${name}` : name ?? scope
  const { start, end } = lineRange(node)
  const whole = { start, end, symbolName, definition: isDefinition }
  if (end - start <= target) return [whole]

  const children = inner.namedChildren.flatMap(child => {
    if (child.type === 'block') return child.namedChildren.filter(item => item.type !== 'comment')
    return clauses.has(child.type) ? [child] : []
  })
  const first = children[0]
  if (isDefinition && first && isDocstring(first)) children.shift()

  let cursor = start
  const sections: Section[] = []
  for (const child of children) {
    const childRange = lineRange(child)
    if (childRange.start < cursor || childRange.start === start) continue

    if (cursor < childRange.start) sections.push({ start: cursor, end: childRange.start, symbolName })
    sections.push(...splitNode(child, target, symbolName))
    cursor = childRange.end
  }

  if (!sections.length) return [whole]
  if (cursor < end) sections.push({ start: cursor, end, symbolName })
  return sections
}

function lineRange(node: Node) {
  const start = node.startPosition.row
  const { row, column } = node.endPosition
  return { start, end: Math.max(start + 1, row + (column > 0 ? 1 : 0)) }
}

function isDocstring(node: Node) {
  if (node.type !== 'expression_statement') return false
  const value = node.firstNamedChild?.type
  return value === 'string' || value === 'concatenated_string'
}
