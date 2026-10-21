import type { Cage } from './variant-engine'

export interface CageOutline { cage: number; path: string; pattern: number }

export const CAGE_PATTERNS: readonly string[] = ['1 3', '3 3', '6 3', '9 3', '6 2 1 2', '9 2 1 2 1 2']

interface Point { x: number; y: number }
interface Edge { start: Point; end: Point; direction: number }

const CELL_SIZE = 100
const INSET = 6
const pointKey = ({ x, y }: Point) => `${x},${y}`

function contour(cells: readonly number[]): string {
  const occupied = new Set(cells)
  const edges: Edge[] = []
  for (const cell of [...occupied].sort((a, b) => a - b)) {
    const row = Math.floor(cell / 9), col = cell % 9
    const x = col * CELL_SIZE, y = row * CELL_SIZE
    // Clockwise in screen coordinates: the cage lies to the right.
    if (row === 0 || !occupied.has(cell - 9)) edges.push({ start: { x, y }, end: { x: x + CELL_SIZE, y }, direction: 0 })
    if (col === 8 || !occupied.has(cell + 1)) edges.push({ start: { x: x + CELL_SIZE, y }, end: { x: x + CELL_SIZE, y: y + CELL_SIZE }, direction: 1 })
    if (row === 8 || !occupied.has(cell + 9)) edges.push({ start: { x: x + CELL_SIZE, y: y + CELL_SIZE }, end: { x, y: y + CELL_SIZE }, direction: 2 })
    if (col === 0 || !occupied.has(cell - 1)) edges.push({ start: { x, y: y + CELL_SIZE }, end: { x, y }, direction: 3 })
  }
  edges.sort((a, b) => a.start.y - b.start.y || a.start.x - b.start.x || a.direction - b.direction)
  const outgoing = new Map<string, Edge[]>()
  for (const edge of edges) {
    const key = pointKey(edge.start)
    outgoing.set(key, [...(outgoing.get(key) ?? []), edge])
  }
  const visited = new Set<Edge>()
  const paths: string[] = []
  for (const first of edges) {
    if (visited.has(first)) continue
    const loop: Point[] = []
    let edge = first
    do {
      if (visited.has(edge)) throw new TypeError('Cage boundary is not closed')
      visited.add(edge)
      loop.push(edge.start)
      const choices = outgoing.get(pointKey(edge.end)) ?? []
      // A right turn preserves four-connected interiors at diagonal pinches.
      const turnRank = [1, 0, 3, 2]
      const next = [...choices].sort((a, b) => turnRank[(a.direction - edge.direction + 4) % 4] - turnRank[(b.direction - edge.direction + 4) % 4])[0]
      if (!next) throw new TypeError('Cage boundary is not closed')
      edge = next
    } while (edge !== first)

    // Merge straight cell-edge runs before offsetting, so neither corners nor
    // SVG dash phases restart at otherwise invisible cell joins.
    const corners = loop.filter((point, index) => {
      const previous = loop[(index + loop.length - 1) % loop.length]
      const next = loop[(index + 1) % loop.length]
      return (point.x - previous.x) * (next.y - point.y) !== (point.y - previous.y) * (next.x - point.x)
    })
    const inset = corners.map((point, index) => {
      const previous = corners[(index + corners.length - 1) % corners.length]
      const next = corners[(index + 1) % corners.length]
      // Intersect the adjacent axis-aligned lines shifted into the cage.
      return {
        x: point.x - INSET * (Math.sign(point.y - previous.y) + Math.sign(next.y - point.y)),
        y: point.y + INSET * (Math.sign(point.x - previous.x) + Math.sign(next.x - point.x)),
      }
    })
    paths.push(inset.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ') + ' Z')
  }
  return paths.join(' ')
}

function cagePatterns(cages: readonly Cage[]): number[] {
  const owner = new Map<number, number>()
  const neighbors = cages.map(() => new Set<number>())
  const coordinates = cages.map(cage => Math.min(...cage.cells))
  cages.forEach((cage, index) => cage.cells.forEach(cell => owner.set(cell, index)))
  for (const [cell, index] of owner) {
    // Do not wrap column eight into the next row, or count diagonal contacts.
    const adjacent = [cell < 72 ? owner.get(cell + 9) : undefined, cell % 9 < 8 ? owner.get(cell + 1) : undefined]
    for (const other of adjacent) if (other !== undefined && other !== index) {
      neighbors[index].add(other)
      neighbors[other].add(index)
    }
  }

  const remaining = new Set(cages.map((_, index) => index))
  const removed: number[] = []
  while (remaining.size) {
    let chosen = -1, minimum = Infinity
    for (const index of remaining) {
      const degree = [...neighbors[index]].filter(other => remaining.has(other)).length
      if (degree < minimum || (degree === minimum && coordinates[index] < coordinates[chosen])) {
        chosen = index
        minimum = degree
      }
    }
    removed.push(chosen)
    remaining.delete(chosen)
  }
  // Contracting four-connected cells gives a planar graph, whose every
  // subgraph has a vertex of degree <= 5. Reverse removal needs <= 6 styles.
  const patterns = cages.map(() => -1)
  for (const index of removed.reverse()) {
    const used = new Set([...neighbors[index]].map(other => patterns[other]))
    const pattern = CAGE_PATTERNS.findIndex((_, candidate) => !used.has(candidate))
    if (pattern === -1) throw new TypeError('Cage adjacency needs more than six patterns')
    patterns[index] = pattern
  }
  return patterns
}

export function cageOutlines(cages: readonly Cage[]): CageOutline[] {
  if (cages.some(cage => cage.cells.some(cell => !Number.isInteger(cell) || cell < 0 || cell >= 81))) {
    throw new TypeError('Cage cells must be board coordinates')
  }
  const patterns = cagePatterns(cages)
  return cages.map((cage, index) => ({ cage: index, path: contour(cage.cells), pattern: patterns[index] }))
}
