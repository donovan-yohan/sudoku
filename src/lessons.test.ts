import { describe, expect, it } from 'vitest'
import { LESSONS, evaluateLesson, validateScenario } from './lessons'
import type { Lesson, Scenario, Technique } from './types'
// @ts-expect-error standalone .mjs test oracle has no declaration file
import { enumerate } from '../scripts/independent-oracle.mjs'

const clone = (scenario: Scenario): Scenario => structuredClone(scenario)
const lesson = (id: Technique): Lesson => {
  const found = LESSONS.find(item => item.id === id)
  expect(found, `Missing ${id} lesson`).toBeDefined()
  return found!
}

function checkExamples(id: Technique) {
  const entry = lesson(id)
  expect(entry.scenarios).toHaveLength(2)
  expect(entry.scenarios[0].id).not.toBe(entry.scenarios[1].id)
  expect(JSON.stringify(entry.scenarios[0].candidates)).not.toBe(JSON.stringify(entry.scenarios[1].candidates))
  for (const scenario of entry.scenarios) {
    if (id === 'hidden-single') expect(scenario.caption).not.toMatch(/candidate study|diagram|no unique puzzle/i)
    else expect(scenario.caption).toContain('Candidate study.')
    expect(scenario.caption).not.toContain('No unique puzzle')
    expect(scenario.prompt.length).toBeGreaterThan(30)
    expect(scenario.proof.length).toBeGreaterThan(60)
    expect(validateScenario(entry, scenario), scenario.id).toBe(true)
    const before = JSON.stringify(scenario)
    expect(evaluateLesson(scenario, { cell: scenario.target, digit: scenario.digit, kind: scenario.kind }))
      .toEqual({ correct: true, message: scenario.proof })
    const feedback = evaluateLesson(scenario, {
      cell: scenario.target, digit: scenario.digit % 9 + 1, kind: scenario.kind,
    })
    expect(feedback.correct).toBe(false)
    expect(feedback.message).not.toContain(scenario.proof)
    expect(JSON.stringify(scenario)).toBe(before)
  }
}

// Frozen completions are test-only satisfiability witnesses, never lesson
// answers or UI data. Hidden-single clue boards also pass the independent oracle.
const WITNESSES: Record<string, string> = {
  'naked-single-1': '123456789456789123789123456271364895835291647964578231312645978597812364648937512',
  'naked-single-2': '234158697176923458895467321429375816567891234318246579743589162952614783681732945',
  'hidden-single-1': '478659321231847956596123748182734569754296183963518472615372894847961235329485617',
  'hidden-single-2': '593672148287413965461859723648521379132947856759368214975286431314795682826134597',
  'locked-candidates-1': '312456789789312456456789312231845967697231845845697231123574698968123574574968123',
  'locked-candidates-2': '162345789789612345345879162271563498694781253853294671516937824428156937937428516',
  'naked-pair-1': '213475689896213745745689213427561398351928476689734521132846957578392164964157832',
  'naked-pair-2': '138245679679831245245976138861352497357419862492768351583194726726583914914627583',
  'naked-triple-1': '456789123789123456123546798261834975397251684845697231912365847578412369634978512',
  'naked-triple-2': '136245789498671352257893164789512436612734895345986217861429573523167948974358621',
  'x-wing-1': '152346789697128534438597126524973618319864257786251493941632875875419362263785941',
  'x-wing-2': '123456789458379126769812345914235678875961234236784951581623497642597813397148562',
  'swordfish-1': '213456789789123456456978123375269814192584367864317592537691248941832675628745931',
  'swordfish-2': '912345678785126934436897125124689357567213489398574216279451863651938742843762591',
  'xy-wing-1': '125436789467189325389257146593621874214798563678543291742365918856912437931874652',
  'xy-wing-2': '137849652542316897689257134971423568368175429425968713213584976896731245754692381',
}
const cells = Array.from({ length: 81 }, (_, cell) => cell)
const rows = Array.from({ length: 9 }, (_, row) => cells.filter(cell => Math.floor(cell / 9) === row))
const columns = Array.from({ length: 9 }, (_, column) => cells.filter(cell => cell % 9 === column))
const boxes = Array.from({ length: 9 }, (_, box) => cells.filter(cell =>
  Math.floor(Math.floor(cell / 9) / 3) === Math.floor(box / 3) && Math.floor(cell % 9 / 3) === box % 3))
const units = [...rows, ...columns, ...boxes]
const peers = (a: number, b: number) => a !== b && units.some(unit => unit.includes(a) && unit.includes(b))

function assertWitness(scenario: Scenario) {
  const witness = WITNESSES[scenario.id]?.split('').map(Number)
  expect(witness, scenario.id).toHaveLength(81)
  for (const unit of units) expect(unit.map(cell => witness[cell]).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  for (const cell of cells) {
    if (scenario.board[cell]) expect(witness[cell]).toBe(scenario.board[cell])
    else expect(scenario.candidates[cell], `${scenario.id} cell ${cell}`).toContain(witness[cell])
  }
  if (scenario.kind === 'place') expect(witness[scenario.target]).toBe(scenario.digit)
  else expect(witness[scenario.target]).not.toBe(scenario.digit)
}

// Enumerate only the proof's local possibilities, not full-grid solutions.
// The oracle shares neither implementation nor detector functions with lessons.
function assertLocalConsequence(entry: Lesson, scenario: Scenario) {
  if (entry.id === 'naked-single') {
    expect(scenario.candidates[scenario.target]).toEqual([scenario.digit])
    return
  }
  if (entry.id === 'hidden-single') {
    const places = scenario.evidence.filter(cell => scenario.candidates[cell].includes(scenario.digit))
    expect(places).toEqual([scenario.target])
    expect(units).toContainEqual(scenario.evidence)
    return
  }
  if (entry.id === 'locked-candidates') {
    expect(units).toContainEqual(scenario.evidence)
    const places = scenario.evidence.filter(cell => scenario.candidates[cell].includes(scenario.digit))
    expect(places.length).toBeGreaterThanOrEqual(2)
    expect(scenario.evidence).not.toContain(scenario.target)
    for (const place of places) expect(peers(place, scenario.target)).toBe(true)
    return
  }
  let variables: { cell: number; digit: number }[][]
  if (entry.id === 'x-wing' || entry.id === 'swordfish') {
    const size = entry.id === 'x-wing' ? 2 : 3
    const bases = [rows, columns].map(lines => lines.filter(line => line.every(cell => scenario.evidence.includes(cell))))
      .find(lines => lines.length === size)!
    expect(bases).toHaveLength(size)
    variables = bases.map(line => line.filter(cell => scenario.candidates[cell].includes(scenario.digit))
      .map(cell => ({ cell, digit: scenario.digit })))
  } else {
    variables = scenario.evidence.map(cell => scenario.candidates[cell].map(digit => ({ cell, digit })))
  }
  let validBranches = 0
  function enumerate(index: number, chosen: { cell: number; digit: number }[]) {
    if (index === variables.length) {
      validBranches++
      // Every locally consistent branch forbids the target candidate.
      expect(chosen.some(value => value.digit === scenario.digit && peers(value.cell, scenario.target)), scenario.id).toBe(true)
      return
    }
    for (const value of variables[index]) {
      if (chosen.every(other => other.digit !== value.digit || !peers(other.cell, value.cell))) enumerate(index + 1, [...chosen, value])
    }
  }
  enumerate(0, [])
  expect(validBranches, `Nonvacuous proof: ${scenario.id}`).toBeGreaterThan(0)
}

describe('curriculum proof audit', () => {
  it('contains exactly eight ordered techniques and sixteen distinct scenarios', () => {
    expect(LESSONS.map(entry => entry.id)).toEqual(['naked-single', 'hidden-single', 'locked-candidates', 'naked-pair', 'naked-triple', 'x-wing', 'swordfish', 'xy-wing'])
    const scenarios = LESSONS.flatMap(entry => entry.scenarios)
    expect(scenarios).toHaveLength(16)
    expect(new Set(scenarios.map(scenario => scenario.id)).size).toBe(16)
    expect(new Set(scenarios.map(scenario => JSON.stringify([scenario.board, scenario.candidates]))).size).toBe(16)
    expect(Object.keys(WITNESSES).sort()).toEqual(scenarios.map(scenario => scenario.id).sort())
    for (const entry of LESSONS) {
      expect(entry.rule.length).toBeGreaterThan(70)
      expect(entry.prerequisites.length).toBeGreaterThan(0)
      expect(entry.steps.length).toBeGreaterThanOrEqual(3)
    }
  })
  for (const entry of LESSONS) for (const scenario of entry.scenarios) {
    it(`${scenario.id} has a full consistent completion preserved by its action`, () => assertWitness(scenario))
    it(`${scenario.id} follows from all local branches without a solution lookup`, () => assertLocalConsequence(entry, scenario))
    it(`${scenario.id} still validates after transposition and digit permutation`, () => {
      const transformed = clone(scenario)
      const transpose = (cell: number) => cell % 9 * 9 + Math.floor(cell / 9)
      const permute = (digit: number) => digit === 0 ? 0 : digit % 9 + 1
      for (const cell of cells) {
        transformed.board[transpose(cell)] = permute(scenario.board[cell])
        transformed.candidates[transpose(cell)] = scenario.candidates[cell].map(permute)
      }
      transformed.evidence = scenario.evidence.map(transpose)
      transformed.target = transpose(scenario.target)
      transformed.digit = permute(scenario.digit)
      expect(validateScenario(entry, transformed)).toBe(true)
    })
  }
})

describe('diagram integrity', () => {
  it('rejects malformed arrays, conflicting givens, illegal and duplicated candidates', () => {
    const entry = lesson('naked-single')
    const original = entry.scenarios[0]
    const corruptions: ((scenario: Scenario) => void)[] = [
      scenario => { scenario.board.pop() },
      scenario => { scenario.candidates.pop() },
      scenario => { scenario.candidates[scenario.target] = [] },
      scenario => { scenario.candidates[scenario.target].push(scenario.digit) },
      scenario => { scenario.candidates[scenario.target].push(10) },
      scenario => { scenario.board[1] = scenario.board[0] },
      scenario => { scenario.target = 81 },
      scenario => { scenario.digit = 0 },
      scenario => { scenario.evidence.push(scenario.evidence[0]) },
    ]
    for (const corrupt of corruptions) {
      const scenario = clone(original)
      corrupt(scenario)
      expect(validateScenario(entry, scenario)).toBe(false)
    }
  })
  it('rejects inconsistent authored examples before accepting the expected click', () => {
    const scenario = clone(lesson('xy-wing').scenarios[0])
    scenario.candidates[70] = [2]
    scenario.candidates[71] = [2]
    expect(evaluateLesson(scenario, { cell: scenario.target, digit: scenario.digit, kind: scenario.kind }).correct).toBe(false)
  })
  it('requires the requested action kind and cell, not only the expected digit', () => {
    for (const entry of LESSONS) for (const scenario of entry.scenarios) {
      expect(evaluateLesson(scenario, { cell: scenario.target, digit: scenario.digit, kind: scenario.kind === 'place' ? 'eliminate' : 'place' }).correct).toBe(false)
      expect(evaluateLesson(scenario, { cell: (scenario.target + 1) % 81, digit: scenario.digit, kind: scenario.kind }).correct).toBe(false)
    }
  })
  it('rejects a globally inconsistent candidate state even when every unit has every digit available', () => {
    const entry = lesson('xy-wing')
    const scenario = clone(entry.scenarios[0])
    scenario.candidates[70] = [2]
    scenario.candidates[71] = [2]
    for (const unit of units) for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      expect(unit.some(cell => scenario.candidates[cell].includes(digit))).toBe(true)
    }
    expect(validateScenario(entry, scenario)).toBe(false)
  })
})

describe('XY-Wing lesson', () => {
  it('teaches pivot branches with line visibility and with box visibility', () => checkExamples('xy-wing'))
  it('rejects a target that sees just one wing', () => {
    const entry = lesson('xy-wing')
    const scenario = clone(entry.scenarios[0])
    scenario.target = 8
    expect(validateScenario(entry, scenario)).toBe(false)
  })
  it('rejects a three-candidate pivot and a wing that cannot see the pivot', () => {
    const entry = lesson('xy-wing')
    const scenario = clone(entry.scenarios[0])
    scenario.candidates[scenario.evidence[0]].push(scenario.digit)
    expect(validateScenario(entry, scenario)).toBe(false)
    Object.assign(scenario, clone(entry.scenarios[0]))
    scenario.candidates[80] = [...scenario.candidates[scenario.evidence[2]]]
    scenario.evidence[2] = 80
    expect(validateScenario(entry, scenario)).toBe(false)
  })
  it('requires a single shared wing digit absent from the pivot', () => {
    const entry = lesson('xy-wing')
    const scenario = clone(entry.scenarios[0])
    scenario.candidates[scenario.evidence[2]] = [...scenario.candidates[scenario.evidence[1]]]
    expect(validateScenario(entry, scenario)).toBe(false)
  })
})

describe('Swordfish lesson', () => {
  it('teaches six-location and seven-location fish in both orientations', () => checkExamples('swordfish'))
  it('rejects a fourth crossing line in the full base census', () => {
    const entry = lesson('swordfish')
    for (const original of entry.scenarios) {
      const scenario = clone(original)
      scenario.candidates[1].push(scenario.digit)
      expect(validateScenario(entry, scenario)).toBe(false)
    }
  })
  it('does not accept three highlighted corners or a placement', () => {
    const entry = lesson('swordfish')
    const scenario = clone(entry.scenarios[0])
    scenario.evidence = scenario.evidence.slice(0, 3)
    expect(validateScenario(entry, scenario)).toBe(false)
    Object.assign(scenario, clone(entry.scenarios[0]), { kind: 'place' })
    expect(validateScenario(entry, scenario)).toBe(false)
  })
})

describe('X-Wing lesson', () => {
  it('teaches row-base and column-base rectangles', () => checkExamples('x-wing'))
  it('rejects one extra base occurrence outside the two covers', () => {
    const entry = lesson('x-wing')
    for (const original of entry.scenarios) {
      const scenario = clone(original)
      const extra = scenario.id.endsWith('-1') ? 0 : 2
      scenario.candidates[extra].push(scenario.digit)
      expect(validateScenario(entry, scenario)).toBe(false)
    }
  })
  it('requires a cover target outside the bases and the entire base census', () => {
    const entry = lesson('x-wing')
    const scenario = clone(entry.scenarios[0])
    scenario.target = 72
    expect(validateScenario(entry, scenario)).toBe(false)
    scenario.target = entry.scenarios[0].target
    scenario.evidence.pop()
    expect(validateScenario(entry, scenario)).toBe(false)
  })
})

describe('naked triple lesson', () => {
  it('uses three-cell unions, including a triple made of bivalue cells', () => checkExamples('naked-triple'))
  it('rejects a union with a fourth digit', () => {
    const entry = lesson('naked-triple')
    const scenario = clone(entry.scenarios[0])
    scenario.candidates[scenario.evidence[1]].push(9)
    expect(validateScenario(entry, scenario)).toBe(false)
  })
  it('requires exactly three distinct protecting cells', () => {
    const entry = lesson('naked-triple')
    const scenario = clone(entry.scenarios[0])
    scenario.evidence[2] = scenario.evidence[0]
    expect(validateScenario(entry, scenario)).toBe(false)
  })
})

describe('naked pair lesson', () => {
  it('reserves two digits in a row and in a box', () => checkExamples('naked-pair'))
  it('rejects a third digit in either protecting cell', () => {
    const entry = lesson('naked-pair')
    const scenario = clone(entry.scenarios[0])
    scenario.candidates[scenario.evidence[0]].push(4)
    expect(validateScenario(entry, scenario)).toBe(false)
  })
  it('does not mislabel a singleton plus a bivalue cell as the taught identical pair', () => {
    const entry = lesson('naked-pair')
    const scenario = clone(entry.scenarios[0])
    scenario.candidates[scenario.evidence[0]] = [2]
    expect(validateScenario(entry, scenario)).toBe(false)
  })
  it('requires every subset cell to be empty rather than counting a filled cell as a premise', () => {
    const entry = lesson('naked-pair')
    const scenario = clone(entry.scenarios[0])
    scenario.board[scenario.evidence[0]] = 9
    scenario.candidates[scenario.evidence[0]] = []
    for (let cell = 0; cell < 81; cell++) {
      if (cell === 0 || Math.floor(cell / 9) === 0 || cell % 9 === 0 || (Math.floor(cell / 9) < 3 && cell % 9 < 3)) {
        scenario.candidates[cell] = scenario.candidates[cell].filter(digit => digit !== 9)
      }
    }
    expect(validateScenario(entry, scenario)).toBe(false)
  })
  it('requires a shared unit and an outside target', () => {
    const entry = lesson('naked-pair')
    const scenario = clone(entry.scenarios[0])
    scenario.target = 80
    expect(validateScenario(entry, scenario)).toBe(false)
    scenario.target = scenario.evidence[0]
    expect(validateScenario(entry, scenario)).toBe(false)
  })
})

describe('locked candidates lesson', () => {
  it('teaches pointing from a box and claiming from a column', () => checkExamples('locked-candidates'))
  it('requires every source occurrence to stay in the intersection', () => {
    const entry = lesson('locked-candidates')
    for (const original of entry.scenarios) {
      const scenario = clone(original)
      const extra = scenario.id.endsWith('-1') ? 9 : 4
      scenario.candidates[extra].push(scenario.digit)
      expect(validateScenario(entry, scenario), scenario.id).toBe(false)
    }
  })
  it('does not eliminate inside the source pattern', () => {
    const entry = lesson('locked-candidates')
    const scenario = clone(entry.scenarios[0])
    scenario.target = scenario.evidence.find(cell => scenario.candidates[cell].includes(scenario.digit))!
    expect(validateScenario(entry, scenario)).toBe(false)
  })
})

describe('hidden single lesson', () => {
  it('teaches the only location for a digit, in a row and in a box', () => checkExamples('hidden-single'))
  for (const [index, scenario] of lesson('hidden-single').scenarios.entries()) {
    it(`${scenario.id} derives a genuine hidden single from a compact original clue board`, () => {
      // Derive legality independently from the givens, not the lesson validator
      // or any hand-pruned candidate domains.
      const legal = cells.map(cell => scenario.board[cell] ? [] :
        [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(digit =>
          !cells.some(other => peers(cell, other) && scenario.board[other] === digit)))
      const givens = scenario.board.filter(Boolean).length
      expect(givens).toBeGreaterThanOrEqual(24)
      expect(givens).toBeLessThanOrEqual(45)
      expect(scenario.candidates).toEqual(legal)
      expect(scenario.board[scenario.target]).toBe(0)
      expect(scenario.kind).toBe('place')
      const unit = (index === 0 ? rows : boxes).find(unit =>
        unit.length === scenario.evidence.length && unit.every(cell => scenario.evidence.includes(cell)))
      expect(unit, 'Evidence must contain the complete row / box').toBeDefined()
      const empty = unit!.filter(cell => !scenario.board[cell])
      expect(empty.length).toBeGreaterThanOrEqual(3)
      for (const cell of empty) {
        // Every displayed list in the relevant unit remains small, and no
        // naked single distracts from the only-location deduction.
        expect(legal[cell].length, `cell ${cell}`).toBeGreaterThanOrEqual(2)
        expect(legal[cell].length, `cell ${cell}`).toBeLessThanOrEqual(4)
      }
      expect(unit!.filter(cell => legal[cell].includes(scenario.digit))).toEqual([scenario.target])
      const unitName = index === 0 ? `row ${Math.floor(scenario.target / 9) + 1}` :
        `box ${Math.floor(scenario.target / 27) * 3 + Math.floor(scenario.target % 9 / 3) + 1}`
      expect(scenario.prompt).toContain(unitName)
      expect(scenario.proof).toContain(unitName)
      expect(scenario.proof).toContain(`row ${Math.floor(scenario.target / 9) + 1}, column ${scenario.target % 9 + 1}`)
      // Uniqueness and the action must follow from actual clues even when
      // the independent oracle receives no authored candidate arrays.
      const solved = enumerate(scenario.board)
      expect(solved.count).toBe(1)
      expect(solved.first[scenario.target]).toBe(scenario.digit)
      const opposite = legal.map(list => [...list])
      opposite[scenario.target] = opposite[scenario.target].filter(digit => digit !== scenario.digit)
      expect(enumerate(scenario.board, opposite, 1).count).toBe(0)
    })
  }
  it('rejects a second candidate location even when the target is unchanged', () => {
    const entry = lesson('hidden-single')
    const scenario = clone(entry.scenarios[0])
    const other = scenario.evidence.find(cell => cell !== scenario.target)!
    scenario.candidates[other].push(scenario.digit)
    expect(validateScenario(entry, scenario)).toBe(false)
  })
})

describe('naked single lesson', () => {
  it('teaches one remaining cell candidate in two different contexts', () => checkExamples('naked-single'))
  it('rejects an extra candidate rather than trusting the authored answer', () => {
    const entry = lesson('naked-single')
    const scenario = clone(entry.scenarios[0])
    scenario.board = Array<number>(81).fill(0)
    scenario.candidates = Array.from({ length: 81 }, () => [1, 2, 3, 4, 5, 6, 7, 8, 9])
    scenario.candidates[scenario.target] = [scenario.digit, scenario.digit % 9 + 1]
    expect(validateScenario(entry, scenario)).toBe(false)
  })
})
