import { describe, expect, it } from 'vitest'
import * as curriculum from './variant-lessons'
import type { LessonCage, VariantScenario } from './variant-lessons'

const cells = Array.from({ length: 81 }, (_, cell) => cell)
const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const rows = Array.from({ length: 9 }, (_, row) => cells.filter(cell => Math.floor(cell / 9) === row))
const columns = Array.from({ length: 9 }, (_, column) => cells.filter(cell => cell % 9 === column))
const boxes = Array.from({ length: 9 }, (_, box) => cells.filter(cell =>
  Math.floor(cell / 27) === Math.floor(box / 3) && Math.floor(cell % 9 / 3) === box % 3))
const classicUnits = [...rows, ...columns, ...boxes]
const diagonals = [Array.from({ length: 9 }, (_, index) => index * 10), Array.from({ length: 9 }, (_, index) => 8 + index * 8)]
// Frozen by an independent authoring backtracker; never exported as lesson data.
const witness = '123456789456789123789123456935241867617538294842697531298314675371865942564972318'.split('').map(Number)

function independentDomains(scenario: VariantScenario, classicOnly = false): number[][] {
  const units = [...classicUnits, ...(classicOnly ? [] : scenario.variant === 'x' ? diagonals : scenario.cages!.map(cage => cage.cells))]
  return cells.map(cell => scenario.board[cell] ? [] : digits.filter(digit => units
    .filter(unit => unit.includes(cell)).every(unit => unit.every(peer => peer === cell || scenario.board[peer] !== digit))))
}

function assertCages(cages: LessonCage[]) {
  expect(cages.flatMap(cage => cage.cells).sort((a, b) => a - b)).toEqual(cells)
  for (const cage of cages) {
    expect(new Set(cage.cells.map(cell => witness[cell])).size).toBe(cage.cells.length)
    expect(cage.cells.reduce((sum, cell) => sum + witness[cell], 0)).toBe(cage.sum)
    const connected = new Set([cage.cells[0]])
    for (let pass = 0; pass < cage.cells.length; pass++) for (const cell of cage.cells) {
      if ([...connected].some(other => Math.abs(Math.floor(other / 9) - Math.floor(cell / 9)) + Math.abs(other % 9 - cell % 9) === 1)) connected.add(cell)
    }
    expect(connected.size).toBe(cage.cells.length)
  }
}

// Exhaust every assignment of the displayed proof unit. Forcing the opposite
// must leave zero branches; a valid completion separately prevents vacuity.
function localBranches(scenario: VariantScenario, opposite = false): number {
  const cage = scenario.cages?.find(item => item.cells.includes(scenario.target))
  const unit = cage?.cells ?? scenario.evidence
  const chosen: number[] = []
  let branches = 0
  function visit(index: number) {
    if (index === unit.length) {
      if (!cage || chosen.reduce((sum, digit) => sum + digit, 0) === cage.sum) branches++
      return
    }
    const cell = unit[index]
    for (const digit of scenario.board[cell] ? [scenario.board[cell]] : scenario.candidates[cell]) {
      if (chosen.includes(digit)) continue
      if (opposite && cell === scenario.target && (scenario.kind === 'place' ? digit === scenario.digit : digit !== scenario.digit)) continue
      chosen.push(digit)
      visit(index + 1)
      chosen.pop()
    }
  }
  visit(0)
  return branches
}

// Start with the public data contract before adding mathematical proof audits.
describe('variant curriculum', () => {
  it('exports four techniques with two distinct, actionable examples each', () => {
    const lessons = curriculum.VARIANT_LESSONS
    expect(lessons.map(lesson => lesson.id)).toEqual([
      'diagonal-single', 'diagonal-hidden-single', 'cage-remainder', 'cage-combinations',
    ])
    const scenarios = lessons.flatMap(lesson => lesson.scenarios)
    expect(scenarios).toHaveLength(8)
    expect(new Set(scenarios.map(scenario => scenario.id)).size).toBe(8)
    for (const lesson of lessons) {
      expect(lesson.scenarios).toHaveLength(2)
      expect(lesson.rule.length).toBeGreaterThan(50)
      expect(lesson.prerequisites.length).toBeGreaterThan(0)
      expect(lesson.steps.length).toBeGreaterThanOrEqual(3)
      expect(lesson.scenarios[0].board).not.toEqual(lesson.scenarios[1].board)
      for (const scenario of lesson.scenarios) {
        expect(scenario.variant).toBe(lesson.variant)
        expect(scenario.prompt.length).toBeGreaterThan(20)
        expect(scenario.proof.length).toBeGreaterThan(40)
        expect(scenario.caption.length).toBeGreaterThan(0)
        expect(scenario.board).toHaveLength(81)
        expect(scenario.candidates).toHaveLength(81)
        expect(scenario.evidence.length).toBeGreaterThan(0)
        expect(scenario.board[scenario.target]).toBe(0)
        expect(scenario.candidates[scenario.target]).toContain(scenario.digit)
        expect(scenario.kind).toBe(lesson.id === 'cage-combinations' ? 'eliminate' : 'place')
      }
    }
  })
  for (const lesson of curriculum.VARIANT_LESSONS) for (const scenario of lesson.scenarios) {
    it(`${scenario.id} displays only the proof unit notes without singling out the answer`, () => {
      const expected = Object.fromEntries(scenario.evidence.filter(cell => !scenario.board[cell])
        .map(cell => [cell, scenario.candidates[cell]]))
      expect(scenario.visibleNotes).toEqual(expected)
      for (const cell of Object.keys(expected).map(Number)) expect(scenario.visibleNotes[cell]).not.toBe(scenario.candidates[cell])
      expect(Object.keys(expected).length).toBeGreaterThan(0)
      expect(Object.keys(expected).length).toBeLessThanOrEqual(9)
      expect(scenario.candidates.filter(domain => domain.length > 0).length).toBeGreaterThan(Object.keys(expected).length)
    })
    it(`${scenario.id} has exact peer domains and a complete variant-valid witness`, () => {
      expect(scenario.candidates).toEqual(independentDomains(scenario))
      const units = [...classicUnits, ...(scenario.variant === 'x' ? diagonals : [])]
      for (const unit of units) expect(unit.map(cell => witness[cell]).sort((a, b) => a - b)).toEqual(digits)
      if (scenario.variant === 'killer') assertCages(scenario.cages!)
      for (const cell of cells) {
        if (scenario.board[cell]) expect(scenario.board[cell]).toBe(witness[cell])
        else expect(scenario.candidates[cell]).toContain(witness[cell])
      }
      expect(witness[scenario.target] === scenario.digit).toBe(scenario.kind === 'place')
    })
    it(`${scenario.id} forbids the opposite action in every local branch`, () => {
      expect(localBranches(scenario)).toBeGreaterThan(0)
      expect(localBranches(scenario, true)).toBe(0)
    })
    it(`${scenario.id} uses its named technique rather than a classic single or absent candidate`, () => {
      const domain = scenario.candidates[scenario.target]
      if (lesson.id.startsWith('diagonal-')) {
        expect(diagonals).toContainEqual(scenario.evidence)
        if (lesson.id === 'diagonal-single') {
          expect(scenario.evidence.filter(cell => !scenario.board[cell])).toEqual([scenario.target])
          expect(domain).toEqual([scenario.digit])
          expect(independentDomains(scenario, true)[scenario.target].length).toBeGreaterThan(1)
        } else {
          expect(domain.length).toBeGreaterThan(1)
          expect(scenario.evidence.filter(cell => scenario.candidates[cell].includes(scenario.digit))).toEqual([scenario.target])
          for (const unit of classicUnits.filter(unit => unit.includes(scenario.target))) {
            expect(unit.filter(cell => scenario.candidates[cell].includes(scenario.digit)).length).toBeGreaterThan(1)
          }
        }
      } else {
        const cage = scenario.cages!.find(cage => cage.cells.includes(scenario.target))!
        expect(scenario.evidence).toEqual(cage.cells)
        expect(domain.length).toBeGreaterThan(1)
        if (lesson.id === 'cage-remainder') {
          expect(cage.cells.filter(cell => !scenario.board[cell])).toEqual([scenario.target])
          expect(cage.sum - cage.cells.reduce((sum, cell) => sum + scenario.board[cell], 0)).toBe(scenario.digit)
        } else {
          expect(cage.cells).toHaveLength(2)
          expect([3, 17]).toContain(cage.sum)
          expect(cage.cells.every(cell => !scenario.board[cell])).toBe(true)
          const combinations = digits.flatMap(a => digits.filter(b => a < b && a + b === cage.sum).map(b => [a, b]))
          expect(combinations).toEqual(cage.sum === 3 ? [[1, 2]] : [[8, 9]])
          expect(combinations.flat()).not.toContain(scenario.digit)
          expect(domain).toContain(scenario.digit)
          const forced = structuredClone(scenario)
          forced.candidates[forced.target] = [forced.digit]
          expect(localBranches(forced)).toBe(0)
          expect(scenario.proof).toContain(`{${domain.join(', ')}}`)
        }
      }
    })
  }
})
