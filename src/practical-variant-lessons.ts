import { VARIANT_LESSONS } from './variant-lessons'
import type { LessonCage, LessonVariant, VariantLessonId } from './variant-lessons'

export interface PracticalVariantStep {
  technique: string
  cells: number[]
  digit: number
  placements: { cell: number; digit: number }[]
  eliminations: { cell: number; digit: number }[]
  explanation: string
}

export interface PracticalVariantScenario {
  id: string
  variant: LessonVariant
  board: number[]
  candidates: number[][]
  evidence: number[]
  steps: PracticalVariantStep[]
  target: number
  digit: number
  cages?: LessonCage[]
}

export interface PracticalVariantLesson {
  id: VariantLessonId
  title: string
  tier: 'beginner' | 'intermediate'
  rule: string
  summary: string
  scenarios: PracticalVariantScenario[]
}

const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const cells = Array.from({ length: 81 }, (_, cell) => cell)
const diagonals = [cells.filter(cell => cell % 10 === 0), cells.filter(cell => cell >= 8 && cell <= 72 && (cell - 8) % 8 === 0)]
const coordinate = (cell: number) => `r${Math.floor(cell / 9) + 1}c${cell % 9 + 1}`
const box = (cell: number) => Math.floor(cell / 27) * 3 + Math.floor(cell % 9 / 3)

// Original clue positions retained; extra witness-consistent givens make each
// complete X/Killer puzzle unique without replacing the named inference.
const clueBoards = [
  '100400780050080023000100000900240060000038200000007501008010670001060940060000008',
  '123000009006709123000020400000201000610538000000600000090004670070060000500002000',
  '020050089450000020000100006000040060617008004040000030098004000000800000564070008',
  '020050780000080100009000406900200060610508000800007500200304075301000042500900308',
  '100406700406000100080000050000200060000508004840690501000004075001800000060000300',
  '103006089050089003780000000905040800007008200000090500200300000001860002000000000',
  '003050000050780000009000050930040060007500090000690030200300005000005940560900000',
  '000050000006700000080003056005240060607530090040607001200010070300060042004000000',
]

/** Full peer-legal domains before the illustrated cage arithmetic. */
function peerCandidates(board: number[], variant: LessonVariant, cages: LessonCage[]): number[][] {
  return cells.map(cell => board[cell] ? [] : digits.filter(digit => !cells.some(peer => {
    const standard = Math.floor(cell / 9) === Math.floor(peer / 9) || cell % 9 === peer % 9 || box(cell) === box(peer)
    const extra = variant === 'x'
      ? diagonals.some(unit => unit.includes(cell) && unit.includes(peer))
      : cages.some(cage => cage.cells.includes(cell) && cage.cells.includes(peer))
    return peer !== cell && (standard || extra) && board[peer] === digit
  })))
}

/** Exhaustive ordered assignments, not just unordered sum combinations. */
function cageAssignments(cage: LessonCage, candidates: number[][]): number[][] {
  const assignments: number[][] = []
  function visit(assignment: number[], sum: number) {
    if (assignment.length === cage.cells.length) {
      if (sum === cage.sum) assignments.push([...assignment])
      return
    }
    for (const digit of candidates[cage.cells[assignment.length]]) {
      if (!assignment.includes(digit) && sum + digit <= cage.sum) visit([...assignment, digit], sum + digit)
    }
  }
  visit([], 0)
  return assignments
}

export const PRACTICAL_VARIANT_LESSONS: PracticalVariantLesson[] = VARIANT_LESSONS.map((lesson, lessonIndex) => ({
  id: lesson.id,
  title: lesson.title,
  tier: lesson.tier,
  rule: lesson.id === 'cage-combinations'
    ? 'List every distinct-digit cage assignment that reaches its sum and fits the cell candidates. Remove all unsupported candidates; then place a digit when only one candidate remains.'
    : lesson.rule,
  summary: lesson.id === 'cage-combinations' ? 'Use cage combinations to narrow candidates and place a digit.' : lesson.summary,
  scenarios: lesson.scenarios.map((source, scenarioIndex) => {
    const board = clueBoards[lessonIndex * 2 + scenarioIndex].split('').map(Number)
    const cages = source.cages?.map(cage => ({ cells: [...cage.cells], sum: cage.sum }))
    const candidates = peerCandidates(board, source.variant, cages ?? [])
    const evidence = [...source.evidence]
    const target = lesson.id === 'cage-combinations' ? evidence[0] : source.target
    const digit = lesson.id === 'cage-combinations' ? scenarioIndex === 0 ? 1 : 8 : source.digit
    let explanation: string
    const steps: PracticalVariantStep[] = []
    if (lesson.id === 'diagonal-single') {
      const present = evidence.filter(cell => board[cell]).map(cell => board[cell]).sort((a, b) => a - b)
      explanation = `The diagonal contains ${present.join(', ')}. Its missing digit is ${digit}, so ${coordinate(target)} = ${digit}.`
    } else if (lesson.id === 'diagonal-hidden-single') {
      const others = evidence.filter(cell => !board[cell] && cell !== target)
      explanation = `${digit} is missing from the diagonal. ${others.map(coordinate).join(', ')} cannot contain ${digit}; only ${coordinate(target)} allows it. Place ${digit} at ${coordinate(target)}.`
    } else if (lesson.id === 'cage-remainder') {
      const cage = cages![0]
      const filled = cage.cells.filter(cell => board[cell]).map(cell => board[cell])
      explanation = `${cage.sum} − ${filled.join(' − ')} = ${digit}. The cage's only empty cell is ${coordinate(target)}, so place ${digit} there.`
    } else {
      const cage = cages![0]
      const assignments = cageAssignments(cage, candidates)
      const supported = cage.cells.map((_, index) => new Set(assignments.map(assignment => assignment[index])))
      const eliminations = cage.cells.flatMap((cell, index) => candidates[cell]
        .filter(value => !supported[index].has(value)).map(value => ({ cell, digit: value })))
      const combination = [...new Set(assignments.map(assignment => [...assignment].sort((a, b) => a - b).join(', ')))]
      const assignmentText = assignments.map(assignment => assignment.map((value, index) => `${coordinate(cage.cells[index])} = ${value}`).join(', ')).join('; ')
      const removals = cage.cells.map(cell => `${coordinate(cell)}: ${eliminations.filter(item => item.cell === cell).map(item => item.digit).join(', ')}`).join('; ')
      steps.push({
        technique: 'cage-combinations', cells: [...evidence], digit,
        placements: [], eliminations,
        explanation: `The ${cage.sum}-sum cage uses {${combination.join('} or {')}}. The cell candidates allow only ${assignmentText}. Remove the unsupported candidates (${removals}).`,
      })
      explanation = `${coordinate(target)} now has only ${digit}. Place ${digit}.`
    }
    steps.push({
      technique: lesson.id === 'cage-combinations' ? 'naked-single' : lesson.id,
      cells: lesson.id === 'cage-combinations' ? [target] : [...evidence],
      digit, placements: [{ cell: target, digit }], eliminations: [], explanation,
    })
    return { id: source.id, variant: source.variant, board, candidates, evidence, steps, target, digit, ...(cages ? { cages } : {}) }
  }),
}))
