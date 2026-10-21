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
  ['naked-triple', 'Naked triple', 'advanced', 'A unit is a row, column or box. If three cells in one unit have only three different candidates between them, those digits must fill those cells. Their candidate lists need not be identical. Remove those digits from the other cells in that unit.'],
  ['x-wing', 'X-Wing', 'advanced', 'Focus on one digit. If its only two positions in each of two rows form the corners of a rectangle, it must occupy one of the two diagonal pairs. Either way, remove that digit from the other cells of those two columns. The same reasoning works with rows and columns swapped.'],
  ['swordfish', 'Swordfish', 'expert', 'Focus on one digit. If its only positions in each of three rows lie in the same three columns, those rows need three placements of that digit. They must occupy different columns, because a digit cannot repeat in a column, so all three columns get their digit in those rows. Remove it elsewhere in those columns. Rows and columns can swap roles.'],
  ['xy-wing', 'XY-Wing', 'expert', 'The pivot is a cell with candidates {x, y}; the wings are two cells with {x, z} and {y, z}, where x, y and z are different digits. All three cells have exactly two candidates. Each wing must share a unit with the pivot; a unit is a row, column or box. Either pivot value forces z in one wing. Remove z from any other cell that shares a unit with each wing.'],
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
function explainXWing(step, placement) {
  const { digit, cells, candidates: notes } = step
  const rows = [...new Set(cells.map(cell => Math.floor(cell / 9)))].sort((a, b) => a - b)
  const columns = [...new Set(cells.map(cell => cell % 9))].sort((a, b) => a - b)
  const orientation = ['rows', 'columns'].find(direction => {
    const baseOf = cell => direction === 'rows' ? Math.floor(cell / 9) : cell % 9
    const crossingOf = cell => direction === 'rows' ? cell % 9 : Math.floor(cell / 9)
    const bases = direction === 'rows' ? rows : columns
    const crossings = direction === 'rows' ? columns : rows
    return bases.every(base => notes.flatMap((digits, cell) => baseOf(cell) === base && digits.includes(digit) ? [cell] : []).length === 2)
      && step.eliminations.every(action => !bases.includes(baseOf(action.cell)) && crossings.includes(crossingOf(action.cell)))
  })
  if (rows.length !== 2 || columns.length !== 2 || !orientation) throw new Error('Invalid X-Wing rectangle')
  const baseName = orientation === 'rows' ? 'row' : 'column'
  const crossingName = orientation === 'rows' ? 'column' : 'row'
  const bases = orientation === 'rows' ? rows : columns
  const crossings = orientation === 'rows' ? columns : rows
  const at = (base, crossing) => orientation === 'rows' ? base * 9 + crossing : crossing * 9 + base
  const [a, c] = crossings.map(crossing => at(bases[0], crossing))
  const [b, d] = crossings.map(crossing => at(bases[1], crossing))
  const before = notes[placement.cell]
  const remaining = before.filter(value => !step.eliminations.some(action => action.cell === placement.cell && action.digit === value))
  if (remaining.length !== 1 || remaining[0] !== placement.digit) throw new Error('X-Wing must directly create its target single')
  step.xWing = { digit, orientation, rows, columns }
  step.explanation = [
    `Focus on ${digit}. In ${baseName} ${bases[0] + 1}, the only two positions for ${digit} are ${coord(a)} and ${coord(c)}. In ${baseName} ${bases[1] + 1}, the only two positions for ${digit} are ${coord(b)} and ${coord(d)}. These four cells form a rectangle.`,
    `If ${coord(a)} is ${digit}, then ${coord(d)} must be ${digit}, because ${coord(a)} blocks ${digit} at ${coord(b)} in their shared ${crossingName} ${crossings[0] + 1}. That leaves ${coord(d)} as the only position for ${digit} in ${baseName} ${bases[1] + 1}. This uses one diagonal pair.`,
    `If ${coord(c)} is ${digit}, then ${coord(b)} must be ${digit}, because ${coord(c)} blocks ${digit} at ${coord(d)} in their shared ${crossingName} ${crossings[1] + 1}. That leaves ${coord(b)} as the only position for ${digit} in ${baseName} ${bases[1] + 1}. This uses the other diagonal pair.`,
    `Either way, each of ${crossingName}s ${crossings[0] + 1} and ${crossings[1] + 1} gets its ${digit} in the rectangle. Remove ${digit} from ${step.eliminations.map(action => coord(action.cell)).join(', ')}: these cells are elsewhere in those ${crossingName}s.`,
    `${coord(placement.cell)} changes from {${before.join(', ')}} to {${remaining.join(', ')}}. Only ${placement.digit} remains, so place ${placement.digit} in ${coord(placement.cell)}.`,
  ].join('\n\n')
}
const domain = digits => `{${digits.join(', ')}}`
const unitName = index => `${index < 9 ? 'row' : index < 18 ? 'column' : 'box'} ${index % 9 + 1}`
function placementExplanation(step, placement) {
  const before = step.candidates[placement.cell]
  const removed = step.eliminations.filter(action => action.cell === placement.cell).map(action => action.digit)
  const after = before.filter(digit => !removed.includes(digit))
  if (after.length !== 1 || after[0] !== placement.digit) throw new Error(`${step.technique} must directly create its target single`)
  return `${coord(placement.cell)} changes from ${domain(before)} to ${domain(after)}. Only ${placement.digit} remains, so place ${placement.digit} in ${coord(placement.cell)}.`
}
function eliminationExplanation(step) {
  return [...new Set(step.eliminations.map(action => action.cell))].map(cell => {
    const removed = step.eliminations.filter(action => action.cell === cell).map(action => action.digit)
    const before = step.candidates[cell], after = before.filter(digit => !removed.includes(digit))
    return `Remove ${removed.join(' and ')} from ${coord(cell)}: ${domain(before)} becomes ${domain(after)}.`
  }).join(' ')
}
function finishExplanation(steps, placement, reason) {
  const [step, finish] = steps
  finish.explanation = `${reason}\n\n${placementExplanation(step, placement)}`
}
function explainTriple(steps, placement) {
  const [step] = steps, notes = step.candidates
  const digits = [...new Set(step.cells.flatMap(cell => notes[cell]))].sort((a, b) => a - b)
  const index = UNITS.findIndex(unit => step.cells.every(cell => unit.includes(cell)) && step.eliminations.every(action => unit.includes(action.cell) && !step.cells.includes(action.cell) && digits.includes(action.digit)))
  if (step.cells.length !== 3 || digits.length !== 3 || index < 0 || step.cells.some(cell => notes[cell].length < 2 || notes[cell].length > 3)) throw new Error('Invalid naked triple')
  const unit = unitName(index)
  const reason = `The triple reserves ${digits.join(', ')} for ${step.cells.map(coord).join(', ')} in ${unit}; none of those digits can go in the other cells of ${unit}.`
  step.explanation = [
    `Look at ${unit}. ${step.cells.map(cell => `${coord(cell)} has ${domain(notes[cell])}`).join('; ')}. These candidate lists are not identical, but together they contain only ${digits.join(', ')}.`,
    `These three cells must contain three different digits, because a digit cannot repeat in ${unit}. They have only these three digits available, so ${digits.join(', ')} must fill these three cells in some order. No other cell in ${unit} can use any of them, even though we do not yet know their exact order.`,
    eliminationExplanation(step),
    placementExplanation(step, placement),
  ].join('\n\n')
  finishExplanation(steps, placement, reason)
}
// The transformed source also has a column-based Swordfish at the exact same
// replay state. Prefer that premise for orientation coverage, not as a prior
// deduction: the row-first detector and every recorded prefix remain unchanged.
function selectSwordfishPremise(step, provenance, example) {
  if (example !== 2 || provenance.puzzleId !== 'practical-search-v1:16379108:2495:transpose:digit-shift-1') return
  if (step.digit !== 7 || step.placements.length) throw new Error('Unexpected second Swordfish action')
  const selected = [19, 28, 21, 39, 34, 43], bases = [1, 3, 7], crossings = [2, 3, 4]
  const actual = bases.flatMap(column => Array.from({ length: 9 }, (_, row) => row * 9 + column).filter(cell => step.candidates[cell].includes(7)))
  if (JSON.stringify(actual) !== JSON.stringify(selected) || selected.some(cell => step.board[cell])) throw new Error('Column Swordfish premise does not match full domains')
  const expected = step.candidates.flatMap((digits, cell) => crossings.includes(Math.floor(cell / 9)) && !bases.includes(cell % 9) && digits.includes(7) ? [{ cell, digit: 7 }] : [])
  const actionKey = actions => JSON.stringify(actions.slice().sort((a, b) => a.cell - b.cell || a.digit - b.digit))
  if (actionKey(step.eliminations) !== actionKey(expected)) throw new Error('Alternate Swordfish must preserve exactly the detector actions')
  step.cells = selected
}
function explainSwordfish(steps, placement) {
  const [step] = steps, notes = step.candidates, digit = step.digit
  const orientation = ['rows', 'columns'].find(direction => {
    const baseOf = cell => direction === 'rows' ? Math.floor(cell / 9) : cell % 9
    const crossingOf = cell => direction === 'rows' ? cell % 9 : Math.floor(cell / 9)
    const bases = [...new Set(step.cells.map(baseOf))], crossings = [...new Set(step.cells.map(crossingOf))]
    return bases.length === 3 && crossings.length === 3 && bases.every(base => {
      const actual = notes.flatMap((digits, cell) => baseOf(cell) === base && digits.includes(digit) ? [cell] : [])
      return actual.length === 2 && actual.every(cell => step.cells.includes(cell))
    }) && step.eliminations.every(action => action.digit === digit && notes[action.cell].includes(digit) && !bases.includes(baseOf(action.cell)) && crossings.includes(crossingOf(action.cell)))
  })
  if (!orientation || new Set(step.cells).size !== 6) throw new Error('Expected a six-cell Swordfish with two positions per unit')
  const baseOf = cell => orientation === 'rows' ? Math.floor(cell / 9) : cell % 9
  const crossingOf = cell => orientation === 'rows' ? cell % 9 : Math.floor(cell / 9)
  const baseName = orientation === 'rows' ? 'row' : 'column', crossingName = orientation === 'rows' ? 'column' : 'row'
  const bases = [...new Set(step.cells.map(baseOf))].sort((a, b) => a - b)
  const crossings = [...new Set(step.cells.map(crossingOf))].sort((a, b) => a - b)
  const choices = bases.map(base => step.cells.filter(cell => baseOf(cell) === base))
  const cases = choices[0].flatMap(a => choices[1].flatMap(b => choices[2].filter(c => new Set([a, b, c].map(crossingOf)).size === 3).map(c => [a, b, c])))
  if (cases.length !== 2) throw new Error('Expected exactly two local Swordfish branches')
  const branches = choices[0].map(first => {
    const placed = [first], unused = choices.slice(1)
    const sentences = [`If ${coord(first)} is ${digit}`]
    while (unused.length) {
      const prior = placed.at(-1)
      const index = unused.findIndex(pair => pair.some(cell => crossingOf(cell) === crossingOf(prior)))
      if (index < 0) throw new Error('Swordfish branch is not a causal chain')
      const [pair] = unused.splice(index, 1), blocked = pair.find(cell => crossingOf(cell) === crossingOf(prior)), forced = pair.find(cell => cell !== blocked)
      sentences.push(`then ${coord(forced)} must be ${digit}, because ${coord(prior)} blocks ${digit} at ${coord(blocked)} in their shared ${crossingName} ${crossingOf(blocked) + 1}, leaving ${coord(forced)} as the only position for ${digit} in ${baseName} ${baseOf(forced) + 1}`)
      placed.push(forced)
    }
    if (new Set(placed.map(crossingOf)).size !== 3) throw new Error('Swordfish branch repeats a crossing unit')
    const [hypothesis, firstConsequence, secondConsequence] = sentences
    return `${hypothesis}, ${firstConsequence}. ${secondConsequence[0].toUpperCase()}${secondConsequence.slice(1)}.`
  })
  const reservation = `Each of ${crossingName}s ${crossings.map(value => value + 1).join(', ')} gets its ${digit} in these three ${baseName}s.`
  step.explanation = [
    `Focus on ${digit}. ${choices.map((pair, index) => `In ${baseName} ${bases[index] + 1}, the only two positions for ${digit} are ${pair.map(coord).join(' and ')} (${pair.map(cell => `${coord(cell)} has ${domain(notes[cell])}`).join('; ')}).`).join(' ')} These three ${baseName}s each need one ${digit}; the three placements must occupy different ${crossingName}s because a digit cannot repeat in a ${crossingName}.`,
    ...branches,
    `Either way, ${reservation[0].toLowerCase()}${reservation.slice(1)} Other cells in those ${crossingName}s cannot contain ${digit}. ${eliminationExplanation(step)}`,
    placementExplanation(step, placement),
  ].join('\n\n')
  finishExplanation(steps, placement, `The Swordfish reserves ${digit} in ${crossingName}s ${crossings.map(value => value + 1).join(', ')}. ${reservation} This removes ${digit} from ${coord(placement.cell)}.`)
}
function sharedUnit(a, b) {
  const index = UNITS.findIndex(unit => a !== b && unit.includes(a) && unit.includes(b))
  if (index < 0) throw new Error(`${coord(a)} and ${coord(b)} do not share a unit`)
  return unitName(index)
}
function explainXYWing(steps, placement) {
  const [step] = steps, notes = step.candidates
  const [pivot, a, b] = step.cells, [x, y] = notes[pivot], z = step.digit
  if (step.cells.length !== 3 || new Set(step.cells).size !== 3 || step.cells.some(cell => notes[cell].length !== 2) || new Set([x, y, z]).size !== 3 || !notes[a].includes(x) || !notes[a].includes(z) || !notes[b].includes(y) || !notes[b].includes(z)) throw new Error('Invalid XY-Wing pairs')
  const pivotUnits = [sharedUnit(pivot, a), sharedUnit(pivot, b)]
  const exclusions = step.eliminations.map(action => {
    if (action.digit !== z || step.cells.includes(action.cell) || !notes[action.cell].includes(z)) throw new Error('Invalid XY-Wing elimination')
    return `${coord(action.cell)} shares ${sharedUnit(action.cell, a)} with ${coord(a)} and ${sharedUnit(action.cell, b)} with ${coord(b)}.`
  }).join(' ')
  step.explanation = [
    `The pivot is ${coord(pivot)}, the cell that connects the two wings. ${coord(pivot)} has ${domain(notes[pivot])}. The wings are ${coord(a)} and ${coord(b)}: ${coord(a)} has ${domain(notes[a])} and shares ${pivotUnits[0]} with the pivot; ${coord(b)} has ${domain(notes[b])} and shares ${pivotUnits[1]} with the pivot. All three cells have exactly two candidates. Each wing shares a different pivot candidate, and both wings have ${z} as their other candidate.`,
    `If ${coord(pivot)} is ${x}, then ${coord(a)} cannot be ${x}, because both cells are in ${pivotUnits[0]}. Its only other candidate is ${z}, so ${coord(a)} must be ${z}.`,
    `If ${coord(pivot)} is ${y}, then ${coord(b)} cannot be ${y}, because both cells are in ${pivotUnits[1]}. Its only other candidate is ${z}, so ${coord(b)} must be ${z}.`,
    `Either way, at least one wing contains ${z}. ${exclusions} Each of those cells shares a unit with both possible locations of ${z}, so it cannot contain ${z} in either case. ${eliminationExplanation(step)}`,
    placementExplanation(step, placement),
  ].join('\n\n')
  finishExplanation(steps, placement, `The two possible values at ${coord(pivot)} force ${z} at either ${coord(a)} or ${coord(b)}. ${coord(placement.cell)} shares ${sharedUnit(placement.cell, a)} with ${coord(a)} and ${sharedUnit(placement.cell, b)} with ${coord(b)}, so it cannot be ${z}.`)
}
function inspect(originalPuzzle, provenance, { onlyTechnique, limit = 2 } = {}) {
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
    if (placement && (!onlyTechnique || deduction.technique === onlyTechnique) && !repeatedSource && found[deduction.technique].length < limit && board.filter(Boolean).length >= 22) {
      const steps = [{ ...clone(deduction), board: board.slice(), candidates: clone(notes) }]
      if (!deduction.placements.length) steps.push({ ...clone(next), board: nextBoard.slice(), candidates: clone(nextNotes) })
      if (deduction.technique === 'x-wing') {
        explainXWing(steps[0], placement)
        const { digit, orientation, rows, columns } = steps[0].xWing
        const crossingName = orientation === 'rows' ? 'column' : 'row'
        const crossings = (orientation === 'rows' ? columns : rows).map(value => value + 1).join(' and ')
        finishExplanation(steps, placement, `Either diagonal pair puts ${digit} inside the rectangle in each of ${crossingName}s ${crossings}. The X-Wing therefore removes ${digit} from ${coord(placement.cell)}.`)
      }
      if (deduction.technique === 'naked-triple') explainTriple(steps, placement)
      if (deduction.technique === 'xy-wing') explainXYWing(steps, placement)
      if (deduction.technique === 'swordfish') {
        selectSwordfishPremise(steps[0], provenance, found.swordfish.length + 1)
        explainSwordfish(steps, placement)
      }
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
        board: board.slice(), candidates: clone(notes), evidence: evidenceFor(steps[0], notes),
        steps, target: placement.cell, digit: placement.digit,
        prompt: `Use the ${phrase} to fill ${coord(placement.cell)}.`,
        proof: steps.map(step => step.explanation).join(' '),
        provenance: { ...provenance, originalPuzzle: originalPuzzle.slice(), priorSteps: clone(priorSteps) },
      })
      console.log(`found ${deduction.technique} ${found[deduction.technique].length}/${limit}: ${provenance.puzzleId} step ${i}, ${board.filter(Boolean).length} filled; ${steps.map(step => step.technique).join(' → ')}`)
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
// Preserve the original pair and every other technique's search result. Replay
// the transposed clues through the detector rather than transposing a late
// candidate state: greedy deduction order is not invariant under symmetry.
for (const scenario of found['x-wing'].slice(0, 2)) {
  const sourcePuzzle = scenario.provenance.originalPuzzle.slice()
  const transposed = Array.from({ length: 81 }, (_, cell) => sourcePuzzle[cell % 9 * 9 + Math.floor(cell / 9)])
  inspect(transposed, {
    source: 'generated-transform',
    puzzleId: `${scenario.provenance.puzzleId}:transpose:digit-shift-0`,
    sourcePuzzle, transformation: { transpose: true, digitShift: 0 },
  }, { onlyTechnique: 'x-wing', limit: 4 })
}
const lessons = metadata.map(([id, title, tier, rule]) => ({ id, generalTechnique: id, title, tier, rule, scenarios: found[id] }))
writeFileSync(output, `${JSON.stringify(lessons, null, 2)}\n`)
console.log(JSON.stringify({ stats, counts: Object.fromEntries(Object.entries(found).map(([id, list]) => [id, list.length])) }, null, 2))
if (!metadata.every(([id]) => found[id].length === (id === 'x-wing' ? 4 : 2))) process.exitCode = 1
