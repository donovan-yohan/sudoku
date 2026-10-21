import type { Lesson, LessonAction, Scenario } from './types'

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const CELLS = Array.from({ length: 81 }, (_, cell) => cell)
const ROWS = Array.from({ length: 9 }, (_, row) => CELLS.filter(cell => Math.floor(cell / 9) === row))
const COLS = Array.from({ length: 9 }, (_, col) => CELLS.filter(cell => cell % 9 === col))
const box = (cell: number) => Math.floor(cell / 27) * 3 + Math.floor(cell % 9 / 3)
const BOXES = Array.from({ length: 9 }, (_, index) => CELLS.filter(cell => box(cell) === index))
const UNITS = [...ROWS, ...COLS, ...BOXES]
const sees = (a: number, b: number) => a !== b && (Math.floor(a / 9) === Math.floor(b / 9) || a % 9 === b % 9 || box(a) === box(b))
const coordinate = (cell: number) => `row ${Math.floor(cell / 9) + 1}, column ${cell % 9 + 1}`
const isCell = (cell: number) => Number.isInteger(cell) && cell >= 0 && cell < 81
const isDigit = (digit: number) => Number.isInteger(digit) && digit >= 1 && digit <= 9
const caption = (context: string) => `Candidate study. ${context}`

function legalCandidates(board: number[]): number[][] {
  return CELLS.map(cell => board[cell] ? [] : DIGITS.filter(digit => !CELLS.some(peer => sees(cell, peer) && board[peer] === digit)))
}

function validState(scenario: Scenario): boolean {
  if (!scenario || !Array.isArray(scenario.board) || scenario.board.length !== 81 ||
      !scenario.board.every(digit => Number.isInteger(digit) && digit >= 0 && digit <= 9) ||
      !Array.isArray(scenario.candidates) || scenario.candidates.length !== 81 ||
      !Array.isArray(scenario.evidence) || !scenario.evidence.length ||
      !scenario.evidence.every(isCell) || new Set(scenario.evidence).size !== scenario.evidence.length ||
      !isCell(scenario.target) || !isDigit(scenario.digit) ||
      !['place', 'eliminate'].includes(scenario.kind)) return false
  const allowed = legalCandidates(scenario.board)
  if (UNITS.some(unit => {
    const filled = unit.map(cell => scenario.board[cell]).filter(Boolean)
    return new Set(filled).size !== filled.length
  })) return false
  if (!scenario.candidates.every((digits, cell) => Array.isArray(digits) &&
      new Set(digits).size === digits.length && digits.every(digit => isDigit(digit) && allowed[cell].includes(digit)) &&
      (scenario.board[cell] ? digits.length === 0 : digits.length > 0))) return false
  if (UNITS.some(unit => DIGITS.some(digit => !unit.some(cell => scenario.board[cell] === digit || scenario.candidates[cell].includes(digit))))) return false
  return scenario.board[scenario.target] === 0 && scenario.candidates[scenario.target].includes(scenario.digit)
}

const sameCells = (a: number[], b: number[]) => a.length === b.length && a.every(cell => b.includes(cell))

function blankDiagram(): { board: number[]; candidates: number[][] } {
  return { board: CELLS.map(() => 0), candidates: CELLS.map(() => [...DIGITS]) }
}

function hiddenSingleExamples(): [Scenario, Scenario] {
  // Original authoring search: engine.solve(empty), seeded structural/digit
  // permutations (16379102), then uniqueness-preserving clue removal. Freeze
  // the clues here; derive every candidate directly from their peer restrictions.
  const clues = [
    '400000020030000956590100700002730060704206100003010470005300090840000005000085010',
    '500072040007400965060800020608500370132047056700300010005080401310095682800000500',
  ]
  return [ROWS[3], BOXES[8]].map((unit, index) => {
    const board = [...clues[index]].map(Number)
    const candidates = legalCandidates(board)
    const target = index === 0 ? 32 : 80
    const digit = index === 0 ? 4 : 7
    const name = index === 0 ? 'row 4' : 'box 9 (bottom right)'
    return {
      board, candidates, id: `hidden-single-${index + 1}`, caption: `Find ${digit} in ${name}.`,
      evidence: [...unit], target, digit, kind: 'place',
      prompt: `Where must ${digit} go in ${name}? Select its cell and place it.`,
      proof: `In ${name}, only ${coordinate(target)} has ${digit} among its candidates {${candidates[target].join(', ')}}. Every other empty cell in this unit excludes ${digit}. The unit must contain ${digit} once, so place it there.`,
    } satisfies Scenario
  }) as [Scenario, Scenario]
}

function lockedExamples(): [Scenario, Scenario] {
  return [BOXES[0], COLS[4]].map((source, index) => {
    const state = blankDiagram()
    const locations = index === 0 ? [0, 2] : [31, 49]
    const target = index === 0 ? 7 : 39
    const digit = index === 0 ? 3 : 6
    for (const cell of source) if (!locations.includes(cell)) state.candidates[cell] = DIGITS.filter(value => value !== digit)
    const context = index === 0 ? 'Pointing: box 1 into row 1.' : 'Claiming: column 5 into box 5.'
    return {
      ...state, id: `locked-candidates-${index + 1}`, caption: caption(context), evidence: [...source], target, digit, kind: 'eliminate',
      prompt: `Which candidate is locked by the highlighted source unit? Select ${coordinate(target)} and eliminate that one candidate.`,
      proof: index === 0
        ? `In box 1, ${digit} occurs only at ${locations.map(coordinate).join(' and ')}. Both positions lie in row 1. Box 1 must place ${digit} in that row, so remove ${digit} from ${coordinate(target)}, outside the box in row 1.`
        : `In column 5, ${digit} occurs only at ${locations.map(coordinate).join(' and ')}. Both positions lie in the central box. Column 5 must place ${digit} there, so remove ${digit} from ${coordinate(target)}, inside that box but outside column 5.`,
    } satisfies Scenario
  }) as [Scenario, Scenario]
}

function pairExamples(): [Scenario, Scenario] {
  return [[0, 4], [30, 50]].map((evidence, index) => {
    const state = blankDiagram()
    const pair = index === 0 ? [2, 7] : [3, 8]
    for (const cell of evidence) state.candidates[cell] = [...pair]
    const target = index === 0 ? 8 : 40
    const unitName = index === 0 ? 'row 1' : 'box 5 (the central box)'
    return {
      ...state, id: `naked-pair-${index + 1}`, caption: caption(`A pair in ${unitName}.`),
      evidence, target, digit: pair[0], kind: 'eliminate',
      prompt: `Which two digits are reserved by the highlighted pair in ${unitName}? Select ${coordinate(target)} and eliminate the smaller reserved digit.`,
      proof: `${evidence.map(coordinate).join(' and ')} both have exactly {${pair.join(', ')}} in ${unitName}. Those two cells must use those two digits in some order. No other cell of that unit can use either digit, so eliminate ${pair[0]} from ${coordinate(target)}. The pair does not yet decide either placement.`,
    } satisfies Scenario
  }) as [Scenario, Scenario]
}

function tripleExamples(): [Scenario, Scenario] {
  return [[18, 22, 26], [5, 32, 59]].map((evidence, index) => {
    const state = blankDiagram()
    const domains = index === 0 ? [[1, 4], [4, 8], [1, 8]] : [[2, 5, 9], [2, 5], [5, 9]]
    evidence.forEach((cell, position) => { state.candidates[cell] = domains[position] })
    const target = index === 0 ? 24 : 77
    const digit = index === 0 ? 4 : 5
    const unitName = index === 0 ? 'row 3' : 'column 6'
    return {
      ...state, id: `naked-triple-${index + 1}`, caption: caption(`A three-digit union in ${unitName}.`),
      evidence, target, digit, kind: 'eliminate',
      prompt: `Combine the three highlighted candidate lists in ${unitName}. Select ${coordinate(target)} and eliminate the middle digit of their three-digit union.`,
      proof: `${evidence.map((cell, position) => `${coordinate(cell)} has {${domains[position].join(', ')}}`).join('; ')}. Together these three cells in ${unitName} contain exactly three different candidates. They must use those three digits in some order, so no other cell in the unit can use ${digit}. Remove it from ${coordinate(target)}. Each cell need not contain all three candidates.`,
    } satisfies Scenario
  }) as [Scenario, Scenario]
}

function xWingExamples(): [Scenario, Scenario] {
  return [false, true].map(transpose => {
    const state = blankDiagram()
    const bases = transpose ? [2, 6] : [0, 4]
    const covers = [1, 7]
    const digit = transpose ? 8 : 5
    const lines = transpose ? COLS : ROWS
    const evidence = bases.flatMap(base => lines[base])
    for (const cell of evidence) if (!covers.includes(transpose ? Math.floor(cell / 9) : cell % 9)) {
      state.candidates[cell] = DIGITS.filter(value => value !== digit)
    }
    const target = transpose ? 13 : 73
    const baseNames = transpose ? 'columns 3 and 7' : 'rows 1 and 5'
    const coverNames = transpose ? 'rows 2 and 8' : 'columns 2 and 8'
    return {
      ...state, id: `x-wing-${transpose ? 2 : 1}`, caption: caption(`Follow candidate ${digit} across ${baseNames}.`),
      evidence, target, digit, kind: 'eliminate',
      prompt: `Inspect every ${digit} in the highlighted ${baseNames}. Eliminate ${digit} from ${coordinate(target)} using the two-line pattern.`,
      proof: `In ${baseNames}, ${digit} appears only in ${coverNames}, exactly twice in each base line. Both base lines need ${digit}, and they cannot use the same crossing line. They therefore occupy both ${coverNames}. Remove ${digit} from ${coordinate(target)}, on a crossing line outside the two bases.`,
    } satisfies Scenario
  }) as [Scenario, Scenario]
}

function swordfishExamples(): [Scenario, Scenario] {
  return [false, true].map(transpose => {
    const state = blankDiagram()
    const bases = transpose ? [1, 4, 7] : [0, 3, 6]
    const allowed = transpose ? [[2, 5, 8], [2, 8], [5, 8]] : [[0, 3], [3, 6], [0, 6]]
    const digit = transpose ? 9 : 2
    const lines = transpose ? COLS : ROWS
    const evidence = bases.flatMap(base => lines[base])
    bases.forEach((base, position) => {
      for (const cell of lines[base]) if (!allowed[position].includes(transpose ? Math.floor(cell / 9) : cell % 9)) {
        state.candidates[cell] = DIGITS.filter(value => value !== digit)
      }
    })
    const target = transpose ? 21 : 15
    const baseNames = transpose ? 'columns 2, 5 and 8' : 'rows 1, 4 and 7'
    const coverNames = transpose ? 'rows 3, 6 and 9' : 'columns 1, 4 and 7'
    const census = bases.map((base, position) => `${transpose ? 'column' : 'row'} ${base + 1}: ${transpose ? 'rows' : 'columns'} ${allowed[position].map(value => value + 1).join(', ')}`).join('; ')
    return {
      ...state, id: `swordfish-${transpose ? 2 : 1}`, caption: caption(`A ${transpose ? 'seven' : 'six'}-location Swordfish for ${digit}.`),
      evidence, target, digit, kind: 'eliminate',
      prompt: `Inspect all locations for ${digit} in ${baseNames}. Use the three-line pattern to eliminate ${digit} from ${coordinate(target)}.`,
      proof: `The complete ${digit} census is ${census}. All occurrences in ${baseNames} lie in exactly ${coverNames}. Each base needs ${digit}; the three placements must use different crossing lines, so they occupy all three. Remove ${digit} from ${coordinate(target)}, in a crossing line outside the bases. Not every intersection needs a candidate.`,
    } satisfies Scenario
  }) as [Scenario, Scenario]
}

function fishSupports(scenario: Scenario, size: number): boolean {
  if (scenario.kind !== 'eliminate' || scenario.evidence.length !== size * 9) return false
  return [false, true].some(transpose => {
    const lines = transpose ? COLS : ROWS
    const bases = lines.filter(line => line.every(cell => scenario.evidence.includes(cell)))
    if (bases.length !== size || bases.some(line => line.includes(scenario.target))) return false
    const occurrences = bases.map(line => line.filter(cell => scenario.candidates[cell].includes(scenario.digit)))
    if (occurrences.some(locations => locations.length < 2 || locations.length > size)) return false
    const cross = (cell: number) => transpose ? Math.floor(cell / 9) : cell % 9
    const covers = new Set(occurrences.flat().map(cross))
    return covers.size === size && covers.has(cross(scenario.target))
  })
}

function xyWingExamples(): [Scenario, Scenario] {
  return [[0, 4, 36], [40, 30, 44]].map((evidence, index) => {
    const state = blankDiagram()
    const [x, y, z] = index === 0 ? [1, 2, 3] : [4, 7, 9]
    const [pivot, left, right] = evidence
    state.candidates[pivot] = [x, y]
    state.candidates[left] = [x, z]
    state.candidates[right] = [y, z]
    const target = index === 0 ? 40 : 35
    return {
      ...state, id: `xy-wing-${index + 1}`, caption: caption(`The first highlighted cell is the pivot: ${coordinate(pivot)}.`),
      evidence, target, digit: z, kind: 'eliminate',
      prompt: `Trace both possibilities for the pivot at ${coordinate(pivot)}. Eliminate the common wing candidate from ${coordinate(target)}.`,
      proof: `The pivot at ${coordinate(pivot)} is {${x}, ${y}}. It sees wings ${coordinate(left)} {${x}, ${z}} and ${coordinate(right)} {${y}, ${z}}. If the pivot is ${x}, the first wing must be ${z}; if it is ${y}, the second wing must be ${z}. The target at ${coordinate(target)} sees both wings, so either branch rules out ${z} there. The pivot need not see the target.`,
    } satisfies Scenario
  }) as [Scenario, Scenario]
}

function xyWingSupports(scenario: Scenario): boolean {
  if (scenario.kind !== 'eliminate' || scenario.evidence.length !== 3 || scenario.evidence.includes(scenario.target)) return false
  const [pivot, first, second] = scenario.evidence
  const p = scenario.candidates[pivot]
  const a = scenario.candidates[first]
  const b = scenario.candidates[second]
  if ([p, a, b].some(digits => digits.length !== 2) || p.includes(scenario.digit) ||
      !a.includes(scenario.digit) || !b.includes(scenario.digit)) return false
  const x = a.find(digit => digit !== scenario.digit)!
  const y = b.find(digit => digit !== scenario.digit)!
  return x !== y && p.includes(x) && p.includes(y) && sees(pivot, first) && sees(pivot, second) &&
    sees(scenario.target, first) && sees(scenario.target, second)
}

function supports(lesson: Lesson, scenario: Scenario): boolean {
  if (lesson.id === 'naked-single') return scenario.kind === 'place' && scenario.evidence.length === 1 &&
    scenario.evidence[0] === scenario.target && scenario.candidates[scenario.target].length === 1
  if (lesson.id === 'hidden-single') return scenario.kind === 'place' && UNITS.some(unit =>
    sameCells(unit, scenario.evidence) && unit.includes(scenario.target) &&
    unit.filter(cell => scenario.candidates[cell].includes(scenario.digit)).length === 1)
  if (lesson.id === 'locked-candidates') return scenario.kind === 'eliminate' && UNITS.some((source, sourceIndex) => {
    if (!sameCells(source, scenario.evidence) || source.includes(scenario.target)) return false
    const locations = source.filter(cell => scenario.candidates[cell].includes(scenario.digit))
    return locations.length >= 2 && UNITS.some((destination, destinationIndex) =>
      (sourceIndex >= 18) !== (destinationIndex >= 18) && destination.includes(scenario.target) &&
      locations.every(cell => destination.includes(cell)))
  })
  if (lesson.id === 'naked-pair' || lesson.id === 'naked-triple') {
    const size = lesson.id === 'naked-pair' ? 2 : 3
    const digits = new Set(scenario.evidence.flatMap(cell => scenario.candidates[cell]))
    return scenario.kind === 'eliminate' && scenario.evidence.length === size && digits.size === size &&
      scenario.evidence.every(cell => !scenario.board[cell] && scenario.candidates[cell].length > 0 &&
        (size !== 2 || scenario.candidates[cell].length === 2)) &&
      digits.has(scenario.digit) && !scenario.evidence.includes(scenario.target) &&
      UNITS.some(unit => unit.includes(scenario.target) && scenario.evidence.every(cell => unit.includes(cell)))
  }
  if (lesson.id === 'x-wing') return fishSupports(scenario, 2)
  if (lesson.id === 'swordfish') return fishSupports(scenario, 3)
  if (lesson.id === 'xy-wing') return xyWingSupports(scenario)
  return false
}

function nakedSingleExamples(): [Scenario, Scenario] {
  const solution = CELLS.map(cell => (Math.floor(cell / 9) * 3 + Math.floor(Math.floor(cell / 9) / 3) + cell % 9) % 9 + 1)
  return [[0, 1, 2, 3, 4, 5, 6, 7], [36, 37, 38, 39, 42, 43, 44, 67]].map((givens, index) => {
    const board = CELLS.map(cell => givens.includes(cell) ? solution[cell] : 0)
    const target = index === 0 ? 8 : 40
    return {
      id: `naked-single-${index + 1}`, caption: caption(index === 0 ? 'Read the first row.' : 'Combine restrictions from the row, column and box.'),
      board, candidates: legalCandidates(board), evidence: [target], target, digit: solution[target], kind: 'place',
      prompt: `Which number is forced in ${coordinate(target)}? Select that cell and place one number.`,
      proof: `In ${coordinate(target)}, the only candidate is ${solution[target]}. The placed digits in its row, column and box exclude every other digit. One remaining candidate forces this placement.`,
    } satisfies Scenario
  }) as [Scenario, Scenario]
}

export const LESSONS: Lesson[] = [{
  id: 'naked-single', title: 'Naked single', tier: 'beginner',
  summary: 'Find a cell with one remaining candidate.',
  rule: 'A candidate is a digit not yet ruled out. If an empty cell has exactly one candidate, that digit must go there.',
  prerequisites: ['Each row, column and 3 × 3 box contains 1–9 once.'],
  steps: ['Read the complete candidate list in the highlighted cell.', 'Check how its row, column and box exclude the other digits.', 'Place the sole remaining candidate.'],
  scenarios: nakedSingleExamples(),
}, {
  id: 'hidden-single', title: 'Hidden single', tier: 'beginner',
  summary: 'Find the only cell in a unit that can hold one digit.',
  rule: 'If an unplaced digit appears in exactly one complete candidate list within a row, column or box, that cell must contain it. The cell may have several candidates.',
  prerequisites: ['Naked single: one candidate in a cell.', 'A unit is a row, column or box; it must contain every digit.'],
  steps: ['Inspect every cell in the highlighted unit for the requested digit.', 'Confirm it has exactly one possible location.', 'Place the digit in that cell.'],
  scenarios: hiddenSingleExamples(),
}, {
  id: 'locked-candidates', title: 'Locked candidates', tier: 'intermediate',
  summary: 'Use a box–line intersection to rule out a candidate nearby.',
  rule: 'If every location for a digit in a box lies on one line, remove it from that line outside the box (pointing). If every location on a line lies in one box, remove it from that box outside the line (claiming).',
  prerequisites: ['Hidden singles and complete candidate lists.', 'Elimination removes a possibility; it does not place an answer.'],
  steps: ['Count every occurrence of the requested digit in the highlighted source unit.', 'Identify the box–line intersection containing all of them.', 'Remove that digit from the destination unit outside the source.'],
  scenarios: lockedExamples(),
}, {
  id: 'naked-pair', title: 'Naked pair', tier: 'intermediate',
  summary: 'Reserve two digits for two cells in one unit.',
  rule: 'Two empty cells in one unit with the same two candidates reserve those digits. Remove either digit from every other cell in that unit, but do not decide their order.',
  prerequisites: ['Complete candidates and elimination.', 'Two cells sharing a unit cannot contain the same digit.'],
  steps: ['Read both highlighted cells and check they contain only the same two digits.', 'Find their shared row, column or box.', 'Remove a reserved digit from the named cell outside the pair.'],
  scenarios: pairExamples(),
}, {
  id: 'naked-triple', title: 'Naked triple', tier: 'advanced',
  summary: 'Find three cells whose combined candidates contain exactly three digits.',
  rule: 'Three empty cells in one unit reserve a triple when their nonempty candidate lists have a union of exactly three digits. Remove those digits from other cells of the unit. The individual lists can have two or three candidates.',
  prerequisites: ['Naked pairs and elimination.', 'A union lists each different digit appearing across the selected cells.'],
  steps: ['Combine the complete candidate lists of the three highlighted cells.', 'Check there are exactly three distinct digits and one shared unit.', 'Remove a reserved digit from the named cell outside the triple.'],
  scenarios: tripleExamples(),
}, {
  id: 'x-wing', title: 'X-Wing', tier: 'advanced',
  summary: 'Reserve two crossing lines for one digit across two base lines.',
  rule: 'When a digit has exactly two locations in each of two rows, in the same two columns, those columns are reserved for the two rows. Remove the digit elsewhere in those columns. Swap rows and columns for the other orientation.',
  prerequisites: ['Hidden singles: every unit needs each digit.', 'Naked pairs: two requirements reserve two available places.', 'Inspect complete base lines, not just highlighted corners.'],
  steps: ['Count every location for the requested digit in both highlighted base lines.', 'Check both lines use exactly the same two crossing lines.', 'Remove the digit from the named crossing-line cell outside the bases.'],
  scenarios: xWingExamples(),
}, {
  id: 'swordfish', title: 'Swordfish', tier: 'expert',
  summary: 'Extend the fish principle to three base lines and three crossing lines.',
  rule: 'For one digit, if all locations in three rows lie in exactly three columns, the three rows reserve those columns. Remove the digit from those columns outside the base rows. Rows and columns can be interchanged; each base can have two or three occurrences.',
  prerequisites: ['X-Wing and a complete census of one digit.', 'Three required placements cannot share a crossing line.'],
  steps: ['Count every occurrence of the digit in all three highlighted base lines.', 'Combine their crossing lines and confirm there are exactly three.', 'Remove the digit from the named crossing-line cell outside all three bases.'],
  scenarios: swordfishExamples(),
}, {
  id: 'xy-wing', title: 'XY-Wing', tier: 'expert',
  summary: 'Follow both possibilities of a two-candidate pivot to a shared consequence.',
  rule: 'A pivot {x,y} sees wings {x,z} and {y,z}, with three distinct digits. Either pivot value forces z in one wing. Remove z from any other cell that sees both wings. Seeing only one wing is not enough; the target need not see the pivot.',
  prerequisites: ['A bivalue cell has exactly two complete candidates.', 'Two cells see one another when they share a row, column or box.', 'A proof by cases must cover every pivot possibility.'],
  steps: ['Read the pivot and both wing pairs in the highlighted cells.', 'Follow each pivot value and identify which wing must contain the shared digit.', 'Check that the named target sees both wings, then remove their shared digit.'],
  scenarios: xyWingExamples(),
}]

// Candidate diagrams are premises rather than playable puzzles. Check existence,
// not uniqueness. A strict node budget makes malformed input fail closed.
function hasCompletion(scenario: Scenario): boolean {
  const values = [...scenario.board]
  const rowMasks = Array<number>(9).fill(0)
  const colMasks = Array<number>(9).fill(0)
  const boxMasks = Array<number>(9).fill(0)
  for (const cell of CELLS) if (values[cell]) {
    const bit = 1 << values[cell]
    rowMasks[Math.floor(cell / 9)] |= bit
    colMasks[cell % 9] |= bit
    boxMasks[box(cell)] |= bit
  }
  let budget = 20000
  function visit(): boolean {
    if (--budget < 0) return false
    let selected = -1
    let options: number[] = []
    for (const cell of CELLS) if (!values[cell]) {
      const used = rowMasks[Math.floor(cell / 9)] | colMasks[cell % 9] | boxMasks[box(cell)]
      const available = scenario.candidates[cell].filter(digit => !(used & (1 << digit)))
      if (!available.length) return false
      if (selected === -1 || available.length < options.length) { selected = cell; options = available }
    }
    if (selected === -1) return true
    // A hidden single is also an efficient branch choice in sparse fish diagrams.
    for (const unit of UNITS) for (const digit of DIGITS) {
      if (unit.some(cell => values[cell] === digit)) continue
      const locations = unit.filter(cell => !values[cell] && scenario.candidates[cell].includes(digit) &&
        !((rowMasks[Math.floor(cell / 9)] | colMasks[cell % 9] | boxMasks[box(cell)]) & (1 << digit)))
      if (!locations.length) return false
      if (locations.length === 1) { selected = locations[0]; options = [digit] }
    }
    const row = Math.floor(selected / 9)
    const col = selected % 9
    const block = box(selected)
    for (const digit of options) {
      const bit = 1 << digit
      values[selected] = digit
      rowMasks[row] |= bit; colMasks[col] |= bit; boxMasks[block] |= bit
      if (visit()) return true
      values[selected] = 0
      rowMasks[row] &= ~bit; colMasks[col] &= ~bit; boxMasks[block] &= ~bit
    }
    return false
  }
  return visit()
}

export function validateScenario(lesson: Lesson, scenario: Scenario): boolean {
  return validState(scenario) && supports(lesson, scenario) && hasCompletion(scenario)
}

export function evaluateLesson(scenario: Scenario, action: LessonAction): { correct: boolean; message: string } {
  const lesson = LESSONS.find(entry => entry.scenarios.some(example => example.id === scenario.id))
  if (!lesson || !validateScenario(lesson, scenario)) return { correct: false, message: 'This diagram no longer supports its stated rule. Reset the example before trying a step.' }
  if (action?.cell === scenario.target && action.digit === scenario.digit && action.kind === scenario.kind) {
    return { correct: true, message: scenario.proof }
  }
  return { correct: false, message: `${lesson.steps[0]} The question asks for one ${scenario.kind === 'place' ? 'placement' : 'elimination'} in the named target cell.` }
}
