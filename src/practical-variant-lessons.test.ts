import { describe, expect, it } from 'vitest'
import { PRACTICAL_VARIANT_LESSONS } from './practical-variant-lessons'
import type { PracticalVariantScenario } from './practical-variant-lessons'

const cells = Array.from({ length: 81 }, (_, cell) => cell)
const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const rows = Array.from({ length: 9 }, (_, row) => cells.filter(cell => Math.floor(cell / 9) === row))
const columns = Array.from({ length: 9 }, (_, column) => cells.filter(cell => cell % 9 === column))
const boxes = Array.from({ length: 9 }, (_, box) => cells.filter(cell =>
  Math.floor(cell / 27) === Math.floor(box / 3) && Math.floor(cell % 9 / 3) === box % 3))
const classicUnits = [...rows, ...columns, ...boxes]
const diagonals = [Array.from({ length: 9 }, (_, index) => index * 10), Array.from({ length: 9 }, (_, index) => 8 + index * 8)]
// Independent authoring witness, never supplied to the runtime walkthroughs.
const witness = '123456789456789123789123456935241867617538294842697531298314675371865942564972318'.split('').map(Number)
const originalBoards = [
  '100000000050000000000000000000200000000030000000007000000000600000000040000000008',
  '000000009000000020000000400000001000000030000000600000000000000070000000500000000',
  '020050089450000020000100006000040060617008004040000030008004000000800000564070008',
  '020000780000080100000000406900200060610508000800007500200304005301000042500900308',
  '100400700406000100080000050000200060000508004040690501000004005001800000060000300',
  '103006089050089003780000000005040800000008200000090500200300000001860002000000000',
  '003050000050780000009000050900040060007000090000690030000000005000005940560900000',
  '000050000006700000000003056005200060607530000040007001200010070000000042004000000',
].map(board => board.split('').map(Number))

function unitsFor(scenario: PracticalVariantScenario, classicOnly = false): number[][] {
  return [...classicUnits, ...(classicOnly ? [] : scenario.variant === 'x' ? diagonals : scenario.cages!.map(cage => cage.cells))]
}

function domainsFor(scenario: PracticalVariantScenario, board = scenario.board, classicOnly = false): number[][] {
  const units = unitsFor(scenario, classicOnly)
  return cells.map(cell => board[cell] ? [] : digits.filter(digit => units
    .filter(unit => unit.includes(cell)).every(unit => unit.every(peer => peer === cell || board[peer] !== digit))))
}

// A separate implementation exhausts all ordered assignments including givens.
function enumerateAssignments(unit: number[], board: number[], domains: number[][], total?: number): number[][] {
  const result: number[][] = []
  const chosen: number[] = []
  function visit(index: number, sum: number) {
    if (index === unit.length) {
      if (total === undefined || sum === total) result.push([...chosen])
      return
    }
    const cell = unit[index]
    for (const digit of board[cell] ? [board[cell]] : domains[cell]) {
      if (chosen.includes(digit) || (total !== undefined && sum + digit > total)) continue
      chosen.push(digit)
      visit(index + 1, sum + digit)
      chosen.pop()
    }
  }
  visit(0, 0)
  return result
}

// Standalone MRV oracle. No engine/generator/hint imports, stored solution lookup
// or assumption that a published answer is forced. Stop only after two solutions.
function solve(scenario: PracticalVariantScenario, opposite?: { cell: number; digit: number; kind: 'forbid' | 'force' }): number[][] {
  const board = [...scenario.board]
  const units = unitsFor(scenario)
  const solutions: number[][] = []
  if (units.some(unit => {
    const filled = unit.map(cell => board[cell]).filter(Boolean)
    return new Set(filled).size !== filled.length
  })) return []
  function visit() {
    const domains = domainsFor(scenario, board)
    if (opposite && !board[opposite.cell]) domains[opposite.cell] = domains[opposite.cell]
      .filter(digit => opposite.kind === 'forbid' ? digit !== opposite.digit : digit === opposite.digit)
    if (scenario.variant === 'killer') {
      for (const cage of scenario.cages!) {
        const assignments = enumerateAssignments(cage.cells, board, domains, cage.sum)
        if (!assignments.length) return
        cage.cells.forEach((cell, index) => {
          if (!board[cell]) domains[cell] = domains[cell].filter(digit => assignments.some(assignment => assignment[index] === digit))
        })
      }
    }
    const empty = cells.filter(cell => !board[cell])
    if (!empty.length) {
      solutions.push([...board])
      return
    }
    const cell = empty.reduce((best, current) => domains[current].length < domains[best].length ? current : best)
    for (const digit of domains[cell]) {
      board[cell] = digit
      visit()
      board[cell] = 0
      if (solutions.length >= 2) return
    }
  }
  visit()
  return solutions
}

// Availability is checked before mathematical proof assertions.
describe('practical variant walkthroughs', () => {
  it('exports four practical techniques and eight placement walkthroughs', () => {
    const modules = import.meta.glob('./practical-variant-lessons.ts', { eager: true })
    const curriculum = modules['./practical-variant-lessons.ts'] as { PRACTICAL_VARIANT_LESSONS?: typeof PRACTICAL_VARIANT_LESSONS } | undefined
    expect(curriculum?.PRACTICAL_VARIANT_LESSONS, 'practical variant curriculum must be available').toBeDefined()
    const lessons = curriculum!.PRACTICAL_VARIANT_LESSONS!
    expect(lessons.map(lesson => lesson.id)).toEqual(['diagonal-single', 'diagonal-hidden-single', 'cage-remainder', 'cage-combinations'])
    expect(lessons.map(lesson => lesson.scenarios.length)).toEqual([2, 2, 2, 2])
    const scenarios = lessons.flatMap(lesson => lesson.scenarios)
    expect(new Set(scenarios.map(scenario => scenario.id)).size).toBe(8)
    for (const lesson of lessons) {
      expect(lesson.title.length).toBeGreaterThan(0)
      expect(lesson.rule.length).toBeGreaterThan(50)
      expect(lesson.summary.length).toBeGreaterThan(0)
      expect(lesson.scenarios[0].board).not.toEqual(lesson.scenarios[1].board)
      for (const scenario of lesson.scenarios) {
        expect(scenario.board).toHaveLength(81)
        expect(scenario.candidates).toHaveLength(81)
        expect(scenario.board.filter(Boolean).length).toBeGreaterThanOrEqual(22)
        expect(scenario.board[scenario.target]).toBe(0)
        expect(scenario.steps.length).toBeGreaterThan(0)
        expect(scenario.steps.at(-1)!.placements).toContainEqual({ cell: scenario.target, digit: scenario.digit })
        expect(scenario.steps[0].technique).toBe(lesson.id)
        expect('kind' in scenario).toBe(false)
        expect('prompt' in scenario).toBe(false)
      }
    }
  })

  for (const [lessonIndex, lesson] of PRACTICAL_VARIANT_LESSONS.entries()) for (const [scenarioIndex, scenario] of lesson.scenarios.entries()) {
    it(`${scenario.id}: retains original clues, exact domains and a complete valid witness`, () => {
      const original = originalBoards[lessonIndex * 2 + scenarioIndex]
      const domains = domainsFor(scenario)
      expect(scenario.candidates).toEqual(domains)
      for (const cell of cells) {
        if (original[cell]) expect(scenario.board[cell]).toBe(original[cell])
        if (scenario.board[cell]) expect(scenario.board[cell]).toBe(witness[cell])
        else expect(domains[cell]).toContain(witness[cell])
      }
      for (const unit of [...classicUnits, ...(scenario.variant === 'x' ? diagonals : [])]) {
        expect(unit.map(cell => witness[cell]).sort((a, b) => a - b)).toEqual(digits)
      }
      if (scenario.cages) {
        expect(scenario.cages.flatMap(cage => cage.cells).sort((a, b) => a - b)).toEqual(cells)
        for (const cage of scenario.cages) {
          expect(new Set(cage.cells.map(cell => witness[cell])).size).toBe(cage.cells.length)
          expect(cage.cells.reduce((sum, cell) => sum + witness[cell], 0)).toBe(cage.sum)
          const connected = new Set([cage.cells[0]])
          for (let pass = 0; pass < cage.cells.length; pass++) for (const cell of cage.cells) {
            if ([...connected].some(other => Math.abs(Math.floor(other / 9) - Math.floor(cell / 9)) + Math.abs(other % 9 - cell % 9) === 1)) connected.add(cell)
          }
          expect(connected.size).toBe(cage.cells.length)
        }
      }
      expect(witness[scenario.target]).toBe(scenario.digit)
    })

    it(`${scenario.id}: has exactly one full solution under all variant constraints`, () => {
      expect(solve(scenario)).toEqual([witness])
    })

    it(`${scenario.id}: the opposite placement has no full variant solution`, () => {
      expect(solve(scenario, { cell: scenario.target, digit: scenario.digit, kind: 'forbid' })).toEqual([])
    })

    it(`${scenario.id}: the named rule forces its action locally rather than revealing an answer`, () => {
      const domain = scenario.candidates[scenario.target]
      if (scenario.variant === 'x') {
        expect(diagonals).toContainEqual(scenario.evidence)
        const assignments = enumerateAssignments(scenario.evidence, scenario.board, scenario.candidates)
        const targetIndex = scenario.evidence.indexOf(scenario.target)
        expect(assignments.length).toBeGreaterThan(0)
        expect(assignments.every(assignment => assignment[targetIndex] === scenario.digit)).toBe(true)
        if (lesson.id === 'diagonal-single') {
          expect(scenario.evidence.filter(cell => scenario.board[cell])).toHaveLength(8)
          expect(domain).toEqual([scenario.digit])
          expect(domainsFor(scenario, scenario.board, true)[scenario.target].length).toBeGreaterThan(1)
        } else {
          expect(domain.length).toBeGreaterThanOrEqual(2)
          expect(scenario.evidence.filter(cell => scenario.candidates[cell].includes(scenario.digit))).toEqual([scenario.target])
          for (const unit of classicUnits.filter(unit => unit.includes(scenario.target))) {
            expect(unit.filter(cell => scenario.candidates[cell].includes(scenario.digit)).length).toBeGreaterThan(1)
          }
        }
      } else {
        expect(domain.length).toBeGreaterThan(1)
        for (const unit of classicUnits.filter(unit => unit.includes(scenario.target))) {
          expect(unit.filter(cell => scenario.candidates[cell].includes(scenario.digit)).length).toBeGreaterThan(1)
        }
        const cage = scenario.cages![0]
        expect(scenario.evidence).toEqual(cage.cells)
        const assignments = enumerateAssignments(cage.cells, scenario.board, scenario.candidates, cage.sum)
        const targetIndex = cage.cells.indexOf(scenario.target)
        expect(assignments.length).toBeGreaterThan(0)
        expect(assignments.every(assignment => assignment[targetIndex] === scenario.digit)).toBe(true)
        if (lesson.id === 'cage-remainder') {
          expect(cage.cells.filter(cell => !scenario.board[cell])).toEqual([scenario.target])
          expect(cage.sum - cage.cells.reduce((sum, cell) => sum + scenario.board[cell], 0)).toBe(scenario.digit)
        } else {
          expect(cage.cells.every(cell => !scenario.board[cell])).toBe(true)
          expect(cage.sum).toBe(scenarioIndex === 0 ? 3 : 17)
          const allSumPairs = digits.flatMap(a => digits.filter(b => a < b && a + b === cage.sum).map(b => [a, b]))
          expect(allSumPairs).toEqual(scenarioIndex === 0 ? [[1, 2]] : [[8, 9]])
          const eliminations = cage.cells.flatMap((cell, index) => scenario.candidates[cell]
            .filter(digit => !assignments.some(assignment => assignment[index] === digit)).map(digit => ({ cell, digit })))
          expect(eliminations.length).toBeGreaterThan(1)
          expect(scenario.steps[0].placements).toEqual([])
          expect(scenario.steps[0].eliminations).toEqual(eliminations)
          expect(scenario.steps).toHaveLength(2)
          expect(scenario.steps[1].technique).toBe('naked-single')
          for (const { cell, digit } of eliminations) {
            expect(assignments.some(assignment => assignment[cage.cells.indexOf(cell)] === digit)).toBe(false)
          }
        }
      }
    })

    it(`${scenario.id}: replays every elimination and ends with a legal direct placement`, () => {
      const board = [...scenario.board]
      const domains = scenario.candidates.map(domain => [...domain])
      for (const step of scenario.steps) {
        expect(step.explanation.length).toBeGreaterThan(20)
        expect(step.cells.length).toBeGreaterThan(0)
        for (const { cell, digit } of step.eliminations) {
          expect(board[cell]).toBe(0)
          expect(domains[cell]).toContain(digit)
          expect(witness[cell]).not.toBe(digit)
          expect(solve(scenario, { cell, digit, kind: 'force' })).toEqual([])
          domains[cell] = domains[cell].filter(value => value !== digit)
          expect(domains[cell].length).toBeGreaterThan(0)
        }
        for (const { cell, digit } of step.placements) {
          expect(board[cell]).toBe(0)
          expect(domains[cell]).toContain(digit)
          expect(witness[cell]).toBe(digit)
          if (step.technique === 'naked-single') expect(domains[cell]).toEqual([digit])
          board[cell] = digit
          domains[cell] = []
        }
      }
      expect(board[scenario.target]).toBe(scenario.digit)
      expect(board.filter(Boolean).length).toBe(scenario.board.filter(Boolean).length + 1)
      const after = { ...scenario, board }
      expect(solve(after)).toEqual([witness])
    })
  }

  it('the independent oracle rejects contradictory givens and cage totals', () => {
    const x = structuredClone(PRACTICAL_VARIANT_LESSONS[0].scenarios[0])
    x.board[1] = x.board[0]
    expect(solve(x)).toEqual([])
    const killer = structuredClone(PRACTICAL_VARIANT_LESSONS[2].scenarios[0])
    killer.cages![0].sum = 1
    expect(solve(killer)).toEqual([])
  })
})
