import { findDeduction, UNITS } from './engine'
import type { Difficulty } from './types'

export type GameVariant = 'classic' | 'x' | 'killer'
export interface Cage { readonly cells: readonly number[]; readonly sum: number }
export interface Rules { readonly variant: GameVariant; readonly cages?: readonly Cage[] }
export interface VariantDeduction {
  technique: string
  cells: number[]
  digit: number
  placements: { cell: number; digit: number }[]
  eliminations: { cell: number; digit: number }[]
  explanation: string
}
export interface SearchOptions {
  limit?: number
  maxNodes?: number
  maxWork?: number
  allowed?: number[][]
  /** Only full-grid generation supplies a pinned PRNG. Search never supplies hints. */
  random?: () => number
}
export interface VariantSearchResult {
  count: number
  first: number[] | null
  status: 'complete' | 'solution-cap' | 'budget-exhausted' | 'invalid'
  exhausted: boolean
  unique: boolean
  nodes: number
  work: number
}
export class VariantBudgetError extends Error {
  constructor() { super('Variant operation budget exhausted'); this.name = 'VariantBudgetError' }
}
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const ALL = 1022
const BITS = Array.from({ length: 1024 }, (_, mask) => DIGITS.filter(d => mask & 1 << d))
const LEVELS: Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert']
const TIER: Record<string, number> = {
  'naked-single': 0, 'hidden-single': 1, 'locked-candidates': 1, 'naked-pair': 1,
  'naked-triple': 2, 'x-wing': 2, swordfish: 3, 'xy-wing': 3, 'diagonal-single': 1,
  'cage-sum-single': 0, 'cage-pair-sum': 0, 'cage-combinations': 1, 'unit-sum-45': 2,
}
const cells = Array.from({ length: 81 }, (_, c) => c)
const adjacent = (c: number) => [c % 9 ? c - 1 : -1, c % 9 < 8 ? c + 1 : -1, c >= 9 ? c - 9 : -1, c < 72 ? c + 9 : -1].filter(n => n >= 0)

/** Invalid rule metadata is a caller error, never silently classic Sudoku. */
export function validateVariantRules(rules: Rules): void {
  if (!rules || !['classic', 'x', 'killer'].includes(rules.variant)) throw new TypeError('Unknown Sudoku variant')
  if (rules.variant !== 'killer') {
    if (rules.cages !== undefined) throw new TypeError('Cages require the Killer variant')
    return
  }
  if (!Array.isArray(rules.cages) || !rules.cages.length) throw new TypeError('Killer requires a complete cage partition')
  const covered = new Set<number>()
  for (const cage of rules.cages) {
    if (!cage || !Array.isArray(cage.cells) || cage.cells.length < 1 || cage.cells.length > 9) throw new TypeError('Cages must have 1–9 cells')
    const n = cage.cells.length
    if (!Number.isInteger(cage.sum) || cage.sum < n * (n + 1) / 2 || cage.sum > n * (19 - n) / 2) throw new TypeError('Impossible distinct-digit cage sum')
    for (const c of cage.cells) {
      if (!Number.isInteger(c) || c < 0 || c > 80 || covered.has(c)) throw new TypeError('Cage cells must be unique board indices')
      covered.add(c)
    }
    const reached = new Set([cage.cells[0]])
    for (const c of reached) for (const next of adjacent(c)) if (cage.cells.includes(next)) reached.add(next)
    if (reached.size !== n) throw new TypeError('Cage cells must be orthogonally connected')
  }
  if (covered.size !== 81) throw new TypeError('Killer cages must cover all 81 cells')
}
function topology(rules: Rules) {
  const units = rules.variant === 'x' ? [...UNITS, DIGITS.map((_, i) => i * 10), DIGITS.map((_, i) => 8 + i * 8)] : UNITS
  const peerUnits = [...units, ...(rules.cages ?? []).map(c => c.cells)]
  const peers = cells.map(c => [...new Set(peerUnits.filter(u => u.includes(c)).flat())].filter(n => n !== c).sort((a, b) => a - b))
  return { units, peers }
}
export function variantPeers(cell: number, rules: Rules): number[] {
  validateVariantRules(rules)
  if (!Number.isInteger(cell) || cell < 0 || cell > 80) throw new TypeError('Cell must be an integer from 0 to 80')
  return topology(rules).peers[cell]
}
function validValues(values: readonly number[]): boolean {
  return Array.isArray(values) && values.length === 81 && Array.from(values).every(d => Number.isInteger(d) && d >= 0 && d <= 9)
}
function allowedMasks(allowed?: number[][]): number[] {
  if (!allowed) return cells.map(() => ALL)
  if (allowed.length !== 81 || Array.from(allowed).some(a => !Array.isArray(a) || Array.from(a).some(d => !Number.isInteger(d) || d < 1 || d > 9))) throw new TypeError('Allowed candidates must contain 81 digit arrays')
  return allowed.map(a => a.reduce((m, d) => m | 1 << d, 0))
}
interface Work { used: number; max: number }
function tick(work: Work, amount = 1): void {
  work.used += amount
  if (work.used > work.max) throw new VariantBudgetError()
}
function integerBudget(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${name} must be a nonnegative safe integer`)
  return value
}
/** Exhaustively match distinct cage digits to cells; retain every feasible assignment. */
function cageSupport(values: readonly number[], cage: Cage, masks: number[], work: Work): Map<number, number> | null {
  let used = 0, sum = 0
  const blanks: number[] = []
  for (const c of cage.cells) {
    const d = values[c]
    if (!d) blanks.push(c)
    else { if (used & 1 << d) return null; used |= 1 << d; sum += d }
  }
  if (!blanks.length) return sum === cage.sum ? new Map() : null
  blanks.sort((a, b) => BITS[masks[a]].length - BITS[masks[b]].length || a - b)
  const supports = new Map(blanks.map(c => [c, 0])), assigned: number[] = []
  let ways = 0
  function match(i: number, remaining: number, occupied: number): void {
    tick(work)
    if (i === blanks.length) {
      if (remaining === 0) { ways++; blanks.forEach((c, k) => supports.set(c, supports.get(c)! | 1 << assigned[k])) }
      return
    }
    let min = 0, max = 0
    for (let k = i; k < blanks.length; k++) {
      const options = BITS[masks[blanks[k]] & ~occupied]
      if (!options.length) return
      min += options[0]; max += options[options.length - 1]
    }
    if (remaining < min || remaining > max) return
    for (const d of BITS[masks[blanks[i]] & ~occupied]) {
      assigned[i] = d; match(i + 1, remaining - d, occupied | 1 << d)
    }
  }
  match(0, cage.sum - sum, used)
  return ways ? supports : null
}
function domains(values: readonly number[], rules: Rules, top: ReturnType<typeof topology>, allowed: number[], work: Work, arithmetic = true): number[] | null {
  if (!validValues(values)) return null
  tick(work, 81)
  for (const unit of top.units) {
    let seen = 0
    for (const c of unit) if (values[c]) { if (seen & 1 << values[c]) return null; seen |= 1 << values[c] }
  }
  for (const cage of rules.cages ?? []) {
    let seen = 0
    for (const c of cage.cells) if (values[c]) { if (seen & 1 << values[c]) return null; seen |= 1 << values[c] }
  }
  const masks = values.map((d, c) => d ? 0 : allowed[c] & ~top.peers[c].reduce((m, n) => m | 1 << values[n], 0) & ALL)
  if (arithmetic) for (const cage of rules.cages ?? []) {
    const support = cageSupport(values, cage, masks, work)
    if (!support) return null
    for (const [c, mask] of support) masks[c] &= mask
  }
  if (values.some((d, c) => !d && !masks[c])) return null
  // Every unit still needs somewhere for every absent digit.
  for (const unit of top.units) if (unit.reduce((m, c) => m | (values[c] ? 1 << values[c] : masks[c]), 0) !== ALL) return null
  return masks
}
/** Allowed must contain only proven eliminations, never untrusted player notes. */
export function variantCandidates(values: readonly number[], rules: Rules, allowed?: number[][]): number[][] {
  validateVariantRules(rules)
  const masks = domains(values, rules, topology(rules), allowedMasks(allowed), { used: 0, max: 2_000_000 })
  return masks ? masks.map(m => BITS[m].slice()) : cells.map(() => [])
}
export function countVariantSolutions(values: readonly number[], rules: Rules, options: SearchOptions = {}): VariantSearchResult {
  validateVariantRules(rules)
  const maxNodes = integerBudget(options.maxNodes ?? 50_000, 'maxNodes')
  const work = { used: 0, max: integerBudget(options.maxWork ?? 5_000_000, 'maxWork') }
  const limit = options.limit ?? 2
  if (!Number.isSafeInteger(limit) || limit < 1) throw new TypeError('Solution cap must be a positive safe integer')
  const allowed = allowedMasks(options.allowed), top = topology(rules), board = Array.from(values)
  let count = 0, first: number[] | null = null, nodes = 0, exhausted = false
  function visit(): void {
    if (count >= limit) return
    if (nodes >= maxNodes) throw new VariantBudgetError()
    nodes++
    const masks = domains(board, rules, top, allowed, work)
    if (!masks) return
    let targets: number[] = [], size = 10
    for (const c of cells) if (!board[c]) {
      const n = BITS[masks[c]].length
      if (n < size) { targets = [c]; size = n } else if (n === size) targets.push(c)
    }
    if (!targets.length) { count++; first ??= board.slice(); return }
    let target = targets[options.random ? Math.floor(options.random() * targets.length) : 0]
    let digits = BITS[masks[target]].slice()
    // Unit hidden-single propagation is a search optimization, not a hint.
    if (!options.random) for (const unit of top.units) for (const digit of DIGITS) {
      if (unit.some(c => board[c] === digit)) continue
      const places = unit.filter(c => masks[c] & 1 << digit)
      if (places.length === 1) { target = places[0]; digits = [digit] }
    }
    if (options.random) for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(options.random() * (i + 1)); [digits[i], digits[j]] = [digits[j], digits[i]]
    }
    for (const digit of digits) {
      board[target] = digit
      visit()
      board[target] = 0
      if (count >= limit) return
    }
  }
  let invalid = !validValues(values)
  try {
    if (!invalid) {
      invalid = !domains(board, rules, top, allowed, work)
      if (!invalid) visit()
    }
  } catch (error) { if (!(error instanceof VariantBudgetError)) throw error; exhausted = true }
  const status = exhausted ? 'budget-exhausted' : invalid ? 'invalid' : count >= limit ? 'solution-cap' : 'complete'
  return { count, first, status, exhausted, unique: status === 'complete' && count === 1, nodes, work: work.used }
}
/** The same explicit search status accompanies a first solution; cap=1 is not uniqueness. */
export function solveVariant(values: readonly number[], rules: Rules, options: SearchOptions = {}): VariantSearchResult {
  return countVariantSolutions(values, rules, { ...options, limit: 1 })
}

const coord = (c: number) => `r${Math.floor(c / 9) + 1}c${c % 9 + 1}`
function placement(technique: string, cell: number, digit: number, explanation: string, evidence = [cell]): VariantDeduction {
  return { technique, cells: evidence.slice(), digit, placements: [{ cell, digit }], eliminations: [], explanation }
}
function deduction(values: number[], rules: Rules, allowed: number[], maxTier: number, work: Work): VariantDeduction | null {
  const top = topology(rules)
  // Validate arithmetic, but do not silently apply it: arithmetic is a separate proof.
  if (!domains(values, rules, top, allowed, work)) return null
  const masks = domains(values, rules, top, allowed, work, false)!
  const notes = masks.map(m => BITS[m].slice())
  const classic = findDeduction(values, notes)
  const cages = [...(rules.cages ?? [])].sort((a, b) => a.cells.filter(c => !values[c]).length - b.cells.filter(c => !values[c]).length || a.cells[0] - b.cells[0])
  // Rank across families, not just within classic techniques. Keep one validated,
  // exclusion-only domain state and one shared operation budget for every tier.
  for (let cap = 0; cap <= maxTier; cap++) {
    if (classic && TIER[classic.technique] <= cap) {
      if (classic.technique === 'naked-single') return { ...classic, explanation: `Only ${classic.digit} remains at ${coord(classic.placements[0].cell)} after row, column, box${rules.variant === 'x' ? ', diagonal' : rules.variant === 'killer' ? ', cage no-repeat' : ''} exclusions and prior proven eliminations.` }
      return classic
    }
    if (rules.variant === 'x' && cap >= 1) for (let u = 27; u < top.units.length; u++) for (const digit of DIGITS) {
      const unit = top.units[u]
      if (unit.some(c => values[c] === digit)) continue
      const places = unit.filter(c => masks[c] & 1 << digit)
      if (places.length === 1) return placement('diagonal-single', places[0], digit, `The ${u === 27 ? 'main' : 'anti'} diagonal must contain ${digit}. Every other empty cell on that diagonal excludes it, so ${coord(places[0])} is its only position.`, unit)
    }
    for (const cage of cages) {
      const blanks = cage.cells.filter(c => !values[c])
      if (!blanks.length) continue
      const technique = blanks.length === 1 ? 'cage-sum-single' : blanks.length === 2 ? 'cage-pair-sum' : 'cage-combinations'
      if (TIER[technique] !== cap) continue
      const remaining = cage.sum - cage.cells.reduce((sum, c) => sum + values[c], 0)
      if (blanks.length === 1) return placement(technique, blanks[0], remaining, `Cage ${cage.cells.map(coord).join(', ')} totals ${cage.sum}. Subtract its filled digits (${cage.sum - remaining}); the remaining cell ${coord(blanks[0])} must be ${remaining}.`, [...cage.cells])
      const support = cageSupport(values, cage, masks, work)!
      const eliminations = [...support].flatMap(([c, m]) => BITS[masks[c] & ~m].map(digit => ({ cell: c, digit })))
      if (eliminations.length) return { technique, cells: [...cage.cells], digit: eliminations[0].digit, placements: [], eliminations, explanation: `Cage ${cage.cells.map(coord).join(', ')} totals ${cage.sum}; its ${blanks.length} empty cells must total ${remaining} with no repeated digit. Enumerating every distinct assignment consistent with their current candidates leaves no support for ${eliminations.map(e => `${e.digit} at ${coord(e.cell)}`).join(', ')}.` }
    }
    if (rules.variant === 'killer' && cap >= 2) for (let u = 0; u < top.units.length; u++) {
      const unit = top.units[u], inside = cages.filter(cage => cage.cells.every(c => unit.includes(c)))
      const covered = new Set(inside.flatMap(c => [...c.cells])), rest = unit.filter(c => !covered.has(c)), blanks = rest.filter(c => !values[c])
      if (blanks.length !== 1) continue
      const cageTotal = inside.reduce((sum, c) => sum + c.sum, 0), filled = rest.reduce((sum, c) => sum + values[c], 0), digit = 45 - cageTotal - filled
      if (digit >= 1 && digit <= 9 && masks[blanks[0]] & 1 << digit) return placement('unit-sum-45', blanks[0], digit, `This ${u < 9 ? 'row' : u < 18 ? 'column' : 'box'} totals 45. Cages wholly inside total ${cageTotal}; other filled cells total ${filled}. The only uncovered empty cell ${coord(blanks[0])} is 45 − ${cageTotal} − ${filled} = ${digit}.`, unit)
    }
  }
  return null
}
/** Optional allowed domains are trusted proof state, not pencil marks. Never guesses. */
export function nextVariantDeduction(values: readonly number[], rules: Rules, allowed?: number[][], options: { maxTier?: number; maxWork?: number } = {}): VariantDeduction | null {
  validateVariantRules(rules)
  if (!validValues(values)) return null
  const cap = options.maxTier ?? 3
  if (!Number.isInteger(cap) || cap < 0 || cap > 3) throw new TypeError('Logical tier cap must be 0–3')
  return deduction(Array.from(values), rules, allowedMasks(allowed), cap, { used: 0, max: integerBudget(options.maxWork ?? 2_000_000, 'maxWork') })
}
export interface VariantRating {
  rubric: 'variant-logical-v1'
  solved: boolean
  difficulty: Difficulty | null
  logicalDifficulty: Difficulty | null
  trace: VariantDeduction[]
  techniques: string[]
  lowerTierStalled: boolean
  status: 'solved' | 'stalled' | 'invalid' | 'budget-exhausted'
  approachability: { accepted: boolean; givens: number; initialSingles: number; singletonCages: number; policy: string }
}
/** Lowest completing proof cap wins. Accessibility is separate from logical complexity. */
export function rateVariant(values: readonly number[], rules: Rules, options: { maxWork?: number } = {}): VariantRating {
  validateVariantRules(rules)
  const work = { used: 0, max: integerBudget(options.maxWork ?? 10_000_000, 'maxWork') }
  const givens = Array.from(values).filter(Boolean).length, singletonCages = (rules.cages ?? []).filter(c => c.cells.length === 1).length
  const approachability = { accepted: false, givens, initialSingles: 0, singletonCages, policy: 'Classic/X: 42–48 givens, ≥3 initial singles, naked-only completion. Killer: zero givens, cages ≤2 cells, ≥20 singleton footholds, only singles and pair arithmetic.' }
  let trace: VariantDeduction[] = [], solved = false, logicalDifficulty: Difficulty | null = null, status: VariantRating['status'] = 'stalled', lowerTierStalled = false
  try {
    const initial = domains(values, rules, topology(rules), cells.map(() => ALL), work)
    if (!initial) status = 'invalid'
    else {
      approachability.initialSingles = initial.filter(m => BITS[m].length === 1).length
      for (let cap = 0; cap < 4; cap++) {
        const board = Array.from(values), allowed = cells.map(() => ALL)
        trace = []
        for (let step = 0; step < 810 && board.includes(0); step++) {
          const hint = deduction(board, rules, allowed, cap, work)
          if (!hint) break
          trace.push(hint)
          for (const { cell, digit } of hint.placements) board[cell] = digit
          for (const { cell, digit } of hint.eliminations) allowed[cell] &= ~(1 << digit)
        }
        solved = !board.includes(0) && !!domains(board, rules, topology(rules), allowed, work)
        if (solved) { logicalDifficulty = LEVELS[cap]; lowerTierStalled = cap > 0; status = 'solved'; break }
      }
    }
  } catch (error) { if (!(error instanceof VariantBudgetError)) throw error; status = 'budget-exhausted' }
  approachability.accepted = solved && logicalDifficulty === 'beginner' && (rules.variant === 'killer'
    ? givens === 0 && singletonCages >= 20 && rules.cages!.every(c => c.cells.length <= 2)
    : givens >= 42 && givens <= 48 && approachability.initialSingles >= 3 && trace.every(s => s.technique === 'naked-single'))
  return { rubric: 'variant-logical-v1', solved, logicalDifficulty, difficulty: logicalDifficulty === 'beginner' && !approachability.accepted ? null : logicalDifficulty, trace, techniques: [...new Set(trace.map(s => s.technique))], lowerTierStalled, status, approachability }
}
