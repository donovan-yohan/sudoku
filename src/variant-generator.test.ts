import { describe, expect, it } from 'vitest'
import { availableDifficulties, generateVariant, UnsupportedVariantDifficultyError } from './variant-generator'
import { countVariantSolutions, nextVariantDeduction, rateVariant, variantCandidates } from './variant-engine'
import type { GameVariant, Rules } from './variant-engine'
import type { Difficulty } from './types'
import certifiedSeeds from './variant-seeds.json'
// @ts-expect-error Independent audit implementation deliberately stays plain JavaScript.
import { oracle } from '../scripts/variant-oracle.mjs'

const variants: GameVariant[] = ['classic', 'x', 'killer']
const matrix = variants.flatMap(variant => availableDifficulties(variant).map(difficulty => ({ variant, difficulty })))

describe('independent certification and logical replay', () => {
  it('certifies every fallback and replays every claimed step against the real witness', () => {
    const techniquesChecked = new Set<string>()
    for (const template of certifiedSeeds) {
      const rules: Rules = { variant: template.variant as GameVariant, ...('cages' in template && template.cages ? { cages: template.cages } : {}) }
      const proof = oracle(template.givens, rules, { maxWork: 100_000_000 })
      expect(proof, template.id).toMatchObject({ unique: true, first: template.solution })
      const rating = rateVariant(template.givens, rules)
      expect(rating, template.id).toMatchObject({ solved: true, difficulty: template.difficulty, lowerTierStalled: true })
      const values = template.givens.slice(), allowed = Array.from({ length: 81 }, () => [1, 2, 3, 4, 5, 6, 7, 8, 9])
      const cap = ['beginner', 'intermediate', 'advanced', 'expert'].indexOf(template.difficulty)
      for (const step of rating.trace) {
        expect(nextVariantDeduction(values, rules, allowed, { maxTier: cap })).toEqual(step)
        const legal = variantCandidates(values, rules, allowed)
        for (let c = 0; c < 81; c++) if (!values[c]) expect(legal[c]).toContain(template.solution[c])
        for (const { cell, digit } of step.placements) expect(digit).toBe(template.solution[cell])
        for (const { cell, digit } of step.eliminations) expect(digit).not.toBe(template.solution[cell])
        if (!techniquesChecked.has(step.technique)) {
          techniquesChecked.add(step.technique)
          for (const { cell, digit } of step.eliminations.slice(0, 1)) {
            const forced = values.slice(); forced[cell] = digit
            expect(oracle(forced, rules, { maxWork: 100_000_000 })).toMatchObject({ count: 0, exhausted: false })
          }
          for (const { cell, digit } of step.placements.slice(0, 1)) for (const opposite of legal[cell].filter(d => d !== digit)) {
            const forced = values.slice(); forced[cell] = opposite
            expect(oracle(forced, rules, { maxWork: 100_000_000 })).toMatchObject({ count: 0, exhausted: false })
          }
        }
        for (const { cell, digit } of step.placements) values[cell] = digit
        for (const { cell, digit } of step.eliminations) allowed[cell] = allowed[cell].filter(d => d !== digit)
      }
      expect(values).toEqual(template.solution)
    }
    expect([...techniquesChecked]).toEqual(expect.arrayContaining(['diagonal-single', 'cage-sum-single', 'cage-pair-sum', 'cage-combinations', 'unit-sum-45', 'x-wing', 'xy-wing']))
  }, 60_000)
  it.each(matrix)('produces a genuinely exact-rated $variant $difficulty, reproducibly', ({ variant, difficulty }) => {
    for (const seed of ['2026-01-01', '2099-12-31', 'practice:☃:123']) {
      const puzzle = generateVariant(seed, variant, difficulty)
      const rules: Rules = { variant, ...(puzzle.cages ? { cages: puzzle.cages } : {}) }
      expect(puzzle.rating).toMatchObject({ solved: true, difficulty })
      expect(oracle(puzzle.givens, rules, { maxWork: 100_000_000 })).toMatchObject({ unique: true, first: puzzle.solution })
      expect(generateVariant(seed, variant, difficulty)).toEqual(puzzle)
      if (puzzle.origin.kind === 'certified-template') {
        expect(puzzle.origin.templateId).toBeTruthy()
        expect(puzzle.origin.fallbackReason).toBeTruthy()
      }
    }
  }, 60_000)
  it.each(variants)('keeps broad %s beginner seeds original and accessible', variant => {
    const fingerprints = new Set<string>()
    for (let n = 0; n < 12; n++) {
      const puzzle = generateVariant(`beginner-sweep:${n}`, variant, 'beginner')
      const rules: Rules = { variant, ...(puzzle.cages ? { cages: puzzle.cages } : {}) }
      expect(puzzle.origin.kind).toBe('generated')
      expect(puzzle.rating.approachability.accepted).toBe(true)
      expect(oracle(puzzle.givens, rules)).toMatchObject({ unique: true, first: puzzle.solution })
      fingerprints.add(JSON.stringify([puzzle.givens, puzzle.cages]))
    }
    expect(fingerprints.size).toBe(12)
  }, 60_000)
  it('uses the unchanged classic catalog helper for classic fallback and re-rates its result', () => {
    const puzzle = generateVariant('benchmark:0', 'classic', 'advanced')
    expect(puzzle.origin.kind).toBe('certified-template')
    expect(puzzle.origin.templateId).toMatch(/^original-catalog-v1:helper:/)
    expect(puzzle.rating).toMatchObject({ solved: true, difficulty: 'advanced', lowerTierStalled: true })
  })
  it('validates request shape without date or clock-dependent behavior', () => {
    expect(() => generateVariant('a'.repeat(4097), 'classic', 'beginner')).toThrow(TypeError)
    expect(() => generateVariant('a', 'bad' as GameVariant, 'beginner')).toThrow(TypeError)
    expect(() => generateVariant('a', 'classic', 'wrong' as Difficulty)).toThrow(TypeError)
    expect(() => generateVariant(undefined as unknown as string, 'classic', 'beginner')).toThrow(TypeError)
  })
})

describe('seed-driven generation', () => {
  it.each(['classic', 'x', 'killer'] as const)('creates deterministic approachable %s beginners from fresh MRV solutions', variant => {
    const a = generateVariant('2037-02-11', variant, 'beginner')
    expect(generateVariant('2037-02-11', variant, 'beginner')).toEqual(a)
    expect(a.origin.kind).toBe('generated')
    expect(a.rating).toMatchObject({ solved: true, difficulty: 'beginner', approachability: { accepted: true } })
    expect(countVariantSolutions(a.givens, { variant, ...(a.cages ? { cages: a.cages } : {}) })).toMatchObject({ unique: true, first: a.solution })
    if (variant === 'killer') {
      expect(a.givens.every(d => d === 0)).toBe(true)
      expect(a.cages!.every(c => c.cells.length <= 2)).toBe(true)
      expect(a.cages!.filter(c => c.cells.length === 1).length).toBeGreaterThanOrEqual(25)
    } else {
      expect(a.givens.filter(Boolean)).toHaveLength(45)
      expect(a.techniques).toEqual(['naked-single'])
    }
    expect(generateVariant('2037-02-12', variant, 'beginner').solution).not.toEqual(a.solution)
  }, 30_000)
  it('advertises only proven tiers and rejects unsupported requests explicitly', () => {
    expect(availableDifficulties('classic')).toEqual(['beginner', 'intermediate', 'advanced', 'expert'])
    expect(availableDifficulties('x')).toEqual(['beginner', 'intermediate', 'advanced'])
    expect(availableDifficulties('killer')).toEqual(['beginner', 'intermediate', 'advanced'])
    expect(() => generateVariant('date', 'x', 'expert')).toThrow(UnsupportedVariantDifficultyError)
    expect(() => generateVariant('date', 'killer', 'expert')).toThrow(/not supported/)
  })
})
