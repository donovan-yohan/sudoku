import type { Board, Deduction, Difficulty, Technique } from './types'

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
export const UNITS: number[][] = [
  ...Array.from({ length: 9 }, (_, row) => DIGITS.map((_, col) => row * 9 + col)),
  ...Array.from({ length: 9 }, (_, col) => DIGITS.map((_, row) => row * 9 + col)),
  ...Array.from({ length: 9 }, (_, box) => DIGITS.map((_, i) => Math.floor(box / 3) * 27 + box % 3 * 3 + Math.floor(i / 3) * 9 + i % 3)),
]
const PEERS = Array.from({ length: 81 }, (_, cell) => [...new Set(UNITS.filter(unit => unit.includes(cell)).flat())].filter(other => other !== cell).sort((a, b) => a - b))
export function peers(cell: number): number[] { return PEERS[cell]?.slice() ?? [] }
export function isValidBoard(board: unknown): board is Board {
  return Array.isArray(board) && board.length === 81 && Array.from(board).every(value => Number.isInteger(value) && value >= 0 && value <= 9) && UNITS.every(unit => {
    const values = unit.map(cell => board[cell]).filter(Boolean)
    return new Set(values).size === values.length
  })
}
export function candidates(board: Board): number[][] {
  if (!isValidBoard(board)) return Array.from({ length: 81 }, () => [])
  return board.map((value, cell) => value ? [] : DIGITS.filter(digit => !PEERS[cell].some(peer => board[peer] === digit)))
}

// MRV backtracking is used for uniqueness/solutions, never as a disguised hint.
function search(board: Board, limit: number): { count: number; first: Board | null } {
  if (!isValidBoard(board) || !Number.isInteger(limit) || limit < 1) return { count: 0, first: null }
  const values = board.slice()
  const rows = Array(9).fill(0), cols = Array(9).fill(0), boxes = Array(9).fill(0)
  const boxOf = (cell: number) => Math.floor(cell / 27) * 3 + Math.floor(cell % 9 / 3)
  values.forEach((digit, cell) => { if (digit) { const bit = 1 << digit; rows[Math.floor(cell / 9)] |= bit; cols[cell % 9] |= bit; boxes[boxOf(cell)] |= bit } })
  let count = 0
  let first: Board | null = null
  function visit(): void {
    if (count >= limit) return
    let target = -1, available: number[] = []
    for (let cell = 0; cell < 81; cell++) {
      if (values[cell]) continue
      const used = rows[Math.floor(cell / 9)] | cols[cell % 9] | boxes[boxOf(cell)]
      const options = DIGITS.filter(digit => !(used & 1 << digit))
      if (!options.length) return
      if (target === -1 || options.length < available.length) { target = cell; available = options; if (options.length === 1) break }
    }
    if (target === -1) { count++; first ??= values.slice(); return }
    const row = Math.floor(target / 9), col = target % 9, box = boxOf(target)
    for (const digit of available) {
      const bit = 1 << digit
      values[target] = digit; rows[row] |= bit; cols[col] |= bit; boxes[box] |= bit
      visit()
      values[target] = 0; rows[row] &= ~bit; cols[col] &= ~bit; boxes[box] &= ~bit
      if (count >= limit) return
    }
  }
  visit()
  return { count, first }
}
export function solve(board: Board): Board | null { return search(board, 1).first }
export function countSolutions(board: Board, limit = 2): number { return search(board, limit).count }

/** Rubric v1: strongest technique used by this deterministic logical solve.
 * Unsolved boards are never accepted into the catalog, regardless of this label.
 */
export function ratePuzzle(board: Board): { difficulty: Difficulty; techniques: Technique[]; solved: boolean } {
  const techniques: Technique[] = []
  const levels: Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert']
  const tier: Record<Technique, number> = { 'naked-single': 0, 'hidden-single': 0, 'locked-candidates': 1, 'naked-pair': 1, 'naked-triple': 2, 'x-wing': 2, swordfish: 3, 'xy-wing': 3 }
  if (!isValidBoard(board)) return { difficulty: 'beginner', techniques, solved: false }
  const values = board.slice()
  let notes = candidates(values), hardest = 0
  // At most 729 candidate removals plus 81 placements; every deduction changes state.
  for (let step = 0; step < 810 && values.includes(0); step++) {
    const hint = findDeduction(values, notes)
    if (!hint) break
    if (!techniques.includes(hint.technique)) techniques.push(hint.technique)
    hardest = Math.max(hardest, tier[hint.technique])
    for (const { cell, digit } of hint.placements) values[cell] = digit
    for (const { cell, digit } of hint.eliminations) notes[cell] = notes[cell].filter(value => value !== digit)
    // Intersect, do not regenerate: logically proven eliminations must persist.
    const legal = candidates(values)
    notes = notes.map((list, cell) => list.filter(digit => legal[cell].includes(digit)))
  }
  return { difficulty: levels[hardest], techniques, solved: !values.includes(0) && isValidBoard(values) }
}

const coord = (cell: number) => `r${Math.floor(cell / 9) + 1}c${cell % 9 + 1}`
const unitName = (index: number) => index < 9 ? `row ${index + 1}` : index < 18 ? `column ${index - 8}` : `box ${index - 17}`
function placement(technique: Technique, cell: number, digit: number, explanation: string): Deduction {
  return { technique, cells: [cell], digit, placements: [{ cell, digit }], eliminations: [], explanation }
}

export function findDeduction(board: Board, candidatesOverride?: number[][]): Deduction | null {
  if (!isValidBoard(board)) return null
  const legal = candidates(board)
  if (candidatesOverride && (candidatesOverride.length !== 81 || Array.from(candidatesOverride).some(list => !Array.isArray(list) || Array.from(list).some(digit => !Number.isInteger(digit) || digit < 1 || digit > 9)))) return null
  const notes = candidatesOverride ? legal.map((list, cell) => list.filter(digit => candidatesOverride[cell].includes(digit))) : legal
  if (board.some((digit, cell) => !digit && !notes[cell].length)) return null
  for (let cell = 0; cell < 81; cell++) if (notes[cell].length === 1) return placement('naked-single', cell, notes[cell][0], `Only ${notes[cell][0]} remains at ${coord(cell)} after excluding its row, column, box and proven eliminations.`)
  for (let u = 0; u < 27; u++) for (const digit of DIGITS) {
    const places = UNITS[u].filter(cell => notes[cell].includes(digit))
    if (places.length === 1) return placement('hidden-single', places[0], digit, `In ${unitName(u)}, only ${coord(places[0])} can contain ${digit}.`)
  }
  return locked(notes) ?? nakedSubset(notes, 2) ?? nakedSubset(notes, 3) ?? fish(notes, 2) ?? fish(notes, 3) ?? xyWing(notes)
}

function combinations<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  function add(start: number, chosen: T[]): void {
    if (chosen.length === size) { result.push(chosen); return }
    for (let i = start; i <= items.length - (size - chosen.length); i++) add(i + 1, [...chosen, items[i]])
  }
  add(0, [])
  return result
}
function elimination(technique: Technique, cells: number[], removals: {cell: number; digit: number}[], explanation: string): Deduction | null {
  return removals.length ? { technique, cells, digit: removals[0].digit, placements: [], eliminations: removals, explanation } : null
}
function locked(notes: number[][]): Deduction | null {
  for (let source = 0; source < 27; source++) for (const digit of DIGITS) {
    const evidence = UNITS[source].filter(cell => notes[cell].includes(digit))
    if (evidence.length < 2 || evidence.length > 3) continue
    for (let target = 0; target < 27; target++) {
      // Only row/column ↔ box intersections, not arbitrary overlapping units.
      if ((source >= 18) === (target >= 18) || !evidence.every(cell => UNITS[target].includes(cell))) continue
      const removals = UNITS[target].filter(cell => !UNITS[source].includes(cell) && notes[cell].includes(digit)).map(cell => ({ cell, digit }))
      const hint = elimination('locked-candidates', evidence, removals, `In ${unitName(source)}, ${digit} is confined to ${evidence.map(coord).join(', ')} in ${unitName(target)}; remove ${digit} elsewhere in ${unitName(target)}.`)
      if (hint) return hint
    }
  }
  return null
}
function nakedSubset(notes: number[][], size: 2 | 3): Deduction | null {
  for (let u = 0; u < 27; u++) {
    const possible = UNITS[u].filter(cell => notes[cell].length >= 2 && notes[cell].length <= size)
    for (const evidence of combinations(possible, size)) {
      const digits = [...new Set(evidence.flatMap(cell => notes[cell]))].sort()
      if (digits.length !== size) continue
      const removals = UNITS[u].filter(cell => !evidence.includes(cell)).flatMap(cell => digits.filter(digit => notes[cell].includes(digit)).map(digit => ({ cell, digit })))
      const hint = elimination(size === 2 ? 'naked-pair' : 'naked-triple', evidence, removals, `${evidence.map(coord).join(', ')} in ${unitName(u)} contain only ${digits.join(', ')}. These ${size} digits occupy those ${size} cells, so remove them from the other cells of ${unitName(u)}.`)
      if (hint) return hint
    }
  }
  return null
}
function fish(notes: number[][], size: 2 | 3): Deduction | null {
  for (const transposed of [false, true]) for (const digit of DIGITS) {
    const at = (base: number, cover: number) => transposed ? cover * 9 + base : base * 9 + cover
    const locations = DIGITS.map((_, base) => DIGITS.map((_, cover) => cover).filter(cover => notes[at(base, cover)].includes(digit)))
    const possible = DIGITS.map((_, base) => base).filter(base => locations[base].length >= 2 && locations[base].length <= size)
    for (const bases of combinations(possible, size)) {
      const covers = [...new Set(bases.flatMap(base => locations[base]))].sort()
      if (covers.length !== size) continue
      const evidence = bases.flatMap(base => locations[base].map(cover => at(base, cover)))
      const removals = covers.flatMap(cover => DIGITS.map((_, base) => base).filter(base => !bases.includes(base) && notes[at(base, cover)].includes(digit)).map(base => ({ cell: at(base, cover), digit })))
      const kind = transposed ? 'columns' : 'rows', other = transposed ? 'rows' : 'columns'
      const hint = elimination(size === 2 ? 'x-wing' : 'swordfish', evidence, removals, `For ${digit}, ${kind} ${bases.map(base => base + 1).join(', ')} are confined to ${other} ${covers.map(cover => cover + 1).join(', ')} (${evidence.map(coord).join(', ')}). Each must use a different cover, so remove ${digit} from other cells in those ${other}.`)
      if (hint) return hint
    }
  }
  return null
}
function xyWing(notes: number[][]): Deduction | null {
  for (let pivot = 0; pivot < 81; pivot++) {
    if (notes[pivot].length !== 2) continue
    const [x, y] = notes[pivot]
    const wings = PEERS[pivot].filter(cell => notes[cell].length === 2)
    for (const a of wings) {
      if (!notes[a].includes(x) || notes[a].includes(y)) continue
      const z = notes[a].find(digit => digit !== x)!
      for (const b of wings) {
        if (a === b || !notes[b].includes(y) || !notes[b].includes(z)) continue
        const removals = PEERS[a].filter(cell => cell !== pivot && cell !== b && PEERS[b].includes(cell) && notes[cell].includes(z)).map(cell => ({ cell, digit: z }))
        const hint = elimination('xy-wing', [pivot, a, b], removals, `${coord(pivot)} is ${x}/${y}; its wings ${coord(a)} (${x}/${z}) and ${coord(b)} (${y}/${z}) see the pivot. Either pivot value forces ${z} in a wing, so remove ${z} from cells seeing both wings.`)
        if (hint) return hint
      }
    }
  }
  return null
}