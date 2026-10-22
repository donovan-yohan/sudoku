import { describe, expect, it, vi } from 'vitest'
import * as detector from './engine'
import { CATALOG } from './puzzles'
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
// Frozen original v1 authoring output, retained without its runtime resolver.
const ORIGINAL_PRACTICE_SOURCES: Record<string, { clues: string; tier: string; seed: string }> = {
  'v1:practice:practical-1:intermediate:1:0': {
    clues: '060000802000104000950000000070000003000800560000091040210080030700030200006000000',
    tier: 'intermediate', seed: 'practical-1',
  },
  'v1:practice:practical-2:advanced:3:0': {
    clues: '000000100500000000017080400000040006608300000030017090000472000000000600900100530',
    tier: 'advanced', seed: 'practical-2',
  },
}
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
  expect(cells.length).toBeGreaterThan(0)
  expect(cells.every(cell => Number.isInteger(cell) && cell >= 0 && cell < 81)).toBe(true)
  expect(DIGITS).toContain(digit)
  for (const actions of [placements, eliminations]) {
    expect(new Set(actions.map(action => `${action.cell}:${action.digit}`)).size).toBe(actions.length)
    for (const action of actions) expect(notes[action.cell]).toContain(action.digit)
  }
  if (technique === 'naked-single' || technique === 'hidden-single') {
    expect(eliminations).toHaveLength(0)
    expect(placements).toHaveLength(1)
    expect(cells).toEqual([placements[0].cell])
    expect(digit).toBe(placements[0].digit)
  } else {
    expect(placements).toHaveLength(0)
  }
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
    expect(digits).toContain(digit)
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
    expect(new Set([x, y, z]).size).toBe(3)
    expect(digit).toBe(z)
    expect(notes[a]).toContain(x)
    expect(notes[b]).toContain(y)
    expect(notes[b]).toContain(z)
    expect(sees(pivot, a) && sees(pivot, b)).toBe(true)
    expect(eliminations.every(action => action.digit === z && sees(a, action.cell) && sees(b, action.cell))).toBe(true)
  }
  if (!placements.length) expect(eliminations.length).toBeGreaterThan(0)
}

function assertSound(step: Deduction, solution: Board, board: Board, notes: number[][]) {
  assertPattern(step, notes)
  const state = enumerate(board, notes)
  expect(state.count).toBe(1)
  expect(state.first).toEqual(solution)
  for (const { cell, digit } of step.placements) {
    expect(board[cell]).toBe(0)
    expect(solution[cell]).toBe(digit)
    // A forced placement admits no completion when its digit is excluded.
    const without = notes.map((list, index) => index === cell ? list.filter(value => value !== digit) : list)
    expect(enumerate(board, without).count).toBe(0)
  }
  for (const { cell, digit } of step.eliminations) {
    expect(board[cell]).toBe(0)
    expect(solution[cell]).not.toBe(digit)
    // Independently refute the eliminated candidate, not just compare a solution.
    const forced = notes.map((list, index) => index === cell ? [digit] : list)
    expect(enumerate(board, forced).count).toBe(0)
  }
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
  const first = scenario.steps[0]
  expect(new Set(scenario.evidence).size).toBe(scenario.evidence.length)
  if (first.technique === 'hidden-single') {
    // Show the whole supporting unit, including cells that exclude the digit.
    expect(units.some(unit => same(unit, scenario.evidence) && same(unit.filter(cell => notes[cell].includes(first.digit)), [scenario.target]))).toBe(true)
  } else {
    expect(scenario.evidence).toEqual(first.cells)
  }
  for (const step of scenario.steps) {
    expect(step.board).toEqual(board)
    expect(step.candidates).toEqual(notes)
    assertSound(step, solution, board, notes)
    notes = apply(board, notes, step)
  }
  expect(board[scenario.target]).toBe(scenario.digit)
  expect(solution[scenario.target]).toBe(scenario.digit)
}

describe('practical puzzle walkthroughs', () => {
  it('rejects unrelated evidence even when the full-domain proof remains valid', () => {
    const corrupted = structuredClone(lessons.find(lesson => lesson.id === 'x-wing')!.scenarios[0])
    corrupted.evidence = CELLS
    expect(() => assertReplay(corrupted)).toThrow()
  })

  it('rejects a proof with a correct forced action but a false named premise', () => {
    const corrupted = structuredClone(lessons.find(lesson => lesson.id === 'naked-single')!.scenarios[0])
    const step = corrupted.steps[0]
    step.cells = [(step.placements[0].cell + 1) % 81]
    corrupted.evidence = step.cells.slice()
    expect(() => assertReplay(corrupted)).toThrow()
  })

  it('certifies a stored proof even when the current greedy detector selects no step', () => {
    const greedy = vi.spyOn(detector, 'findDeduction').mockReturnValue(null)
    try {
      assertReplay(lessons.find(lesson => lesson.id === 'swordfish')!.scenarios[1])
      expect(greedy).not.toHaveBeenCalled()
    } finally {
      greedy.mockRestore()
    }
  })
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
        // Exact original clues are authoring evidence, not a request to the
        // retired v1 runtime selector (whose policy no longer exists).
        const source = ORIGINAL_PRACTICE_SOURCES[provenance.puzzleId]
        expect(source).toBeDefined()
        expect(provenance.originalPuzzle.join('')).toBe(source.clues)
        expect(provenance.tier).toBe(source.tier)
        expect(provenance.seed).toBe(source.seed)
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
