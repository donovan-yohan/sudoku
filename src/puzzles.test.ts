import { describe, expect, it } from 'vitest'
import * as historicalSources from './puzzles'
import { CATALOG, DIFFICULTIES } from './puzzles'
import { candidates, countSolutions, isValidBoard, solve } from './engine'
import { rateVariant, type VariantRating } from './variant-engine'
import type { Board } from './types'
// @ts-expect-error standalone .mjs test oracle has no declaration file
import { enumerate } from '../scripts/independent-oracle.mjs'

function proveLogicalSolve(givens: Board, solution: Board, rating: VariantRating) {
  const values = givens.slice()
  let notes = candidates(values)
  expect(rating.trace.length).toBeGreaterThan(0)
  expect(rating.trace.length).toBeLessThan(810)
  for (const deduction of rating.trace) {
    expect(deduction.placements.length + deduction.eliminations.length).toBeGreaterThan(0)
    for (const { cell, digit } of deduction.placements) {
      expect(values[cell]).toBe(0)
      expect(notes[cell]).toContain(digit)
      expect(solution[cell]).toBe(digit)
      values[cell] = digit
    }
    for (const { cell, digit } of deduction.eliminations) {
      expect(solution[cell], `${deduction.technique} removed solution at ${cell}`).not.toBe(digit)
      expect(notes[cell]).toContain(digit)
      notes[cell] = notes[cell].filter(d => d !== digit)
    }
    const legal = candidates(values)
    notes = notes.map((list, cell) => list.filter(d => legal[cell].includes(d)))
    expect(isValidBoard(values)).toBe(true)
  }
  expect(values).toEqual(solution)
  expect(rating.techniques).toEqual([...new Set(rating.trace.map(step => step.technique))])
}

describe('original offline authoring catalog', () => {
  it('exports historical authoring data without a second runtime selection path', () => {
    expect(Object.keys(historicalSources).sort()).toEqual(['CATALOG', 'DIFFICULTIES'])
  })

  it('retains all sixteen distinct original sources with unique solutions and current logical completion', () => {
    expect(DIFFICULTIES).toEqual(['beginner', 'intermediate', 'advanced', 'expert'])
    const sources = Object.values(CATALOG).flat()
    expect(sources).toHaveLength(16)
    expect(new Set(sources).size).toBe(16)
    for (const originalGroup of DIFFICULTIES) {
      expect(CATALOG[originalGroup]).toHaveLength(4)
      const patterns = new Set<string>()
      for (const text of CATALOG[originalGroup]) {
        expect(text).toMatch(/^[0-9]{81}$/)
        patterns.add(text.replace(/[1-9]/g, '1'))
        const givens = [...text].map(Number)
        expect(isValidBoard(givens)).toBe(true)
        expect(countSolutions(givens)).toBe(1)
        const oracle = enumerate(givens)
        expect(oracle.count).toBe(1)
        expect(solve(givens)).toEqual(oracle.first)
        const rating = rateVariant(givens, { variant: 'classic' })
        expect(rating.status, `${originalGroup}: ${text}`).toBe('solved')
        expect(rating.solved).toBe(true)
        expect(DIFFICULTIES).toContain(rating.logicalDifficulty)
        // The source group is historical, not a current difficulty assertion.
        // Sparse singles-only sources may solve logically yet fail accessibility.
        expect(rating.difficulty).toBe(rating.logicalDifficulty === 'beginner' && !rating.approachability.accepted ? null : rating.logicalDifficulty)
        expect(rating.lowerTierStalled).toBe(rating.logicalDifficulty !== 'beginner')
        proveLogicalSolve(givens, oracle.first, rating)
      }
      expect(patterns.size).toBe(4)
    }
  }, 30000)
})
