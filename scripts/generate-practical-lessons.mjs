#!/usr/bin/env node
/** Offline, deterministic extraction of real engine walkthroughs.
 * node scripts/generate-practical-lessons.mjs [--attempts 3000] [--output path]
 * Never invent candidate domains: every state starts at original givens and is
 * reached by findDeduction, preserving all earlier placements and eliminations.
 */
import { registerHooks } from 'node:module'
import { writeFileSync } from 'node:fs'

// Node strips TypeScript but its ESM resolver needs source extensions.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context) }
    catch (error) {
      if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context)
      throw error
    }
  },
})
const { CATALOG, getPracticePuzzle } = await import('../src/puzzles.ts')
const { candidates, countSolutions, findDeduction, UNITS } = await import('../src/engine.ts')
const { enumerate } = await import('./independent-oracle.mjs')
const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const output = option('--output', new URL('../src/practical-lesson-data.json', import.meta.url))
const attempts = Number(option('--attempts', '3000'))
const practiceAttempts = Number(option('--practice-attempts', '48'))
const seed = Number(option('--seed', '16379108')) >>> 0
let state = seed
const random = () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
const shuffle = list => { const result = list.slice(); for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] } return result }
const clone = value => JSON.parse(JSON.stringify(value))
const coord = cell => `r${Math.floor(cell / 9) + 1}c${cell % 9 + 1}`
const metadata = [
  ['naked-single', 'Naked single', 'beginner', 'A cell with one candidate must contain that digit.'],
  ['hidden-single', 'Hidden single', 'beginner', 'If a digit has only one possible cell in a row, column or box, place it there.'],
  ['locked-candidates', 'Locked candidates', 'intermediate', 'When a digit is confined to one line inside a box, remove it from the rest of that line; the same rule works from a line into a box.'],
  ['naked-pair', 'Naked pair', 'intermediate', 'Two cells with the same two candidates reserve those digits. Remove both digits from other cells in their shared unit.'],
  ['naked-triple', 'Naked triple', 'advanced', 'Three cells in one unit whose candidates together contain only three digits reserve those digits. Remove them from the other cells in that unit.'],
  ['x-wing', 'X-Wing', 'advanced', 'If a digit has the same two possible columns in two rows, remove it from those columns outside the rows. Rows and columns can swap roles.'],
  ['swordfish', 'Swordfish', 'expert', 'If a digit in three rows is confined to three columns, those columns are reserved. Remove the digit from the other cells in those columns. Rows and columns can swap roles.'],
  ['xy-wing', 'XY-Wing', 'expert', 'A two-candidate pivot sees two wings, each sharing one pivot digit and the same third digit. Remove that third digit from cells seeing both wings.'],
]
const found = Object.fromEntries(metadata.map(([id]) => [id, []]))
const stats = { catalog: 0, practice: 0, generated: 0, namedOccurrences: {} }
function apply(board, notes, deduction) {
  for (const { cell, digit } of deduction.placements) board[cell] = digit
  for (const { cell, digit } of deduction.eliminations) notes[cell] = notes[cell].filter(value => value !== digit)
  const legal = candidates(board)
  return notes.map((digits, cell) => digits.filter(digit => legal[cell].includes(digit)))
}
function evidenceFor(deduction, notes) {
  if (deduction.technique !== 'hidden-single') return deduction.cells.slice()
  const target = deduction.placements[0].cell
  return UNITS.find(unit => unit.includes(target) && unit.filter(cell => notes[cell].includes(deduction.digit)).length === 1).slice()
}
function inspect(originalPuzzle, provenance) {
  let board = originalPuzzle.slice(), notes = candidates(board)
  const priorSteps = []
  for (let i = 0; i < 810 && board.includes(0); i++) {
    const deduction = findDeduction(board, notes)
    if (!deduction) break
    stats.namedOccurrences[deduction.technique] = (stats.namedOccurrences[deduction.technique] ?? 0) + 1
    const nextBoard = board.slice(), nextNotes = apply(nextBoard, clone(notes), deduction)
    const next = findDeduction(nextBoard, nextNotes)
    const placement = deduction.placements[0] ?? (next?.technique === 'naked-single' ? next.placements[0] : undefined)
    const repeatedSource = found[deduction.technique].some(scenario => scenario.provenance.originalPuzzle.join('') === originalPuzzle.join(''))
    // Prefer a direct single created by the elimination, not an unrelated
    // advanced bridge. Two examples must come from different clue positions.
    if (placement && !repeatedSource && found[deduction.technique].length < 2 && board.filter(Boolean).length >= 22) {
      const steps = [{ ...clone(deduction), board: board.slice(), candidates: clone(notes) }]
      if (!deduction.placements.length) steps.push({ ...clone(next), board: nextBoard.slice(), candidates: clone(nextNotes) })
      const oracle = enumerate(originalPuzzle)
      if (oracle.count !== 1) throw new Error(`Nonunique source ${provenance.puzzleId}`)
      const solution = oracle.first
      for (const step of [...priorSteps, ...steps]) {
        if (step.placements.some(({ cell, digit }) => solution[cell] !== digit) || step.eliminations.some(({ cell, digit }) => solution[cell] === digit)) throw new Error(`Unsound ${step.technique} at ${provenance.puzzleId}`)
      }
      const title = metadata.find(([id]) => id === deduction.technique)[1]
      const phrase = { 'naked-single': 'single', 'hidden-single': 'only position', 'locked-candidates': 'locked candidates', 'naked-pair': 'pair', 'naked-triple': 'triple', 'x-wing': 'X-Wing', swordfish: 'Swordfish', 'xy-wing': 'XY-Wing' }[deduction.technique]
      found[deduction.technique].push({
        id: `${deduction.technique}-${found[deduction.technique].length + 1}`,
        variant: 'classic', kind: 'place', caption: `${title}: fill ${coord(placement.cell)}.`,
        board: board.slice(), candidates: clone(notes), evidence: evidenceFor(deduction, notes),
        steps, target: placement.cell, digit: placement.digit,
        prompt: `Use the ${phrase} to fill ${coord(placement.cell)}.`,
        proof: steps.map(step => step.explanation).join(' '),
        provenance: { ...provenance, originalPuzzle: originalPuzzle.slice(), priorSteps: clone(priorSteps) },
      })
      console.log(`found ${deduction.technique} ${found[deduction.technique].length}/2: ${provenance.puzzleId} step ${i}, ${board.filter(Boolean).length} filled; ${steps.map(step => step.technique).join(' → ')}`)
    }
    board = nextBoard; notes = nextNotes; priorSteps.push(clone(deduction))
  }
}
const complete = () => Object.values(found).every(list => list.length === 2)
for (const [tier, bank] of Object.entries(CATALOG)) for (const [index, text] of bank.entries()) {
  stats.catalog++
  inspect([...text].map(Number), { source: 'catalog', puzzleId: `catalog:${tier}:${index}` })
}
// Original uniqueness-preserving search found this source at attempt 2495.
// Freeze it so routine regeneration need not repeat thousands of MRV searches.
// Its transpose is a different board/orientation, not a fabricated note pattern.
const swordfishSource = [...'030000002100054000000000060400003000900000030000070450061008003000001500070205080'].map(Number)
inspect(swordfishSource, { source: 'generated', puzzleId: 'practical-search-v1:16379108:2495', seed: '16379108', attempt: 2495 })
const swordfishTransformed = Array.from({ length: 81 }, (_, cell) => {
  const digit = swordfishSource[(cell % 9) * 9 + Math.floor(cell / 9)]
  return digit ? digit % 9 + 1 : 0
})
inspect(swordfishTransformed, {
  source: 'generated-transform', puzzleId: 'practical-search-v1:16379108:2495:transpose:digit-shift-1',
  seed: '16379108', attempt: 2495, sourcePuzzle: swordfishSource,
  transformation: { transpose: true, digitShift: 1 },
})
for (let attempt = 0; attempt < practiceAttempts && !complete(); attempt++) for (const tier of ['intermediate', 'advanced', 'expert']) {
  const practiceSeed = `practical-${attempt}`, puzzle = getPracticePuzzle(tier, practiceSeed)
  stats.practice++
  inspect(puzzle.givens, { source: 'practice', puzzleId: puzzle.id, seed: practiceSeed, tier })
}
function fullGrid() {
  const board = Array(81).fill(0), digits = [1,2,3,4,5,6,7,8,9]
  const rows = Array(9).fill(0), cols = Array(9).fill(0), boxes = Array(9).fill(0)
  function visit() {
    let target = -1, available = []
    for (let cell = 0; cell < 81; cell++) {
      if (board[cell]) continue
      const used = rows[Math.floor(cell / 9)] | cols[cell % 9] | boxes[Math.floor(cell / 27) * 3 + Math.floor(cell % 9 / 3)]
      const options = digits.filter(digit => !(used & 1 << digit))
      if (!options.length) return false
      if (target < 0 || options.length < available.length) { target = cell; available = options; if (available.length === 1) break }
    }
    if (target < 0) return true
    const row = Math.floor(target / 9), col = target % 9, box = Math.floor(target / 27) * 3 + Math.floor(target % 9 / 3)
    for (const digit of shuffle(available)) {
      const bit = 1 << digit
      board[target] = digit; rows[row] |= bit; cols[col] |= bit; boxes[box] |= bit
      if (visit()) return true
      board[target] = 0; rows[row] &= ~bit; cols[col] &= ~bit; boxes[box] &= ~bit
    }
    return false
  }
  if (!visit()) throw new Error('Full-grid search failed')
  return board
}
for (let attempt = 0; attempt < attempts && !complete(); attempt++) {
  const board = fullGrid()
  for (const cell of shuffle(Array.from({ length: 81 }, (_, index) => index))) {
    const digit = board[cell]; board[cell] = 0
    if (countSolutions(board) !== 1) board[cell] = digit
  }
  stats.generated++
  inspect(board, { source: 'generated', puzzleId: `practical-search-v1:${seed}:${attempt}`, seed: String(seed), attempt })
  if (attempt % 100 === 99) console.log(`search ${attempt + 1}: ${JSON.stringify(Object.fromEntries(Object.entries(found).map(([id, list]) => [id, list.length])))}`)
}
const lessons = metadata.map(([id, title, tier, rule]) => ({ id, generalTechnique: id, title, tier, rule, scenarios: found[id] }))
writeFileSync(output, `${JSON.stringify(lessons, null, 2)}\n`)
console.log(JSON.stringify({ stats, counts: Object.fromEntries(Object.entries(found).map(([id, list]) => [id, list.length])) }, null, 2))
if (!complete()) process.exitCode = 1
