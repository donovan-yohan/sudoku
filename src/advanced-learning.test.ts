import { describe, expect, it } from 'vitest'
import { PRACTICAL_LESSONS, type PracticalScenario } from './practical-lessons'

const coordinate = (cell: number) => `r${Math.floor(cell / 9) + 1}c${cell % 9 + 1}`
const domain = (digits: number[]) => `{${digits.join(', ')}}`
const lesson = (id: string) => PRACTICAL_LESSONS.find(item => item.id === id)!
const cells = Array.from({ length: 81 }, (_, cell) => cell)
const sorted = (values: number[]) => values.slice().sort((a, b) => a - b)

function assertConcretePlacement(scenario: PracticalScenario) {
  const [step, finish] = scenario.steps
  const before = scenario.candidates[scenario.target]
  const after = before.filter(digit => !step.eliminations.some(action => action.cell === scenario.target && action.digit === digit))
  expect(after, scenario.id).toEqual([scenario.digit])
  expect(finish.candidates[scenario.target]).toEqual(after)
  expect(finish.placements).toEqual([{ cell: scenario.target, digit: scenario.digit }])
  for (const explanation of [step.explanation, finish.explanation]) {
    expect(explanation, scenario.id).toContain(coordinate(scenario.target))
    expect(explanation).toContain(`from ${domain(before)} to ${domain(after)}`)
    expect(explanation).toContain(`Only ${scenario.digit} remains`)
    expect(explanation).toMatch(new RegExp(`place ${scenario.digit}`, 'i'))
    expect(explanation).not.toMatch(/different cover|cover set|base set|confined|\bsees?\b|proven eliminations|learning|prior trace|audit/i)
  }
  expect(step.explanation.split('\n\n').length).toBeGreaterThanOrEqual(4)
  for (const cell of new Set(step.eliminations.map(action => action.cell))) {
    const removed = step.eliminations.filter(action => action.cell === cell).map(action => action.digit)
    const remaining = scenario.candidates[cell].filter(digit => !removed.includes(digit))
    expect(step.explanation).toContain(`Remove ${removed.join(' and ')} from ${coordinate(cell)}: ${domain(scenario.candidates[cell])} becomes ${domain(remaining)}`)
  }
  expect(scenario.proof).toBe(scenario.steps.map(item => item.explanation).join(' '))
}

describe('advanced and expert teaching coverage', () => {
  it('puts exact triple candidates and the target before/after in the visible steps', () => {
    for (const scenario of lesson('naked-triple').scenarios) {
      const step = scenario.steps[0]
      for (const cell of step.cells) expect(step.explanation).toContain(`${coordinate(cell)} has ${domain(scenario.candidates[cell])}`)
      assertConcretePlacement(scenario)
    }
  })

  it('teaches one row-based and one column-based Swordfish with both complete causal branches', () => {
    const fish = lesson('swordfish')
    const specifications = [
      { orientation: 'rows', bases: [1, 3, 7], crossings: [2, 3, 4], evidence: [11, 12, 29, 31, 66, 67], branches: [[11, 31, 66], [12, 67, 29]] },
      { orientation: 'columns', bases: [1, 3, 7], crossings: [2, 3, 4], evidence: [19, 28, 21, 39, 34, 43], branches: [[19, 39, 34], [28, 43, 21]] },
    ]
    expect(fish.scenarios).toHaveLength(2)
    for (const [index, scenario] of fish.scenarios.entries()) {
      const step = scenario.steps[0], spec = specifications[index]
      const baseOf = (cell: number) => spec.orientation === 'rows' ? Math.floor(cell / 9) : cell % 9
      const crossingOf = (cell: number) => spec.orientation === 'rows' ? cell % 9 : Math.floor(cell / 9)
      expect(step.cells).toEqual(spec.evidence)
      expect(scenario.evidence).toEqual(spec.evidence)
      const choices = spec.bases.map(base => cells.filter(cell => baseOf(cell) === base && scenario.candidates[cell].includes(step.digit)))
      for (const [base, locations] of choices.entries()) {
        expect(locations).toHaveLength(2)
        expect(locations).toEqual(spec.evidence.filter(cell => baseOf(cell) === spec.bases[base]))
      }
      // Enumerate the local non-repeating placements, independently of the detector.
      // Neither branch claims to be a second complete solution of this unique puzzle.
      const cases = choices[0].flatMap(a => choices[1].flatMap(b => choices[2].filter(c => new Set([a, b, c].map(crossingOf)).size === 3).map(c => [a, b, c])))
      expect(cases).toHaveLength(2)
      expect(cases.map(branch => sorted(branch))).toEqual(spec.branches.map(branch => sorted(branch)))
      const paragraphs = step.explanation.split('\n\n')
      expect(paragraphs).toHaveLength(5)
      const baseName = spec.orientation === 'rows' ? 'row' : 'column'
      const crossingName = spec.orientation === 'rows' ? 'column' : 'row'
      for (const cell of spec.evidence) expect(paragraphs[0]).toContain(`${coordinate(cell)} has ${domain(scenario.candidates[cell])}`)
      for (const [branchIndex, branch] of spec.branches.entries()) {
        const paragraph = paragraphs[branchIndex + 1]
        expect(paragraph).toContain(`If ${coordinate(branch[0])} is ${step.digit}`)
        for (let position = 1; position < branch.length; position++) {
          const forced = branch[position], prior = branch[position - 1]
          const blocked = choices[spec.bases.indexOf(baseOf(forced))].find(cell => cell !== forced)!
          expect(crossingOf(prior)).toBe(crossingOf(blocked))
          expect(paragraph).toContain(`blocks ${step.digit} at ${coordinate(blocked)}`)
          expect(paragraph).toContain(`shared ${crossingName} ${crossingOf(blocked) + 1}`)
          expect(paragraph).toContain(`${coordinate(forced)} must be ${step.digit}`)
          expect(paragraph).toContain(`${baseName} ${baseOf(forced) + 1}`)
        }
        for (const action of step.eliminations) expect(branch.some(cell => crossingOf(cell) === crossingOf(action.cell))).toBe(true)
        expect(sorted(branch.map(crossingOf))).toEqual(spec.crossings)
      }
      expect(paragraphs[3]).toMatch(/either way/i)
      expect(paragraphs[3]).toContain(`${crossingName}s ${spec.crossings.map(value => value + 1).join(', ')}`)
      const expectedRemovals = cells.filter(cell => !spec.bases.includes(baseOf(cell)) && spec.crossings.includes(crossingOf(cell)) && scenario.candidates[cell].includes(step.digit))
      expect(sorted(step.eliminations.map(action => action.cell))).toEqual(expectedRemovals)
      expect(step.eliminations.every(action => action.digit === step.digit)).toBe(true)
      for (const action of step.eliminations) expect(paragraphs[3]).toContain(coordinate(action.cell))
      assertConcretePlacement(scenario)
    }
    // Same target and same actions as before; only the second visible premise changes.
    expect(fish.scenarios[1].target).toBe(36)
    expect(fish.scenarios[1].digit).toBe(9)
    expect(fish.scenarios[1].steps[0].eliminations).toEqual([
      { cell: 27, digit: 7 }, { cell: 36, digit: 7 }, { cell: 22, digit: 7 }, { cell: 32, digit: 7 },
    ])
  })

  it('uses the independently valid column-based premise in the second Swordfish', () => {
    const scenario = lesson('swordfish').scenarios[1]
    expect(scenario.steps[0].cells).toEqual([19, 28, 21, 39, 34, 43])
    expect(scenario.evidence).toEqual(scenario.steps[0].cells)
  })

  it('states why the three Swordfish placements occupy different crossing units', () => {
    const rule = lesson('swordfish').rule
    expect(rule).toMatch(/three.*placements|three.*copies/i)
    expect(rule).toMatch(/different columns/i)
    expect(rule).toMatch(/rows and columns.*swap|swap.*rows and columns/i)
  })

  it('defines all three XY-Wing cells as exact pairs and names their shared units', () => {
    const rule = lesson('xy-wing').rule
    expect(rule).toMatch(/(?:all three|each of the three).*exactly two candidates/i)
    expect(rule).toMatch(/pivot.*cell/i)
    expect(rule).toMatch(/wings.*cells/i)
    expect(rule).toMatch(/share.*unit/i)
    expect(rule).toMatch(/unit.*row, column or box/i)
    expect(rule).not.toMatch(/\bsees?\b/i)
  })

  it('explains both XY-Wing pivot values, the forced wing, and each elimination through named units', () => {
    const specs = [
      { pivot: 11, wings: [65, 1], pivotUnits: ['column 3', 'box 1'], targetUnits: [['column 3', 'box 1'], ['box 7', 'column 2']] },
      { pivot: 12, wings: [22, 10], pivotUnits: ['box 2', 'row 2'], targetUnits: [['row 3', 'column 2'], ['row 3', 'box 1']] },
    ]
    const wing = lesson('xy-wing')
    expect(wing.scenarios).toHaveLength(2)
    for (const [index, scenario] of wing.scenarios.entries()) {
      const step = scenario.steps[0], spec = specs[index], notes = scenario.candidates
      expect(step.cells).toEqual([spec.pivot, ...spec.wings])
      for (const cell of step.cells) expect(notes[cell]).toHaveLength(2)
      const [x, y] = notes[spec.pivot]
      const z = step.digit
      expect(notes[spec.wings[0]]).toEqual(sorted([x, z]))
      expect(notes[spec.wings[1]]).toEqual(sorted([y, z]))
      expect([x, y]).not.toContain(z)
      const paragraphs = step.explanation.split('\n\n')
      expect(paragraphs).toHaveLength(5)
      expect(paragraphs[0]).toContain('pivot')
      expect(paragraphs[0]).toContain('wings')
      for (const cell of step.cells) expect(paragraphs[0]).toContain(`${coordinate(cell)} has ${domain(notes[cell])}`)
      for (const unit of spec.pivotUnits) expect(paragraphs[0]).toContain(unit)
      for (const [branch, value] of [x, y].entries()) {
        const forced = spec.wings[branch]
        expect(notes[forced].filter(digit => digit !== value)).toEqual([z])
        expect(paragraphs[branch + 1]).toContain(`If ${coordinate(spec.pivot)} is ${value}`)
        expect(paragraphs[branch + 1]).toContain(`cannot be ${value}`)
        expect(paragraphs[branch + 1]).toContain(spec.pivotUnits[branch])
        expect(paragraphs[branch + 1]).toContain(`${coordinate(forced)} must be ${z}`)
      }
      expect(paragraphs[3]).toMatch(/either way/i)
      for (const [actionIndex, action] of step.eliminations.entries()) {
        expect(action.digit).toBe(z)
        expect(paragraphs[3]).toContain(coordinate(action.cell))
        for (const unit of spec.targetUnits[actionIndex]) expect(paragraphs[3]).toContain(unit)
        // Check the claimed row/column/box links independently, not by names alone.
        for (const [wingIndex, unit] of spec.targetUnits[actionIndex].entries()) {
          const other = spec.wings[wingIndex]
          const [kind, number] = unit.split(' ')
          const unitOf = (cell: number) => kind === 'row' ? Math.floor(cell / 9) : kind === 'column' ? cell % 9 : Math.floor(cell / 27) * 3 + Math.floor(cell % 9 / 3)
          expect(unitOf(action.cell)).toBe(Number(number) - 1)
          expect(unitOf(other)).toBe(Number(number) - 1)
        }
      }
      assertConcretePlacement(scenario)
    }
  })

  it('defines a triple unit and explains why nonidentical candidate lists still reserve all three digits', () => {
    const triple = lesson('naked-triple')
    expect(triple.rule).toMatch(/unit.*row, column or box/i)
    expect(triple.rule).toMatch(/(?:need not|do not have to) be identical/i)
    expect(triple.scenarios).toHaveLength(2)
    for (const scenario of triple.scenarios) {
      const step = scenario.steps[0]
      for (const cell of step.cells) {
        expect(step.explanation).toContain(`${coordinate(cell)} has ${domain(scenario.candidates[cell])}`)
      }
      expect(step.explanation).toMatch(/(?:cannot|can not) repeat|different digits/i)
      expect(step.explanation).toMatch(/three cells.*three digits|three digits.*three cells/i)
      expect(step.explanation).toMatch(/other cells?/i)
      assertConcretePlacement(scenario)
    }
    expect(triple.scenarios[0].steps[0].explanation).toContain('column 4')
    expect(triple.scenarios[1].steps[0].explanation).toContain('row 7')
  })
})
