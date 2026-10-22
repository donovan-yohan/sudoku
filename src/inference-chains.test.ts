import { describe, expect, it } from 'vitest'
// @ts-expect-error independent standalone oracle has no declaration file
import { enumerate } from '../scripts/independent-oracle.mjs'
import { findChainDeduction, validateChainProof } from './inference-chains'
import type { Deduction } from './types'
import { LogicalBudgetError } from './solver-policy'

const all = Array.from({ length: 81 }, (_, c) => c)
const units = [
  ...Array.from({ length: 9 }, (_, r) => all.filter(c => Math.floor(c / 9) === r)),
  ...Array.from({ length: 9 }, (_, k) => all.filter(c => c % 9 === k)),
  ...Array.from({ length: 9 }, (_, b) => all.filter(c => Math.floor(c / 27) * 3 + Math.floor(c % 9 / 3) === b)),
]
const peers = all.map(c => all.filter(p => p !== c && units.some(u => u.includes(c) && u.includes(p))))
const coloringTrap = [1, 2, 4, 7, 8, 12, 13, 16, 17, 18, 21, 32, 33, 40, 44, 46, 51, 52, 56, 57, 64, 67, 68, 76, 78]
const singleDigit = (cells: number[]) => all.map(c => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => d !== 1 || cells.includes(c)))
const coord = (c: number) => `r${Math.floor(c / 9) + 1}c${c % 9 + 1}`
function independentlyCheck(notes: number[][], deduction: Deduction) {
  expect(enumerate(Array(81).fill(0), notes, 1).count, 'fixture must have a completion').toBe(1)
  expect(validateChainProof(notes, units, peers, deduction)).toBe(true)
  expect(deduction.eliminations.length).toBeGreaterThan(0)
  for (const removal of deduction.eliminations) {
    const restricted = notes.map(ns => [...ns])
    restricted[removal.cell] = [removal.digit]
    expect(enumerate(Array(81).fill(0), restricted, 1).count, `${coord(removal.cell)}=${removal.digit} must be impossible`).toBe(0)
    expect(deduction.explanation).toContain(coord(removal.cell))
  }
}

describe('bounded explainable inference chains', () => {
  it.each(['xy-chain', 'aic'] as const)('independently checks transposed and digit-relabelled %s deductions', technique => {
    const source = all.map(c => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => technique !== 'aic' || (
      !(d === 1 && c < 9 && c !== 7 && c !== 8) &&
      !(d === 2 && c % 9 === 8 && c !== 8 && c !== 17))))
    if (technique === 'xy-chain') [source[7], source[1], source[2], source[18]] = [[1, 2], [2, 3], [3, 4], [4, 1]]
    for (const transpose of [false, true]) {
      const notes = all.map(cell => source[transpose ? cell % 9 * 9 + Math.floor(cell / 9) : cell].map(digit => 10 - digit).sort((a, b) => a - b))
      const result = findChainDeduction(notes, units, peers, () => {}, { techniques: [technique] })
      expect(result?.technique).toBe(technique)
      independentlyCheck(notes, result!)
    }
  })
  it('rejects corrupted links, repeated nodes, false premises and unsupported conclusions', () => {
    const notes = singleDigit(coloringTrap)
    const result = findChainDeduction(notes, units, peers, () => {})!
    expect(validateChainProof(notes, units, peers, result)).toBe(true)
    const mutations: ((copy: Deduction) => void)[] = [
      copy => { copy.proof!.links[0].kind = 'weak' },
      copy => { copy.proof!.links[0].house = 26 },
      copy => { copy.proof!.links[0].to = { cell: 80, digit: 9 } },
      copy => { copy.proof!.links.push(...copy.proof!.links) },
      copy => { copy.proof!.links[copy.proof!.links.length - 1].to = { ...copy.proof!.links[0].from } },
      copy => { copy.eliminations = [{ ...copy.proof!.links[0].from }] },
      copy => { copy.eliminations = [{ cell: 80, digit: 9 }] },
      copy => { copy.placements = [{ cell: 0, digit: 1 }] },
    ]
    for (const mutate of mutations) {
      const copy = structuredClone(result)
      mutate(copy)
      expect(validateChainProof(notes, units, peers, copy)).toBe(false)
    }
    const relaxed = all.map(() => [1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(validateChainProof(relaxed, units, peers, result)).toBe(false)
  })
  it('finds a simple-coloring wrap when one color contains conflicting candidates', () => {
    const notes = singleDigit([2, 3, 4, 7, 9, 10, 12, 13, 18, 27, 30, 32, 42, 44, 46, 53, 56, 67, 68, 69, 73, 77, 78, 79])
    const result = findChainDeduction(notes, units, peers, () => {})
    expect(result).not.toBeNull()
    expect(result!.technique).toBe('simple-coloring')
    expect(result!.explanation).toContain('wrap')
    independentlyCheck(notes, result!)
  })
  it('finds an X-Chain whose middle weak link is not conjugate', () => {
    const notes = singleDigit([7, 11, 12, 13, 17, 18, 20, 27, 28, 32, 44, 46, 52, 56, 57, 58, 59, 62, 64, 67, 74, 78, 80])
    const result = findChainDeduction(notes, units, peers, () => {}, { techniques: ['x-chain'] })
    expect(result).not.toBeNull()
    expect(result!.technique).toBe('x-chain')
    expect(result!.proof!.links.some(link => link.kind === 'weak')).toBe(true)
    independentlyCheck(notes, result!)
  })

  it('finds an XY-Chain through four distinct bivalue cells', () => {
    const notes = all.map(() => [1, 2, 3, 4, 5, 6, 7, 8, 9])
    ;[notes[7], notes[1], notes[2], notes[18]] = [[1, 2], [2, 3], [3, 4], [4, 1]]
    const result = findChainDeduction(notes, units, peers, () => {}, { techniques: ['xy-chain'] })
    expect(result).not.toBeNull()
    expect(result!.technique).toBe('xy-chain')
    expect(findChainDeduction(notes, units, peers, () => {})?.technique).toBe('xy-chain')
    expect(result!.proof!.links.filter(link => link.kind === 'strong')).toHaveLength(4)
    independentlyCheck(notes, result!)
  })

  it('finds an open AIC joining different-digit house links with a cell exclusion', () => {
    const notes = all.map(c => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d =>
      !(d === 1 && c < 9 && c !== 7 && c !== 8) &&
      !(d === 2 && c % 9 === 8 && c !== 8 && c !== 17)))
    const result = findChainDeduction(notes, units, peers, () => {}, { techniques: ['aic'] })
    expect(result).not.toBeNull()
    expect(result!.technique).toBe('aic')
    expect(findChainDeduction(notes, units, peers, () => {})?.technique).toBe('aic')
    expect(new Set(result!.proof!.links.flatMap(link => [link.from.digit, link.to.digit])).size).toBeGreaterThan(1)
    expect(result!.eliminations).toContainEqual({ cell: 7, digit: 2 })
    independentlyCheck(notes, result!)
  })

  it('does not mistake a third candidate for a bivalue strong link', () => {
    const notes = all.map(() => [1, 2, 3, 4, 5, 6, 7, 8, 9])
    ;[notes[7], notes[1], notes[2], notes[18]] = [[1, 2], [2, 3, 5], [3, 4], [4, 1]]
    expect(findChainDeduction(notes, units, peers, () => {}, { techniques: ['xy-chain'] })).toBeNull()
    notes[0] = [1]
    expect(enumerate(Array(81).fill(0), notes, 1).count).toBe(1)
  })

  it('does not use an AIC when a third house position breaks its strong link', () => {
    const notes = all.map(c => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d =>
      !(d === 1 && c < 9 && c !== 7 && c !== 8) &&
      !(d === 2 && c % 9 === 8 && c !== 8 && c !== 17 && c !== 35)))
    expect(findChainDeduction(notes, units, peers, () => {}, { techniques: ['aic'] })).toBeNull()
    notes[7] = [2]
    expect(enumerate(Array(81).fill(0), notes, 1).count).toBe(1)
  })

  it.each([
    { technique: 'simple-coloring' as const, added: [27, 79], target: 51, cells: coloringTrap },
    { technique: 'x-chain' as const, added: [21, 50], target: 11, cells: [7, 11, 12, 13, 17, 18, 20, 27, 28, 32, 44, 46, 52, 56, 57, 58, 59, 62, 64, 67, 74, 78, 80] },
  ])('rejects satisfiable $technique near misses after conjugate links are relaxed', ({ technique, added, target, cells }) => {
    const notes = singleDigit(cells)
    for (const cell of added) notes[cell].push(1)
    expect(findChainDeduction(notes, units, peers, () => {}, { techniques: [technique] })).toBeNull()
    notes[target] = [1]
    expect(enumerate(Array(81).fill(0), notes, 1).count).toBe(1)
  })

  it('charges graph construction and every expansion, propagating caller budget exhaustion', () => {
    const notes = singleDigit(coloringTrap)
    const snapshot = structuredClone(notes)
    let work = 0
    const first = findChainDeduction(notes, units, peers, (amount = 1) => { work += amount })
    expect(work).toBeGreaterThan(81 * 9)
    let secondWork = 0
    const second = findChainDeduction(notes, units, peers, (amount = 1) => { secondWork += amount })
    expect(second).toEqual(first)
    expect(secondWork).toBe(work)
    expect(notes).toEqual(snapshot)
    const exhausted = new Error('shared work exhausted')
    expect(() => findChainDeduction(notes, units, peers, () => { throw exhausted })).toThrow(exhausted)
  })

  it('honors tighter link and state bounds without increasing the hard limits', () => {
    const notes = all.map(() => [1, 2, 3, 4, 5, 6, 7, 8, 9])
    ;[notes[7], notes[1], notes[2], notes[18]] = [[1, 2], [2, 3], [3, 4], [4, 1]]
    expect(findChainDeduction(notes, units, peers, () => {}, { techniques: ['xy-chain'], maxLinks: 6 })).toBeNull()
    expect(() => findChainDeduction(notes, units, peers, () => {}, { techniques: ['xy-chain'], maxStates: 1 })).toThrow(LogicalBudgetError)
    expect(findChainDeduction(notes, units, peers, () => {}, { techniques: ['xy-chain'], maxLinks: 7 })?.proof!.links).toHaveLength(7)
  })

  it('finds a simple-coloring trap with a structured endpoint proof', () => {
    const notes = singleDigit(coloringTrap)
    const result = findChainDeduction(notes, units, peers, () => {})
    expect(result).not.toBeNull()
    expect(result!.technique).toBe('simple-coloring')
    expect(result!.proof?.conclusion).toBe('endpoint-disjunction')
    expect(result!.proof!.links.length).toBeLessThanOrEqual(9)
    independentlyCheck(notes, result!)
  })

  it('supports a nine-link certificate but never exceeds that policy ceiling', () => {
    const notes = all.map(() => [1, 2, 3, 4, 5, 6, 7, 8, 9])
    ;[notes[7], notes[1], notes[2], notes[0], notes[18]] = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 1]]
    const result = findChainDeduction(notes, units, peers, () => {}, { techniques: ['xy-chain'], maxLinks: 100 })!
    expect(result.proof!.links).toHaveLength(9)
    expect(findChainDeduction(notes, units, peers, () => {}, { techniques: ['xy-chain'], maxLinks: 8 })).toBeNull()
    expect(() => findChainDeduction(notes, units, peers, () => {}, { maxStates: Number.NaN })).toThrow(LogicalBudgetError)
    expect(findChainDeduction(notes, units, peers, () => {}, { techniques: ['xy-chain'], maxLinks: Number.NaN })).toBeNull()
    independentlyCheck(notes, result)
  })

  it('throws on the shared 20,000-state hard ceiling instead of reporting a logical stall', () => {
    const notes = all.map(() => [1, 2])
    expect(() => findChainDeduction(notes, units, peers, () => {}, { techniques: ['aic'], maxStates: 1_000_000 })).toThrow(LogicalBudgetError)
  })

  it('rejects incomplete houses and requires exactly two digit positions for a strong link', () => {
    const notes = singleDigit(coloringTrap)
    const result = findChainDeduction(notes, units, peers, () => {})!
    const house = result.proof!.links[0].house!
    const incomplete = units.map(u => [...u])
    incomplete[house].pop()
    expect(validateChainProof(notes, incomplete, peers, result)).toBe(false)
    expect(findChainDeduction(notes, incomplete.map(u => u.slice(0, 8)), peers, () => {})).toBeNull()
    const third = units[house].find(c => !notes[c].includes(1))!
    notes[third].push(1)
    expect(validateChainProof(notes, units, peers, result)).toBe(false)
    notes[third] = notes[third].filter(d => d !== 1)
    const endpoint = result.proof!.links[0].from.cell
    notes[endpoint] = notes[endpoint].filter(d => d !== 1)
    expect(validateChainProof(notes, units, peers, result)).toBe(false)
  })
})
