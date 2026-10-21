import { describe, expect, it } from 'vitest'
import { CATALOG, DIFFICULTIES, getDailyPuzzle, getPracticePuzzle } from './puzzles'
import { candidates, countSolutions, findDeduction, isValidBoard, ratePuzzle, solve } from './engine'
import type { Puzzle } from './types'

function proveLogicalSolve(puzzle: Puzzle) {
  const values = puzzle.givens.slice()
  let notes = candidates(values)
  let steps = 0
  while (values.includes(0) && steps++ < 810) {
    const deduction = findDeduction(values, notes)
    expect(deduction, `stalled at step ${steps} for ${puzzle.id}`).not.toBeNull()
    if (!deduction) break
    for (const { cell, digit } of deduction.placements) {
      expect(puzzle.solution[cell]).toBe(digit)
      values[cell] = digit
    }
    for (const { cell, digit } of deduction.eliminations) {
      expect(puzzle.solution[cell], `${deduction.technique} removed solution at ${cell}`).not.toBe(digit)
      expect(notes[cell]).toContain(digit)
      notes[cell] = notes[cell].filter(d => d !== digit)
    }
    const legal = candidates(values)
    notes = notes.map((list, cell) => list.filter(d => legal[cell].includes(d)))
  }
  expect(values).toEqual(puzzle.solution)
}

describe('original offline catalog', () => {
  it('has four structurally different original bases per tier with exact logical ratings and uniqueness', () => {
    expect(DIFFICULTIES).toEqual(['beginner', 'intermediate', 'advanced', 'expert'])
    for (const difficulty of DIFFICULTIES) {
      expect(CATALOG[difficulty].length).toBeGreaterThanOrEqual(4)
      const patterns = new Set<string>()
      for (const text of CATALOG[difficulty]) {
        expect(text).toMatch(/^[0-9]{81}$/)
        patterns.add(text.replace(/[1-9]/g, '1'))
        const givens = [...text].map(Number)
        expect(isValidBoard(givens)).toBe(true)
        expect(countSolutions(givens)).toBe(1)
        const rating = ratePuzzle(givens)
        expect(rating.solved).toBe(true)
        expect(rating.difficulty).toBe(difficulty)
        proveLogicalSolve({ id: text, givens, solution: solve(givens)!, difficulty, techniques: rating.techniques })
      }
      expect(patterns.size).toBe(CATALOG[difficulty].length)
    }
  }, 30000)
})

describe('seeded daily and practice selection', () => {
  it('is reproducible across calls, modes, UTC dates and far-future dates', () => {
    for (const difficulty of DIFFICULTIES) {
      const identities = new Set<string>()
      for (const date of ['2026-10-20','2026-10-21','2028-02-29','2040-12-31','2099-01-01']) {
        const puzzle = getDailyPuzzle(date, difficulty)
        expect(getDailyPuzzle(date, difficulty)).toEqual(puzzle)
        expect(puzzle.id).toContain(date)
        expect(puzzle.id).not.toBe(getPracticePuzzle(difficulty, date).id)
        expect(countSolutions(puzzle.givens)).toBe(1)
        expect(solve(puzzle.givens)).toEqual(puzzle.solution)
        expect(ratePuzzle(puzzle.givens)).toEqual({ difficulty, solved: true, techniques: puzzle.techniques })
        identities.add(puzzle.givens.join(''))
      }
      expect(identities.size).toBeGreaterThan(1)
      expect(getPracticePuzzle(difficulty, 'repeatable')).toEqual(getPracticePuzzle(difficulty, 'repeatable'))
    }
  }, 30000)
  it('returns defensive copies and validates date and difficulty input', () => {
    const puzzle = getDailyPuzzle('2026-10-20', 'beginner')
    puzzle.givens.fill(9); puzzle.solution.fill(0); puzzle.techniques.length = 0
    expect(isValidBoard(getDailyPuzzle('2026-10-20', 'beginner').givens)).toBe(true)
    for (const invalid of ['2026-2-02','2026-02-30','not-a-date','2026-10-20T00:00:00Z']) expect(() => getDailyPuzzle(invalid, 'beginner')).toThrow()
    expect(() => getPracticePuzzle('impossible' as never, 'seed')).toThrow()
  })
})
