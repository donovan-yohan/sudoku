import { describe, expect, it } from 'vitest'
import { findDeduction } from './engine'
import { CATALOG, getPracticePuzzle } from './puzzles'
import type { Board, Deduction, Technique } from './types'
import type { PracticalLesson, PracticalScenario } from './practical-lessons'
// @ts-expect-error standalone .mjs test oracle has no declaration file
import { enumerate } from '../scripts/independent-oracle.mjs'

const modules = import.meta.glob('./practical-lessons.ts', { eager: true })
const practical = modules['./practical-lessons.ts'] as { PRACTICAL_LESSONS?: PracticalLesson[] } | undefined
const lessons = practical?.PRACTICAL_LESSONS ?? []
const TECHNIQUES: Technique[] = ['naked-single', 'hidden-single', 'locked-candidates', 'naked-pair', 'naked-triple', 'x-wing', 'swordfish', 'xy-wing']
const CELLS = Array.from({ length: 81 }, (_, cell) => cell)
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const rows = Array.from({ length: 9 }, (_, row) => CELLS.filter(cell => Math.floor(cell / 9) === row))
const columns = Array.from({ length: 9 }, (_, col) => CELLS.filter(cell => cell % 9 === col))
const box = (cell: number) => Math.floor(cell / 27) * 3 + Math.floor(cell % 9 / 3)
const boxes = Array.from({ length: 9 }, (_, index) => CELLS.filter(cell => box(cell) === index))
const units = [...rows, ...columns, ...boxes]
const sees = (a: number, b: number) => a !== b && units.some(unit => unit.includes(a) && unit.includes(b))
const legal = (board: Board) => CELLS.map(cell => board[cell] ? [] : DIGITS.filter(digit => !CELLS.some(other => sees(cell, other) && board[other] === digit)))
const same = (a: number[], b: number[]) => a.length === b.length && a.every(cell => b.includes(cell))

function apply(board: Board, notes: number[][], step: Deduction) {
  for (const { cell, digit } of step.placements) board[cell] = digit
  for (const { cell, digit } of step.eliminations) notes[cell] = notes[cell].filter(value => value !== digit)
  const allowed = legal(board)
  return notes.map((list, cell) => list.filter(digit => allowed[cell].includes(digit)))
}

/** Independent mathematical pattern checks, not a call to the detector. */
function assertPattern(step: Deduction, notes: number[][]) {
  const { cells, digit, technique, eliminations, placements } = step
  expect(new Set(cells).size).toBe(cells.length)
  for (const action of [...placements, ...eliminations]) expect(notes[action.cell]).toContain(action.digit)
  if (technique === 'naked-single') {
    expect(placements).toHaveLength(1)
    expect(notes[placements[0].cell]).toEqual([placements[0].digit])
  } else if (technique === 'hidden-single') {
    expect(placements).toHaveLength(1)
    expect(units.some(unit => same(unit.filter(cell => notes[cell].includes(digit)), [placements[0].cell]))).toBe(true)
  } else if (technique === 'naked-pair' || technique === 'naked-triple') {
    const size = technique === 'naked-pair' ? 2 : 3
    const digits = [...new Set(cells.flatMap(cell => notes[cell]))]
    expect(cells).toHaveLength(size)
    expect(digits).toHaveLength(size)
    expect(cells.every(cell => notes[cell].length >= 2 && notes[cell].length <= size)).toBe(true)
    expect(units.some(unit => cells.every(cell => unit.includes(cell)) && eliminations.every(action => unit.includes(action.cell) && !cells.includes(action.cell) && digits.includes(action.digit)))).toBe(true)
  } else if (technique === 'locked-candidates') {
    expect(units.some((source, sourceIndex) => same(source.filter(cell => notes[cell].includes(digit)), cells) && units.some((target, targetIndex) => (sourceIndex >= 18) !== (targetIndex >= 18) && cells.every(cell => target.includes(cell)) && eliminations.every(action => action.digit === digit && target.includes(action.cell) && !source.includes(action.cell))))).toBe(true)
  } else if (technique === 'x-wing' || technique === 'swordfish') {
    const size = technique === 'x-wing' ? 2 : 3
    expect([false, true].some(transpose => {
      const baseOf = (cell: number) => transpose ? cell % 9 : Math.floor(cell / 9)
      const coverOf = (cell: number) => transpose ? Math.floor(cell / 9) : cell % 9
      const bases = [...new Set(cells.map(baseOf))], covers = [...new Set(cells.map(coverOf))]
      return bases.length === size && covers.length === size && bases.every(base => {
        const locations = CELLS.filter(cell => baseOf(cell) === base && notes[cell].includes(digit))
        return locations.length >= 2 && locations.length <= size && same(locations, cells.filter(cell => baseOf(cell) === base))
      }) && eliminations.every(action => action.digit === digit && covers.includes(coverOf(action.cell)) && !bases.includes(baseOf(action.cell)))
    })).toBe(true)
  } else {
    expect(technique).toBe('xy-wing')
    expect(cells).toHaveLength(3)
    const [pivot, a, b] = cells, [x, y] = notes[pivot]
    const z = notes[a].find(value => value !== x)
    expect(notes[pivot]).toHaveLength(2)
    expect(notes[a]).toHaveLength(2)
    expect(notes[b]).toHaveLength(2)
    expect(z).not.toBe(y)
    expect(notes[a]).toContain(x)
    expect(notes[b]).toContain(y)
    expect(notes[b]).toContain(z)
    expect(sees(pivot, a) && sees(pivot, b)).toBe(true)
    expect(eliminations.every(action => action.digit === z && sees(a, action.cell) && sees(b, action.cell))).toBe(true)
  }
  if (!placements.length) expect(eliminations.length).toBeGreaterThan(0)
}

function assertSound(step: Deduction, solution: Board, board: Board, notes: number[][], alternateSwordfishPremise = false) {
  const detected = findDeduction(board, notes)
  expect(detected).toEqual(expect.objectContaining({
    technique: step.technique, digit: step.digit, placements: step.placements, eliminations: step.eliminations,
  }))
  if (alternateSwordfishPremise) {
    // Only the second walkthrough may choose this independently valid column
    // premise. Keep strict detector order for every prior deduction and action.
    expect(step.technique).toBe('swordfish')
    expect(step.cells).toEqual([19, 28, 21, 39, 34, 43])
    expect(detected!.cells).toEqual([0, 5, 45, 49, 50, 76, 77])
    assertPattern(detected!, notes)
  } else {
    expect(detected!.cells).toEqual(step.cells)
  }
  assertPattern(step, notes)
  for (const { cell, digit } of step.placements) expect(solution[cell]).toBe(digit)
  for (const { cell, digit } of step.eliminations) expect(solution[cell]).not.toBe(digit)
}

function assertReplay(scenario: PracticalScenario) {
  const { provenance } = scenario
  const oracle = enumerate(provenance.originalPuzzle)
  expect(oracle.count, scenario.id).toBe(1)
  const solution: Board = oracle.first
  const board = provenance.originalPuzzle.slice()
  let notes = legal(board)
  for (const prior of provenance.priorSteps) {
    assertSound(prior, solution, board, notes)
    notes = apply(board, notes, prior)
  }
  expect(board).toEqual(scenario.board)
  expect(notes).toEqual(scenario.candidates)
  expect(enumerate(board, notes).count).toBe(1)
  for (const [index, step] of scenario.steps.entries()) {
    expect(step.board).toEqual(board)
    expect(step.candidates).toEqual(notes)
    const alternatePremise = scenario.id === 'swordfish-2' && index === 0
    if (alternatePremise) expect(provenance.puzzleId).toBe('practical-search-v1:16379108:2495:transpose:digit-shift-1')
    assertSound(step, solution, board, notes, alternatePremise)
    notes = apply(board, notes, step)
  }
  expect(board[scenario.target]).toBe(scenario.digit)
  expect(solution[scenario.target]).toBe(scenario.digit)
}

describe('practical puzzle walkthroughs', () => {
  it('gives X-Wing four real positions and every other technique two, all ending in a placement', () => {
    expect(lessons.map(lesson => lesson.id)).toEqual(TECHNIQUES)
    for (const lesson of lessons) {
      expect(lesson.scenarios).toHaveLength(lesson.id === 'x-wing' ? 4 : 2)
      expect(lesson.generalTechnique).toBe(lesson.id)
      expect(lesson.summary.length).toBeGreaterThan(20)
      for (const scenario of lesson.scenarios) {
        expect(scenario.variant).toBe('classic')
        expect(scenario.kind).toBe('place')
        expect(scenario.board.filter(Boolean).length).toBeGreaterThanOrEqual(22)
        expect(scenario.provenance.originalPuzzle.filter(Boolean).length).toBeGreaterThanOrEqual(22)
        expect(scenario.steps[0].technique).toBe(lesson.id)
        expect(scenario.steps.at(-1)?.placements).toContainEqual({ cell: scenario.target, digit: scenario.digit })
        expect(scenario.prompt).not.toMatch(/eliminate|middle|bounded|premise|candidate study/i)
      }
    }
  })

  it('uses different original clue positions and elimination-created direct singles', () => {
    expect(lessons).toHaveLength(8)
    for (const lesson of lessons) {
      expect(new Set(lesson.scenarios.map(scenario => scenario.provenance.originalPuzzle.join(''))).size).toBe(lesson.scenarios.length)
      for (const scenario of lesson.scenarios) {
        if (lesson.id === 'naked-single' || lesson.id === 'hidden-single') continue
        expect(scenario.steps).toHaveLength(2)
        const finish = scenario.steps[1]
        expect(finish.technique).toBe('naked-single')
        expect(scenario.candidates[scenario.target].length).toBeGreaterThan(1)
        expect(scenario.steps[0].eliminations.some(action => action.cell === scenario.target)).toBe(true)
        expect(finish.candidates[scenario.target]).toEqual([scenario.digit])
      }
    }
  })

  for (const technique of TECHNIQUES) it(`replays ${technique} from original givens with independent uniqueness and pattern checks`, () => {
    const lesson = lessons.find(item => item.id === technique)
    expect(lesson).toBeDefined()
    expect(lesson?.scenarios).toHaveLength(technique === 'x-wing' ? 4 : 2)
    for (const scenario of lesson!.scenarios) assertReplay(scenario)
  })

  it('links catalog and practice sources to their actual unmodified givens', () => {
    for (const { provenance } of lessons.flatMap(lesson => lesson.scenarios)) {
      if (provenance.source === 'catalog') {
        const [, tier, index] = provenance.puzzleId.split(':')
        const bank = CATALOG[tier as keyof typeof CATALOG]
        expect(provenance.originalPuzzle.join('')).toBe(bank[Number(index)])
      } else if (provenance.source === 'practice') {
        const puzzle = getPracticePuzzle(provenance.tier!, provenance.seed!)
        expect(puzzle.id).toBe(provenance.puzzleId)
        expect(puzzle.givens).toEqual(provenance.originalPuzzle)
      }
    }
  })

  it('retains verifiable original-source provenance for transformed examples', () => {
    const transformed = lessons.flatMap(lesson => lesson.scenarios).filter(scenario => scenario.provenance.transformation)
    expect(transformed.length).toBeGreaterThan(0)
    for (const { provenance } of transformed) {
      const { transpose, digitShift } = provenance.transformation!
      const source = provenance.sourcePuzzle!
      expect(enumerate(source).count).toBe(1)
      expect(provenance.originalPuzzle).toEqual(CELLS.map(cell => {
        const value = source[transpose ? cell % 9 * 9 + Math.floor(cell / 9) : cell]
        return value ? (value - 1 + digitShift) % 9 + 1 : 0
      }))
    }
  })
})
