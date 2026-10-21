import { countVariantSolutions, rateVariant, solveVariant, variantCandidates, VariantBudgetError } from './variant-engine'
import type { Cage, GameVariant, Rules, VariantRating } from './variant-engine'
import type { Difficulty } from './types'
import { getPracticePuzzle } from './puzzles'
import certifiedSeeds from './variant-seeds.json' with { type: 'json' }

export const VARIANT_GENERATOR_VERSION = 'seeded-variants-v1'
export interface GeneratedVariant {
  givens: number[]
  solution: number[]
  cages?: Cage[]
  variant: GameVariant
  difficulty: Difficulty
  techniques: string[]
  rating: VariantRating
  generatorVersion: typeof VARIANT_GENERATOR_VERSION
  origin: { kind: 'generated' | 'certified-template'; seed: string; templateId?: string; fallbackReason?: string; transform?: number }
}
export class UnsupportedVariantDifficultyError extends Error {
  readonly code = 'unsupported-difficulty'
  constructor(variant: GameVariant, difficulty: Difficulty) {
    super(`${difficulty} is not supported for ${variant}`); this.name = 'UnsupportedVariantDifficultyError'
  }
}
export class VariantGenerationError extends Error {
  readonly code = 'generation-budget-exhausted'
  constructor(message = 'Variant generation operation budget exhausted') { super(message); this.name = 'VariantGenerationError' }
}
export function availableDifficulties(variant: GameVariant): Difficulty[] {
  if (!['classic', 'x', 'killer'].includes(variant)) throw new TypeError('Unknown Sudoku variant')
  return variant === 'classic' ? ['beginner', 'intermediate', 'advanced', 'expert'] : ['beginner', 'intermediate', 'advanced']
}
/** Pinned FNV-1a + Mulberry32, UTF-16 code units; not cryptographic. */
function randomFor(seed: string): () => number {
  let state = 2166136261
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619)
  return () => {
    state = (state + 0x6D2B79F5) | 0
    let t = state
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
const CELLS = Array.from({ length: 81 }, (_, c) => c)
function nakedCompletion(givens: number[], rules: Rules): boolean {
  const values = givens.slice()
  for (let step = 0; step < 81; step++) {
    if (!values.includes(0)) return true
    const notes = variantCandidates(values, rules), cell = notes.findIndex(n => n.length === 1)
    if (cell < 0) return false
    values[cell] = notes[cell][0]
  }
  return !values.includes(0)
}
function fullSolution(variant: GameVariant, random: () => number): number[] {
  const result = solveVariant(CELLS.map(() => 0), { variant: variant === 'x' ? 'x' : 'classic' }, { random, maxNodes: 10_000, maxWork: 2_000_000 })
  if (!result.first || result.exhausted) throw new VariantGenerationError('Full-grid randomized MRV budget exhausted')
  return result.first
}
function finish(seed: string, variant: GameVariant, difficulty: Difficulty, givens: number[], solution: number[], rules: Rules, origin: GeneratedVariant['origin'], suppliedRating?: VariantRating): GeneratedVariant | null {
  const rating = suppliedRating ?? rateVariant(givens, rules)
  if (!rating.solved || rating.difficulty !== difficulty) return null
  return { givens, solution, ...(rules.cages ? { cages: rules.cages.map(c => ({ sum: c.sum, cells: [...c.cells] })) } : {}), variant, difficulty, techniques: rating.techniques.slice(), rating, generatorVersion: VARIANT_GENERATOR_VERSION, origin: { ...origin, seed } }
}
function beginner(seed: string, variant: GameVariant, random: () => number): GeneratedVariant {
  const solution = fullSolution(variant, random), givens = solution.slice()
  let rules: Rules = { variant }
  if (variant === 'killer') {
    givens.fill(0)
    let cages: Cage[] = solution.map((sum, cell) => ({ sum, cells: [cell] }))
    for (const c of shuffled(CELLS, random)) {
      const a = cages.find(cage => cage.cells.includes(c))!
      if (a.cells.length !== 1 || cages.filter(cage => cage.cells.length === 1).length <= 25) continue
      const neighbors = [c % 9 ? c - 1 : -1, c % 9 < 8 ? c + 1 : -1, c >= 9 ? c - 9 : -1, c < 72 ? c + 9 : -1].filter(n => n >= 0)
      for (const next of shuffled(neighbors, random)) {
        const b = cages.find(cage => cage.cells.includes(next))!
        if (a === b || b.cells.length !== 1 || solution[c] === solution[next]) continue
        const candidate = cages.filter(cage => cage !== a && cage !== b).concat({ sum: a.sum + b.sum, cells: [c, next].sort((x, y) => x - y) }).sort((a, b) => a.cells[0] - b.cells[0])
        if (nakedCompletion(givens, { variant, cages: candidate })) { cages = candidate; break }
      }
    }
    rules = { variant, cages }
  } else {
    let clues = 81
    for (const cell of shuffled(CELLS, random)) {
      if (clues <= 45) break
      const digit = givens[cell]; givens[cell] = 0
      if (nakedCompletion(givens, rules)) clues--
      else givens[cell] = digit
    }
    if (clues !== 45) throw new VariantGenerationError('Approachable 45-clue construction exhausted')
  }
  const result = finish(seed, variant, 'beginner', givens, solution, rules, { kind: 'generated', seed })
  if (!result) throw new VariantGenerationError('Beginner proof did not meet the approachability policy')
  return result
}
/** One bounded original attempt for clue variants. Hard Killer templates are offline certified.
 * Fixed operation/attempt limits, never elapsed time, select the fallback. Run in a Worker.
 */
function originalAttempt(seed: string, variant: 'classic' | 'x', difficulty: Difficulty, random: () => number): GeneratedVariant | null {
  const solution = fullSolution(variant, random), givens = solution.slice(), rules = { variant }
  let remainingWork = 1_000_000, clues = 81
  for (const cell of shuffled(CELLS, random)) {
    if (remainingWork <= 0) break
    const digit = givens[cell]; givens[cell] = 0
    const proof = countVariantSolutions(givens, rules, { maxNodes: 300, maxWork: Math.min(50_000, remainingWork) })
    remainingWork -= proof.work
    if (!proof.unique) { givens[cell] = digit; continue }
    clues--
    if (clues > 36) continue
    const rating = rateVariant(givens, rules, { maxWork: 150_000 })
    // Rating is bounded independently; at most 45 rating calls per attempt.
    const result = finish(seed, variant, difficulty, givens.slice(), solution, rules, { kind: 'generated', seed }, rating)
    if (result) return result
  }
  return null
}
/** Only D4 spatial symmetries for X. Killer does not permute digits or recompute sums. */
function transformIndex(cell: number, symmetry: number): number {
  let row = Math.floor(cell / 9), col = cell % 9
  if (symmetry >= 4) col = 8 - col
  for (let i = 0; i < symmetry % 4; i++) [row, col] = [col, 8 - row]
  return row * 9 + col
}
function fallback(seed: string, variant: GameVariant, difficulty: Difficulty, random: () => number, reason: string): GeneratedVariant {
  if (variant === 'classic') {
    // Reuse the unchanged v1 public helper. Variant rubric is stricter about
    // hidden singles, so re-rate rather than carrying the old label blindly.
    for (let attempt = 0; attempt < 4; attempt++) {
      const source = getPracticePuzzle(difficulty, `${VARIANT_GENERATOR_VERSION}:${seed}:fallback:${attempt}`)
      const result = finish(seed, variant, difficulty, source.givens, source.solution, { variant }, {
        kind: 'certified-template', seed, templateId: `original-catalog-v1:helper:${source.id}`, fallbackReason: reason,
      })
      if (result) return result
    }
  }
  const bank = certifiedSeeds.filter(p => p.variant === variant && p.difficulty === difficulty)
  const ordered = shuffled(bank, random)
  for (const template of ordered) {
    // Last identity transform guarantees a proven exact-tier base is reachable.
    for (let attempt = 0; attempt <= 8; attempt++) {
      const symmetry = attempt === 8 ? 0 : Math.floor(random() * 8)
      const digits = attempt === 8 || variant === 'killer' ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [0, ...shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], random)]
      const transform = (board: number[]) => {
        const out = Array<number>(81).fill(0)
        board.forEach((d, c) => { out[transformIndex(c, symmetry)] = digits[d] })
        return out
      }
      const givens = transform(template.givens), solution = transform(template.solution)
      const cages = 'cages' in template ? template.cages?.map(c => ({ sum: c.sum, cells: c.cells.map(cell => transformIndex(cell, symmetry)).sort((a, b) => a - b) })).sort((a, b) => a.cells[0] - b.cells[0]) : undefined
      const rules = { variant, ...(cages ? { cages } : {}) }
      const result = finish(seed, variant, difficulty, givens, solution, rules, { kind: 'certified-template', seed, templateId: template.id, fallbackReason: reason, transform: symmetry })
      if (result) return result
    }
  }
  throw new VariantGenerationError('No independently certified template met the requested logical rating')
}
export function generateVariant(seed: string, variant: GameVariant, difficulty: Difficulty): GeneratedVariant {
  if (typeof seed !== 'string' || seed.length > 4096) throw new TypeError('Seed must be a string of at most 4096 UTF-16 code units')
  if (!['beginner', 'intermediate', 'advanced', 'expert'].includes(difficulty)) throw new TypeError('Unknown difficulty')
  if (!availableDifficulties(variant).includes(difficulty)) throw new UnsupportedVariantDifficultyError(variant, difficulty)
  const random = randomFor(`${VARIANT_GENERATOR_VERSION}:${variant}:${difficulty}:${seed}`)
  try {
    if (difficulty === 'beginner') return beginner(seed, variant, random)
    if (variant !== 'killer') {
      const result = originalAttempt(seed, variant, difficulty, random)
      if (result) return result
    }
  } catch (error) {
    if (!(error instanceof VariantBudgetError) && !(error instanceof VariantGenerationError)) throw error
    if (difficulty === 'beginner') throw new VariantGenerationError(error.message)
  }
  return fallback(seed, variant, difficulty, random, variant === 'killer' ? 'Hard Killer generation uses a finite independently certified template bank' : 'Original bounded attempt did not meet the exact requested tier')
}
