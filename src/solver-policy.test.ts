import { describe, expect, it } from 'vitest'
import { findDeduction } from './engine'
import { nextVariantDeduction, rateVariant } from './variant-engine'

const blank = () => Array<number>(81).fill(0)
const notes = () => Array.from({ length: 81 }, () => [1,2,3,4,5,6,7,8,9])

describe('one bounded logical policy', () => {
  it('does not execute or return a technique above the requested cap', () => {
    const domain = notes()
    domain[0] = [1,2]; domain[1] = [2,3]; domain[2] = [1,3]
    expect(findDeduction(blank(), domain, { maxTier: 1 })).toBeNull()
    expect(findDeduction(blank(), domain, { maxTier: 2 })?.technique).toBe('naked-triple')
  })
  it('charges classic detector work against a caller-owned shared budget', () => {
    expect(() => findDeduction(blank(), undefined, { maxWork: 0 })).toThrow(/budget/i)
    let spent = 0
    expect(() => findDeduction(blank(), undefined, { spend: amount => { spent += amount ?? 1; if (spent > 100) throw new Error('shared-budget') } })).toThrow('shared-budget')
    expect(spent).toBeGreaterThan(100)
  })
  it('uses the same deduction selection through classic and variant entry points', () => {
    const values = [...'300090026000405000001000907000009080000002000600070009000003000840200030700000002'].map(Number)
    expect(findDeduction(values)).toEqual(nextVariantDeduction(values, { variant: 'classic' }))
  })
  it('does not let a higher-tier classic step hide explicit tier-zero Killer arithmetic', () => {
    const solution = [...'123456789456789123789123456234567891567891234891234567345678912678912345912345678'].map(Number)
    expect(nextVariantDeduction(blank(), { variant: 'killer', cages: solution.map((sum, cell) => ({ sum, cells: [cell] })) })).toMatchObject({ technique: 'cage-sum-single' })
  })
  it('records actual solve workload separately from the selected difficulty', () => {
    const values = [...'123456789456789123789123456234567891567891234891234567345678912678912345912345678'].map(Number)
    values[0] = 0
    const rating = rateVariant(values, { variant: 'classic' })
    expect(rating.profile).toMatchObject({ steps: 1, placements: 1, eliminations: 0, hardestTier: 0, maxChainLinks: 0, techniqueCounts: { 'naked-single': 1 } })
    expect(rating.profile.work).toBeGreaterThan(0)
    expect(rating.rubric).toBe('logical-expert-v2')
  })
  it('exposes newly supported hidden pairs through the production selector', () => {
    const domain = notes()
    for (let cell = 0; cell < 9; cell++) if (cell !== 0 && cell !== 4) domain[cell] = domain[cell].filter(digit => digit !== 1 && digit !== 2)
    const step = nextVariantDeduction(blank(), { variant: 'classic' }, domain, { maxTier: 1 })
    expect(step).toMatchObject({ technique: 'hidden-pair', cells: [0,4] })
    expect(step!.eliminations).toContainEqual({ cell: 0, digit: 3 })
  })
})
