import { describe, expect, it } from 'vitest'
import { UNITS, peers, candidates, isValidBoard, solve, countSolutions, findDeduction } from './engine'
import { rateVariant } from './variant-engine'

import type { Technique } from './types'
const blank = () => Array(81).fill(0)
const fullNotes = () => Array.from({ length: 81 }, () => [1,2,3,4,5,6,7,8,9])
const board = (text: string) => [...text].map(Number)
const complete = board('123456789456789123789123456234567891567891234891234567345678912678912345912345678')

describe('board model and search', () => {
  it('builds 27 distinct units and exactly 20 symmetric peers per cell', () => {
    expect(UNITS).toHaveLength(27)
    for (const unit of UNITS) expect(new Set(unit).size).toBe(9)
    for (let cell = 0; cell < 81; cell++) {
      expect(peers(cell)).toHaveLength(20)
      expect(peers(cell)).not.toContain(cell)
      for (const peer of peers(cell)) expect(peers(peer)).toContain(cell)
    }
  })
  it('rejects malformed values and contradictory givens', () => {
    expect(isValidBoard(complete)).toBe(true)
    for (const invalid of [null, [], Array(81), Array(81).fill(NaN), Array(81).fill(Infinity), Array(81).fill(10), Array(81).fill(0.5), Array(81).fill('0'), [...complete.slice(0, 80)], [2, ...complete.slice(1)]]) {
      expect(isValidBoard(invalid)).toBe(false)
      expect(solve(invalid as number[])).toBeNull()
      expect(countSolutions(invalid as number[])).toBe(0)
    }
  })
  it('computes only legal candidates, returning no candidates for givens', () => {
    const puzzle = complete.slice(); puzzle[0] = 0
    expect(candidates(puzzle)[0]).toEqual([1])
    expect(candidates(puzzle)[1]).toEqual([])
    expect(puzzle[0]).toBe(0)
  })
  it('solves without mutation and distinguishes zero, one, and many solutions', () => {
    const puzzle = complete.map((v, i) => i % 10 === 0 ? 0 : v)
    const original = puzzle.slice()
    expect(solve(puzzle)).toEqual(complete)
    expect(countSolutions(puzzle)).toBe(1)
    expect(puzzle).toEqual(original)
    expect(countSolutions(Array(81).fill(0))).toBe(2)
    expect(countSolutions(Array(81).fill(0), 1)).toBe(1)
    expect(countSolutions(Array(81).fill(0), 0)).toBe(0)
    const dead = Array(81).fill(0); dead.splice(0, 9, 1, 2, 3, 4, 5, 6, 7, 8, 0); dead[17] = 9
    expect(isValidBoard(dead)).toBe(true)
    expect(solve(dead)).toBeNull()
    expect(countSolutions(dead)).toBe(0)
  })
})


describe('single deductions', () => {
  it('explains a naked single using coordinates without mutating inputs', () => {
    const puzzle = complete.slice(); puzzle[0] = 0
    const hint = findDeduction(puzzle)
    expect(hint?.technique).toBe('naked-single')
    expect(hint?.placements).toEqual([{ cell: 0, digit: 1 }])
    expect(hint?.explanation).toContain('r1c1')
    expect(puzzle[0]).toBe(0)
  })
  it('finds a hidden single before more complex elimination techniques', () => {
    const notes = Array.from({ length: 81 }, () => [1,2,3,4,5,6,7,8,9])
    for (let cell = 1; cell < 9; cell++) notes[cell] = [1,2,3,4,5,6,7,8]
    const hint = findDeduction(Array(81).fill(0), notes)
    expect(hint?.technique).toBe('hidden-single')
    expect(hint?.placements).toEqual([{ cell: 0, digit: 9 }])
    expect(notes[0]).toHaveLength(9)
  })
  it('does not invent a move on an unconstrained or invalid board', () => {
    expect(findDeduction(Array(81).fill(0))).toBeNull()
    expect(findDeduction([1])).toBeNull()
    expect(findDeduction(complete)).toBeNull()
  })
})

describe('logical rating', () => {
  it('rates singles as beginner independently of clue count and preserves input', () => {
    const puzzle = complete.slice(); puzzle[0] = 0
    expect(rateVariant(puzzle, { variant: 'classic' })).toMatchObject({ logicalDifficulty: 'beginner', techniques: ['naked-single'], solved: true })
    expect(puzzle[0]).toBe(0)
    expect(rateVariant(complete, { variant: 'classic' })).toMatchObject({ logicalDifficulty: 'beginner', techniques: [], solved: true })
  })
  it('honestly marks unsupported and invalid puzzles unsolved', () => {
    expect(rateVariant(blank(), { variant: 'classic' }).solved).toBe(false)
    expect(rateVariant([1], { variant: 'classic' }).solved).toBe(false)
    expect(rateVariant(blank(), { variant: 'classic' }).techniques).toEqual([])
  })
})

describe('retained candidate eliminations', () => {
  // Independent candidate-restricted completion oracle. It never calls engine.solve
  // or any deduction rule, so a false-positive elimination cannot self-validate.
  function completion(notes: number[][], force?: {cell: number; digit: number}): number[] | null {
    const options = notes.flatMap((digits, cell) => digits.filter(digit => !force || cell !== force.cell || digit === force.digit).map(digit => ({
      cell, digit, constraints: [cell, 81 + Math.floor(cell / 9) * 9 + digit - 1, 162 + cell % 9 * 9 + digit - 1, 243 + (Math.floor(cell / 27) * 3 + Math.floor(cell % 9 / 3)) * 9 + digit - 1],
    })))
    const byConstraint = Array.from({ length: 324 }, (_, c) => options.filter(option => option.constraints.includes(c)))
    const covered = new Set<number>(), values = blank()
    function visit(): boolean {
      if (covered.size === 324) return true
      let choices: typeof options | null = null
      for (let c = 0; c < 324; c++) {
        if (covered.has(c)) continue
        const compatible = byConstraint[c].filter(option => option.constraints.every(constraint => !covered.has(constraint)))
        if (!compatible.length) return false
        if (!choices || compatible.length < choices.length) { choices = compatible; if (choices.length === 1) break }
      }
      for (const option of choices ?? []) {
        option.constraints.forEach(c => covered.add(c)); values[option.cell] = option.digit
        if (visit()) return true
        option.constraints.forEach(c => covered.delete(c)); values[option.cell] = 0
      }
      return false
    }
    return visit() ? values : null
  }
  const fixtures: [Technique, () => number[][], number, number][] = [
    ['locked-candidates', () => { const n = fullNotes(); for (const c of [2,9,10,11,18,19,20]) n[c] = n[c].filter(d => d !== 1); return n }, 3, 1],
    ['naked-pair', () => { const n = fullNotes(); n[0] = [1,2]; n[1] = [1,2]; return n }, 2, 1],
    ['naked-triple', () => { const n = fullNotes(); n[0] = [1,2]; n[1] = [2,3]; n[2] = [1,3]; return n }, 3, 1],
    ['x-wing', () => { const n = fullNotes(); for (const r of [0,3]) for (let c = 0; c < 9; c++) if (![1,4].includes(c)) n[r*9+c] = n[r*9+c].filter(d => d !== 1); return n }, 10, 1],
    ['swordfish', () => { const n = fullNotes(); for (const [r,cols] of [[0,[1,4]],[3,[4,7]],[6,[1,7]]] as [number,number[]][]) for (let c = 0; c < 9; c++) if (!cols.includes(c)) n[r*9+c] = n[r*9+c].filter(d => d !== 1); return n }, 10, 1],
    ['xy-wing', () => { const n = fullNotes(); n[0] = [1,2]; n[4] = [1,3]; n[27] = [2,3]; return n }, 31, 3],
  ]
  it.each(fixtures)('recognizes %s with real coordinate evidence', (technique, fixture, cell, digit) => {
    const notes = fixture(), before = structuredClone(notes)
    const hint = findDeduction(blank(), notes)
    expect(hint?.technique).toBe(technique)
    expect(hint?.eliminations).toContainEqual({ cell, digit })
    expect(hint?.placements).toEqual([])
    expect(hint?.cells.length).toBeGreaterThan(1)
    expect(hint?.explanation).toMatch(/r\dc\d/)
    expect(notes).toEqual(before)
  })
  it.each(fixtures)('independently proves %s fixtures are consistent and the target impossible', (_technique, fixture, cell, digit) => {
    const notes = fixture()
    const witness = completion(notes)
    expect(witness).not.toBeNull()
    expect(isValidBoard(witness)).toBe(true)
    expect(completion(notes, { cell, digit })).toBeNull()
  })
  it.each(fixtures)('recognizes transposed %s using the same logical evidence', (technique, fixture, cell, digit) => {
    const transpose = (c: number) => c % 9 * 9 + Math.floor(c / 9)
    const notes = fullNotes()
    fixture().forEach((list, c) => { notes[transpose(c)] = list })
    const hint = findDeduction(blank(), notes)
    expect(hint?.technique).toBe(technique)
    expect(hint?.eliminations).toContainEqual({ cell: transpose(cell), digit })
  })
  it('supports claiming from a row into a box', () => {
    const notes = fullNotes()
    for (let c = 2; c < 9; c++) notes[c] = notes[c].filter(d => d !== 1)
    expect(findDeduction(blank(), notes)?.eliminations).toContainEqual({ cell: 9, digit: 1 })
  })
  it('rejects malformed or contradictory candidate overrides', () => {
    expect(findDeduction(blank(), [])).toBeNull()
    expect(findDeduction(blank(), Array(81))).toBeNull()
    const sparseDigits = fullNotes(); sparseDigits[0] = Array(2)
    expect(findDeduction(blank(), sparseDigits)).toBeNull()
    const notes = fullNotes(); notes[0] = []
    expect(findDeduction(blank(), notes)).toBeNull()
    notes[0] = [10]
    expect(findDeduction(blank(), notes)).toBeNull()
  })
  it('does not mistake an extra fish cover or mismatched wing for a pattern', () => {
    const fish = fixtures[3][1](); fish[2].push(1)
    expect(findDeduction(blank(), fish)?.technique).not.toBe('x-wing')
    const sword = fixtures[4][1](); sword[2].push(1)
    expect(findDeduction(blank(), sword)?.technique).not.toBe('swordfish')
    const wing = fixtures[5][1](); wing[27] = [2,4]
    expect(findDeduction(blank(), wing)?.technique).not.toBe('xy-wing')
  })
})
