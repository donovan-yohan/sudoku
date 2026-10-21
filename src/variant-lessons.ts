import type { Scenario } from './types'

export type VariantLessonId = 'diagonal-single' | 'diagonal-hidden-single' | 'cage-remainder' | 'cage-combinations'
export type LessonVariant = 'x' | 'killer'
export interface LessonCage { cells: number[]; sum: number }
export interface VariantScenario extends Scenario {
  variant: LessonVariant
  /** Sparse presentation only; candidates retains every peer-legal domain. */
  visibleNotes: Record<number, number[]>
  cages?: LessonCage[]
}
export interface VariantLesson {
  id: VariantLessonId
  variant: LessonVariant
  title: string
  tier: 'beginner' | 'intermediate'
  summary: string
  rule: string
  prerequisites: string[]
  steps: string[]
  scenarios: [VariantScenario, VariantScenario]
}

const CELLS = Array.from({ length: 81 }, (_, cell) => cell)
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const MAIN = Array.from({ length: 9 }, (_, index) => index * 10)
const ANTI = Array.from({ length: 9 }, (_, index) => 8 + index * 8)
const box = (cell: number) => Math.floor(cell / 27) * 3 + Math.floor(cell % 9 / 3)
const boardFrom = (digits: string) => digits.split('').map(Number)
const coordinate = (cell: number) => `r${Math.floor(cell / 9) + 1}c${cell % 9 + 1}`

// Complete peer-legal domains. Killer diagrams stop before cage arithmetic:
// the candidate being eliminated must remain visible until the learner acts.
function candidatesFor(board: number[], variant: LessonVariant, cages: LessonCage[] = []): number[][] {
  return CELLS.map(cell => board[cell] ? [] : DIGITS.filter(digit => !CELLS.some(peer => {
    const sharesUnit = Math.floor(cell / 9) === Math.floor(peer / 9) || cell % 9 === peer % 9 || box(cell) === box(peer)
    const sharesVariant = variant === 'x'
      ? [MAIN, ANTI].some(diagonal => diagonal.includes(cell) && diagonal.includes(peer))
      : cages.some(cage => cage.cells.includes(cell) && cage.cells.includes(peer))
    return peer !== cell && (sharesUnit || sharesVariant) && board[peer] === digit
  })))
}

// Select all empty cells in the premise unit, never just the answer cell.
function visibleNotesFor(board: number[], candidates: number[][], evidence: number[]): Record<number, number[]> {
  return Object.fromEntries(evidence.filter(cell => !board[cell]).map(cell => [cell, [...candidates[cell]]]))
}

function xScenario(id: string, digits: string, diagonal: number[], target: number, digit: number, hidden: boolean): VariantScenario {
  const board = boardFrom(digits)
  const candidates = candidatesFor(board, 'x')
  const name = diagonal === MAIN ? 'top-left to bottom-right diagonal' : 'top-right to bottom-left diagonal'
  return {
    id, variant: 'x', board, candidates, visibleNotes: visibleNotesFor(board, candidates, diagonal), evidence: [...diagonal], target, digit, kind: 'place',
    caption: `X Sudoku · ${name}.`,
    prompt: hidden ? `Find the only place for ${digit} on the highlighted diagonal.` : `Which digit completes the highlighted diagonal at ${coordinate(target)}?`,
    proof: hidden
      ? `Only ${coordinate(target)} on the ${name} can contain ${digit}. Every other diagonal cell is filled or excludes ${digit} by its peers. The diagonal needs ${digit} once, so place it at ${coordinate(target)}.`
      : `The ${name} already contains ${DIGITS.filter(value => value !== digit).join(', ')}. It must contain every digit once, so the missing ${digit} goes at ${coordinate(target)}.`,
  }
}

// Frozen totals, not computed from a solution at runtime.
const TRIPLE_SUMS = [6, 15, 24, 15, 24, 6, 24, 6, 15, 17, 7, 21, 14, 16, 15, 14, 22, 9, 19, 8, 18, 11, 19, 15, 15, 18, 12]
const ROW_CAGES: LessonCage[] = TRIPLE_SUMS.map((sum, index) => ({ cells: [index * 3, index * 3 + 1, index * 3 + 2], sum }))
function cagePartition(replaced: number[], replacements: LessonCage[]): LessonCage[] {
  return [...replacements.map(cage => ({ cells: [...cage.cells], sum: cage.sum })),
    ...ROW_CAGES.filter((_, index) => !replaced.includes(index)).map(cage => ({ cells: [...cage.cells], sum: cage.sum }))]
}

function killerScenario(id: string, digits: string, cages: LessonCage[], target: number, digit: number, kind: 'place' | 'eliminate', proof: string): VariantScenario {
  const board = boardFrom(digits)
  const cage = cages[0]
  const candidates = candidatesFor(board, 'killer', cages)
  return {
    id, variant: 'killer', board, cages, candidates, visibleNotes: visibleNotesFor(board, candidates, cage.cells),
    evidence: [...cage.cells], target, digit, kind,
    caption: `Killer Sudoku · ${cage.sum}-sum cage. Peer candidates before cage sums.`,
    prompt: kind === 'place'
      ? `Subtract the filled cage digits from ${cage.sum}. Place the remainder at ${coordinate(target)}.`
      : `Find the two-digit combinations totaling ${cage.sum}. Remove ${digit} from ${coordinate(target)}.`,
    proof,
  }
}

export const X_LESSONS: VariantLesson[] = [
  {
    id: 'diagonal-single', variant: 'x', title: 'Diagonal single', tier: 'beginner',
    summary: 'Complete a diagonal with one empty cell.',
    rule: 'In X Sudoku, both long diagonals contain 1–9 exactly once, in addition to every row, column and box. Eight filled diagonal cells determine the ninth.',
    prerequisites: ['Rows, columns and boxes', 'The two X diagonals'],
    steps: ['Read the eight filled cells on one diagonal.', 'Find the missing digit from 1–9.', 'Place it in the empty diagonal cell.'],
    scenarios: [
      xScenario('diagonal-single-1', '100000000050000000000000000000200000000030000000007000000000600000000040000000008', MAIN, 20, 9, false),
      xScenario('diagonal-single-2', '000000009000000020000000400000001000000030000000600000000000000070000000500000000', ANTI, 56, 8, false),
    ],
  },
  {
    id: 'diagonal-hidden-single', variant: 'x', title: 'Diagonal hidden single', tier: 'intermediate',
    summary: 'Find a digit with one possible position on a diagonal.',
    rule: 'A missing digit must appear once on each long X diagonal. If only one diagonal cell allows that digit, place it there even when the cell has other candidates.',
    prerequisites: ['Diagonal single', 'Peer-based candidate lists'],
    steps: ['Choose a missing diagonal digit.', 'Check every empty cell on that diagonal.', 'Place the digit in its only possible location.'],
    scenarios: [
      xScenario('diagonal-hidden-single-1', '020050089450000020000100006000040060617008004040000030008004000000800000564070008', MAIN, 70, 4, true),
      xScenario('diagonal-hidden-single-2', '020000780000080100000000406900200060610508000800007500200304005301000042500900308', ANTI, 16, 2, true),
    ],
  },
]

export const KILLER_LESSONS: VariantLesson[] = [
  {
    id: 'cage-remainder', variant: 'killer', title: 'Cage remainder', tier: 'beginner',
    summary: 'Subtract known cage digits to find its last empty cell.',
    rule: 'Digits in a Killer cage are distinct and total the cage sum. When one cage cell is empty, subtract the filled digits from that sum to determine the remainder.',
    prerequisites: ['Killer cage sums and no repeated digits', 'Subtraction'],
    steps: ['Read the cage total.', 'Add its filled digits.', 'Subtract that subtotal and place the remainder.'],
    scenarios: [
      killerScenario('cage-remainder-1', '100400700406000100080000050000200060000508004040690501000004005001800000060000300',
        cagePartition([3], [{ cells: [9, 10, 11], sum: 15 }]), 10, 5, 'place',
        'The 15-sum cage contains 4 at r2c1 and 6 at r2c3. Its only empty cell is r2c2, so 15 − 4 − 6 = 5. Place 5 at r2c2.'),
      killerScenario('cage-remainder-2', '103006089050089003780000000005040800000008200000090500200300000001860002000000000',
        cagePartition([10, 11, 13], [
          { cells: [31, 40, 41], sum: 15 }, { cells: [30], sum: 2 },
          { cells: [32, 33, 34], sum: 15 }, { cells: [35], sum: 7 }, { cells: [39], sum: 5 },
        ]), 40, 3, 'place',
        'The bent 15-sum cage contains 4 at r4c5 and 8 at r5c6. Its last empty cell is r5c5. Since 15 − 4 − 8 = 3, place 3 at r5c5.'),
    ],
  },
  {
    id: 'cage-combinations', variant: 'killer', title: 'Cage combinations', tier: 'intermediate',
    summary: 'Use distinct-digit combinations to remove impossible cage candidates.',
    rule: 'A Killer cage must reach its sum with distinct digits from 1–9. Enumerate the combinations, then remove any peer-legal candidate that occurs in none of them.',
    prerequisites: ['Killer cage sums and no repeated digits', 'Peer-based candidate lists'],
    steps: ['Count the cage cells and read the total.', 'List every distinct-digit combination with that total.', 'Remove a candidate absent from every combination.'],
    scenarios: [
      killerScenario('cage-combinations-1', '003050000050780000009000050900040060007000090000690030000000005000005940560900000',
        cagePartition([0, 1, 2], [
          { cells: [0, 1], sum: 3 }, { cells: [2, 3, 4], sum: 12 },
          { cells: [5, 6, 7], sum: 21 }, { cells: [8], sum: 9 },
        ]), 0, 4, 'eliminate',
        'The two cells r1c1 and r1c2 total 3 with distinct positive digits. Their only combination is {1, 2}. The peer domain at r1c1 is {1, 2, 4, 6, 7, 8}; 4 would require −1 in its partner, so eliminate 4.'),
      killerScenario('cage-combinations-2', '000050000006700000000003056005200060607530000040007001200010070000000042004000000',
        cagePartition([2], [{ cells: [7, 8], sum: 17 }, { cells: [6], sum: 7 }]), 8, 7, 'eliminate',
        'The two cells r1c8 and r1c9 total 17 without repeats. Their only combination is {8, 9}. The peer domain at r1c9 is {3, 4, 7, 8, 9}; 7 would require 10 in its partner, so eliminate 7.'),
    ],
  },
]

export const VARIANT_LESSONS: VariantLesson[] = [...X_LESSONS, ...KILLER_LESSONS]
