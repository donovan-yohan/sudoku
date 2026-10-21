import { describe, expect, it } from 'vitest'
import { countVariantSolutions, nextVariantDeduction, rateVariant, solveVariant, validateVariantRules, variantCandidates, variantPeers } from './variant-engine'
import type { Rules } from './variant-engine'
import certifiedSeeds from './variant-seeds.json'
// @ts-expect-error Independent audit implementation deliberately stays plain JavaScript.
import { oracle } from '../scripts/variant-oracle.mjs'

const blank = () => Array<number>(81).fill(0)
const solution = [...'123456789456789123789123456234567891567891234891234567345678912678912345912345678'].map(Number)
const singletonRules = () => ({ variant: 'killer' as const, cages: solution.map((sum, cell) => ({ sum, cells: [cell] })) })

// Local premises deliberately do not call the production candidate/deduction engine.
function exclusionNotes(values: number[], rules: Rules, allowed = values.map(() => [1, 2, 3, 4, 5, 6, 7, 8, 9])): number[][] {
  return values.map((value, cell) => value ? [] : allowed[cell].filter(digit => !values.some((other, peer) => {
    if (other !== digit) return false
    const row = Math.floor(cell / 9), col = cell % 9, r = Math.floor(peer / 9), c = peer % 9
    return row === r || col === c || (Math.floor(row / 3) === Math.floor(r / 3) && Math.floor(col / 3) === Math.floor(c / 3))
      || (rules.variant === 'x' && ((row === col && r === c) || (row + col === 8 && r + c === 8)))
      || !!rules.cages?.some(cage => cage.cells.includes(cell) && cage.cells.includes(peer))
  })))
}
function hasTierZeroPremise(values: number[], rules: Rules, notes: number[][]): boolean {
  if (notes.some(list => list.length === 1)) return true
  return (rules.cages ?? []).some(cage => {
    const blanks = cage.cells.filter(cell => !values[cell])
    if (blanks.length === 1) return true
    if (blanks.length !== 2) return false
    const [a, b] = blanks, remaining = cage.sum - cage.cells.reduce((sum, cell) => sum + values[cell], 0)
    const pairs = notes[a].flatMap(x => notes[b].filter(y => x !== y && x + y === remaining).map(y => [x, y]))
    return pairs.length > 0 && (notes[a].some(d => !pairs.some(pair => pair[0] === d)) || notes[b].some(d => !pairs.some(pair => pair[1] === d)))
  })
}

describe('logical proof and approachability', () => {
  it('prefers tier-zero cage arithmetic over an available classic hidden single at every cap', () => {
    const template = certifiedSeeds.find(t => t.id === 'original-catalog-v1:intermediate:0')!
    const rules: Rules = { variant: 'killer', cages: template.solution.map((sum, cell) => ({ sum, cells: [cell] })) }
    const values = template.givens.slice(), notes = exclusionNotes(values, rules)
    expect(notes.every(list => list.length !== 1)).toBe(true)
    expect(notes[0]).toContain(4)
    expect(notes[0].length).toBeGreaterThan(1)
    // A genuine competing hidden single: independently enumerate all 27 units.
    const units = Array.from({ length: 27 }, (_, u) => Array.from({ length: 9 }, (_, k) => u < 9 ? u * 9 + k : u < 18 ? k * 9 + u - 9 : Math.floor((u - 18) / 3) * 27 + (u - 18) % 3 * 3 + Math.floor(k / 3) * 9 + k % 3))
    expect(units.some(unit => Array.from({ length: 9 }, (_, k) => k + 1).some(digit => unit.filter(cell => notes[cell].includes(digit)).length === 1))).toBe(true)
    expect(rules.cages![0]).toEqual({ cells: [0], sum: 4 })
    const expected = { technique: 'cage-sum-single', cells: [0], digit: 4, placements: [{ cell: 0, digit: 4 }] }
    expect(nextVariantDeduction(values, rules, undefined, { maxTier: 0 })).toMatchObject(expected)
    expect(nextVariantDeduction(values, rules)).toMatchObject(expected)
    for (const maxTier of [1, 2, 3]) expect(nextVariantDeduction(values, rules, undefined, { maxTier })).toMatchObject(expected)
  })
  it('uses available tier-zero premises before higher tiers throughout a rated Killer trace', () => {
    const template = certifiedSeeds.find(t => t.id === 'spike:killer:advanced:feasibility-0:advanced')!
    const rules: Rules = { variant: 'killer', cages: 'cages' in template ? template.cages! : [] }
    const rating = rateVariant(template.givens, rules)
    expect(rating.solved).toBe(true)
    const values = template.givens.slice(), allowed = values.map(() => [1, 2, 3, 4, 5, 6, 7, 8, 9])
    let premisesChecked = 0
    for (const step of rating.trace) {
      if (hasTierZeroPremise(values, rules, exclusionNotes(values, rules, allowed))) {
        premisesChecked++
        expect(['naked-single', 'cage-sum-single', 'cage-pair-sum'], JSON.stringify(step)).toContain(step.technique)
      }
      for (const { cell, digit } of step.placements) values[cell] = digit
      for (const { cell, digit } of step.eliminations) allowed[cell] = allowed[cell].filter(d => d !== digit)
    }
    expect(premisesChecked).toBeGreaterThan(0)
    expect(values).toEqual(template.solution)
  }, 30_000)
  it('exposes cage arithmetic instead of hiding it inside a naked single', () => {
    const rules = singletonRules()
    expect(nextVariantDeduction(blank(), rules)).toMatchObject({ technique: 'cage-sum-single', cells: [0], digit: 1 })
    const rating = rateVariant(blank(), rules)
    expect(rating).toMatchObject({ solved: true, difficulty: 'beginner', approachability: { accepted: true, givens: 0, singletonCages: 81 } })
    expect(rating.trace.some(s => s.technique === 'cage-sum-single')).toBe(true)
    expect(rating.trace.every(s => s.explanation.length > 15)).toBe(true)
  })
  it('does not label a sparse naked-only board approachable beginner', () => {
    const rating = rateVariant(solution.map((d, c) => c < 9 ? 0 : d), { variant: 'classic' })
    expect(rating.solved).toBe(true)
    expect(rating.difficulty).toBeNull()
    expect(rating.approachability.accepted).toBe(false)
  })
})

describe('adversarial controls', () => {
  it.each(['classic', 'x'] as const)('rejects cage metadata on %s instead of silently ignoring it', variant => {
    const template = certifiedSeeds.find(t => t.variant === variant)!
    const rules: Rules = { variant, cages: [{ cells: [0], sum: template.solution[0] }] }
    expect(() => validateVariantRules(rules)).toThrow('Cages require the Killer variant')
    expect(oracle(template.solution, { variant })).toMatchObject({ count: 1, exhausted: false, unique: true, first: template.solution })
    expect(oracle(template.solution, rules)).toMatchObject({ count: 0, exhausted: false, unique: false, first: null })
  })
  it.each([
    { label: 'missing cells', alter: (r: ReturnType<typeof singletonRules>) => { r.cages.pop() } },
    { label: 'duplicate coverage', alter: (r: ReturnType<typeof singletonRules>) => { r.cages[1].cells = [0] } },
    { label: 'duplicate within cage', alter: (r: ReturnType<typeof singletonRules>) => { r.cages[0] = { sum: 3, cells: [0, 0] } } },
    { label: 'disconnected cage', alter: (r: ReturnType<typeof singletonRules>) => { r.cages = r.cages.filter(c => c.cells[0] !== 0 && c.cells[0] !== 80); r.cages.push({ sum: 9, cells: [0, 80] }) } },
    { label: 'impossible sum', alter: (r: ReturnType<typeof singletonRules>) => { r.cages[0].sum = 10 } },
  ])('rejects $label before running search', ({ alter }) => {
    const rules = singletonRules(); alter(rules)
    expect(() => validateVariantRules(rules)).toThrow(TypeError)
    expect(oracle(blank(), rules).count).toBe(0)
  })
  it('adds Killer peers beyond ordinary units and rejects their repeated digits', () => {
    const path = [0, 1, 10, 19, 28, 37]
    expect(new Set(path.map(cell => solution[cell])).size).toBe(path.length)
    const rules: Rules = { variant: 'killer', cages: [
      { sum: path.reduce((sum, cell) => sum + solution[cell], 0), cells: path },
      ...solution.flatMap((sum, cell) => !path.includes(cell) ? [{ sum, cells: [cell] }] : []),
    ] }
    validateVariantRules(rules)
    expect(variantPeers(0, { variant: 'classic' })).not.toContain(37)
    expect(variantPeers(0, rules)).toContain(37)
    // Establish a real satisfiable partition before adding the non-peer repeat.
    expect(oracle(solution, rules, { maxWork: 100_000 })).toMatchObject({ unique: true, first: solution, exhausted: false })
    const values = blank(); values[0] = 1; values[37] = 1
    expect(countVariantSolutions(values, rules)).toMatchObject({ count: 0, status: 'invalid', unique: false })
    expect(oracle(values, rules, { maxWork: 100_000 })).toMatchObject({ count: 0, unique: false, exhausted: false })
    expect(nextVariantDeduction(values, rules)).toBeNull()
  })
  it('rejects a non-peer cage repeat even when every ordinary unit and cage sum is valid', () => {
    // Swapping two rows within a band is another classic solution. This cage
    // partition accepts the swap but gives the original a repeated 7 at 6/12.
    const witness = [...solution.slice(9, 18), ...solution.slice(0, 9), ...solution.slice(18)]
    const groups = [[0, 9], [8, 17], [1, 10], [7, 16], [2, 11], [3, 4, 5, 6, 12], [13, 14, 15]]
    const rules: Rules = { variant: 'killer', cages: [
      ...groups.map(cells => ({ cells, sum: cells.reduce((sum, cell) => sum + witness[cell], 0) })),
      ...witness.flatMap((sum, cell) => cell >= 18 ? [{ cells: [cell], sum }] : []),
    ] }
    validateVariantRules(rules)
    expect(variantPeers(6, { variant: 'classic' })).not.toContain(12)
    expect(solution[6]).toBe(solution[12])
    for (const cage of rules.cages!) expect(cage.cells.reduce((sum, cell) => sum + solution[cell], 0)).toBe(cage.sum)
    expect(oracle(witness, rules, { maxWork: 100_000 })).toMatchObject({ unique: true, exhausted: false, first: witness })
    expect(oracle(solution, { variant: 'classic' }, { maxWork: 100_000 })).toMatchObject({ unique: true, exhausted: false, first: solution })
    expect(oracle(solution, rules, { maxWork: 100_000 })).toMatchObject({ count: 0, unique: false, exhausted: false })
    expect(countVariantSolutions(solution, rules)).toMatchObject({ count: 0, status: 'invalid' })
  })
  it('rejects complete wrong sums and diagonal contradictions', () => {
    const rules = singletonRules(); rules.cages[0].sum = 2
    expect(countVariantSolutions(solution, rules)).toMatchObject({ status: 'invalid', count: 0 })
    expect(oracle(solution, rules).count).toBe(0)
    const values = blank(); values[0] = 1; values[40] = 1
    expect(countVariantSolutions(values, { variant: 'x' })).toMatchObject({ status: 'invalid' })
    expect(nextVariantDeduction(values, { variant: 'x' })).toBeNull()
  })
  it('does not call a first solution or budget-limited partial count unique', () => {
    const once = solveVariant(blank(), { variant: 'classic' })
    expect(once).toMatchObject({ count: 1, status: 'solution-cap', unique: false, exhausted: false })
    const partial = countVariantSolutions(blank(), { variant: 'classic' }, { maxNodes: once.nodes })
    expect(partial).toMatchObject({ count: 1, status: 'budget-exhausted', unique: false, exhausted: true })
    expect(countVariantSolutions(blank(), { variant: 'classic' }, { maxWork: 0 })).toMatchObject({ status: 'budget-exhausted' })
    expect(() => countVariantSolutions(blank(), { variant: 'classic' }, { maxWork: NaN })).toThrow(TypeError)
    expect(rateVariant(blank(), { variant: 'classic' }, { maxWork: 0 })).toMatchObject({ status: 'budget-exhausted', difficulty: null })
    expect(oracle(blank(), { variant: 'classic' }, { maxWork: 0 })).toMatchObject({ exhausted: true, unique: false })
  })
  it('preserves both multicell Killer completions and resolves a partially assigned cage without over-pruning', () => {
    const rules: Rules = { variant: 'killer', cages: Array.from({ length: 9 }, (_, row) => ({ sum: 45, cells: Array.from({ length: 9 }, (_, col) => row * 9 + col) })) }
    validateVariantRules(rules)
    const values = solution.map(d => d === 1 || d === 2 ? 0 : d)
    const swapped = solution.map(d => d === 1 ? 2 : d === 2 ? 1 : d)
    for (const witness of [solution, swapped]) {
      for (const cage of rules.cages!) {
        expect(cage.cells.reduce((sum, cell) => sum + witness[cell], 0)).toBe(cage.sum)
        expect(new Set(cage.cells.map(cell => witness[cell])).size).toBe(cage.cells.length)
      }
      expect(oracle(witness, rules, { maxWork: 100_000 })).toMatchObject({ count: 1, unique: true, exhausted: false, first: witness })
    }
    expect(oracle(values, rules, { limit: 3, maxWork: 100_000 })).toMatchObject({ count: 2, unique: false, exhausted: false })
    expect(countVariantSolutions(values, rules, { limit: 3 })).toMatchObject({ count: 2, unique: false, exhausted: false, status: 'complete' })
    const legal = variantCandidates(values, rules)
    const restricted = legal.map(list => list.slice()); restricted[0] = [1]
    for (let cell = 0; cell < 81; cell++) if (!values[cell]) {
      expect(legal[cell]).toEqual([1, 2])
      for (const digit of legal[cell]) {
        const forced = values.slice(); forced[cell] = digit
        expect(oracle(forced, rules, { maxWork: 100_000 })).toMatchObject({ count: 1, unique: true, exhausted: false, first: digit === solution[cell] ? solution : swapped })
      }
    }
    expect(variantCandidates(values, rules, restricted)[0]).toEqual([1])
    expect(variantCandidates(values, rules, restricted)[1]).toEqual([2])
    const partial = values.slice(); partial[0] = 1
    expect(rules.cages![0].cells.reduce((sum, cell) => sum + partial[cell], 0)).toBe(43)
    expect(variantCandidates(partial, rules)[1]).toEqual([2])
    expect(countVariantSolutions(partial, rules)).toMatchObject({ unique: true, first: solution })
    expect(oracle(partial, rules, { maxWork: 100_000 })).toMatchObject({ unique: true, exhausted: false, first: solution })
  }, 30_000)
  it('retains every digit of two independent completions, including explicit allowed intersections', () => {
    const values = solution.map(d => d === 1 || d === 2 ? 0 : d), rules: Rules = { variant: 'classic' }
    const legal = variantCandidates(values, rules)
    const proof = oracle(values, rules)
    expect(proof.count).toBe(2)
    const swapped = solution.map(d => d === 1 ? 2 : d === 2 ? 1 : d)
    for (const completion of [solution, swapped]) for (let c = 0; c < 81; c++) if (!values[c]) expect(legal[c]).toContain(completion[c])
    expect(variantCandidates(values, rules, legal)).toEqual(legal)
    expect(() => variantCandidates(values, rules, [[]])).toThrow(TypeError)
    expect(countVariantSolutions(Array(80).fill(0), rules)).toMatchObject({ status: 'invalid' })
  })
})

describe('variant constraints and bounded search', () => {
  it('adds only actual diagonal and cage peers without mutating topology', () => {
    expect(variantPeers(0, { variant: 'classic' })).not.toContain(40)
    expect(variantPeers(0, { variant: 'x' })).toContain(40)
    const peers = variantPeers(0, { variant: 'x' }); peers.length = 0
    expect(variantPeers(0, { variant: 'x' })).toHaveLength(26)
  })
  it('retains a known completion and proves singleton Killer uniqueness', () => {
    const rules = singletonRules()
    expect(variantCandidates(blank(), rules)).toEqual(solution.map(d => [d]))
    const result = countVariantSolutions(blank(), rules)
    expect(result).toMatchObject({ count: 1, status: 'complete', exhausted: false, unique: true, first: solution })
    expect(countVariantSolutions(blank(), { variant: 'classic' }, { maxNodes: 0 })).toMatchObject({ status: 'budget-exhausted', unique: false, count: 0 })
    expect(countVariantSolutions(blank(), { variant: 'classic' })).toMatchObject({ count: 2, status: 'solution-cap', unique: false })
  })
})
