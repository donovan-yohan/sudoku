import { describe, expect, it } from 'vitest'
import type { Deduction } from './types'
import { findExpertPattern as find } from './expert-patterns'
// @ts-expect-error standalone independent test oracle has no declaration file
import { enumerate } from '../scripts/independent-oracle.mjs'
const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const units = [
  ...Array.from({ length: 9 }, (_, r) => digits.map((_, c) => r * 9 + c)),
  ...Array.from({ length: 9 }, (_, c) => digits.map((_, r) => r * 9 + c)),
  ...Array.from({ length: 9 }, (_, b) => digits.map((_, i) => Math.floor(b / 3) * 27 + b % 3 * 3 + Math.floor(i / 3) * 9 + i % 3)),
]
const peers = Array.from({ length: 81 }, (_, cell) => [...new Set(units.filter(unit => unit.includes(cell)).flat())].filter(other => other !== cell).sort((a, b) => a - b))
const fresh = () => Array.from({ length: 81 }, () => digits.slice())
const transpose = (cell: number) => cell % 9 * 9 + Math.floor(cell / 9)
const flipped = (notes: number[][]) => notes.map((_, cell) => notes[transpose(cell)].slice())
const run = (notes: number[][], maxTier = 3) => find(notes, units, peers, () => {}, maxTier)

// Independent single-digit feasibility oracle: every full Sudoku completion
// induces a row/column/box-disjoint placement of each digit. An absent digit
// placement therefore proves impossibility without enumerating other digits.
function digitPossible(notes: number[][], digit: number, target: number): boolean {
  const colOf = (cell: number) => cell % 9
  const boxOf = (cell: number) => Math.floor(cell / 27) * 3 + Math.floor(cell % 9 / 3)
  const positions = Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, col) => row * 9 + col).filter(cell => notes[cell].includes(digit) && (Math.floor(target / 9) !== row || cell === target)))
  positions.sort((a, b) => a.length - b.length)
  function visit(row: number, cols: Set<number>, boxes: Set<number>): boolean {
    if (row === 9) return true
    return positions[row].some(cell => {
      const col = colOf(cell), box = boxOf(cell)
      return !cols.has(col) && !boxes.has(box) && visit(row + 1, new Set([...cols, col]), new Set([...boxes, box]))
    })
  }
  return visit(0, new Set(), new Set())
}

function verify(notes: number[][], technique: Deduction['technique'], target: number, digit: number): Deduction {
  const before = structuredClone(notes)
  const result = run(notes)
  expect(result?.technique).toBe(technique)
  expect(result?.placements).toEqual([])
  expect(result?.eliminations).toContainEqual({ cell: target, digit })
  expect(result?.explanation).toMatch(/r[1-9]c[1-9]/)
  expect(notes).toEqual(before)
  expect(run(notes)).toEqual(result)
  // Each full candidate-restricted state must have a real completion. Each
  // reported elimination is checked independently, not just the chosen target.
  const witness = enumerate(Array(81).fill(0), notes, 1)
  expect(witness.count).toBe(1)
  expect(witness.first).toHaveLength(81)
  expect(witness.first.every((value: number, cell: number) => notes[cell].includes(value))).toBe(true)
  for (const unit of units) expect(new Set(unit.map(cell => witness.first[cell])).size).toBe(9)
  if (technique === 'jellyfish') expect(digitPossible(notes, digit, witness.first.indexOf(digit))).toBe(true)
  for (const removal of result!.eliminations) {
    expect(notes[removal.cell]).toContain(removal.digit)
    if (technique === 'jellyfish') {
      // Full 81-cell unsat enumeration exceeds the standalone oracle's 2M
      // node cap on this deliberately broad fixture. Exhaust all placements
      // of the eliminated digit instead, retaining a full Sudoku SAT witness.
      expect(digitPossible(notes, removal.digit, removal.cell)).toBe(false)
    } else {
      const forced = notes.map(list => list.slice())
      forced[removal.cell] = [removal.digit]
      expect(enumerate(Array(81).fill(0), forced, 1).count, JSON.stringify(removal)).toBe(0)
    }
  }
  return result!
}

function hidden(size: number): number[][] {
  const notes = fresh()
  for (let cell = size; cell < 9; cell++) notes[cell] = notes[cell].filter(digit => digit > size)
  return notes
}

describe('expert patterns on satisfiable candidate-restricted states', () => {
  it('honors supplied houses and peer visibility rather than hidden global topology', () => {
    const pair = hidden(2)
    expect(find(pair, [], peers, () => {}, 3)).toBeNull()
    const wing = fresh()
    wing[0] = [1, 2, 3]; wing[9] = [1, 3]; wing[3] = [2, 3]
    expect(find(wing, units, Array.from({ length: 81 }, () => []), () => {}, 3)).toBeNull()
    const frozenNotes = wing.map(list => Object.freeze(list.slice()))
    const frozenUnits = units.map(unit => Object.freeze(unit.slice()))
    const frozenPeers = peers.map(list => Object.freeze(list.slice()))
    expect(() => find(frozenNotes as number[][], frozenUnits as number[][], frozenPeers as number[][], () => {}, 3)).not.toThrow()
  })

  it('charges finite work and propagates caller-owned budget exhaustion without mutation', () => {
    const notes = fresh(), before = structuredClone(notes)
    const exhausted = new Error('shared ledger exhausted')
    let spent = 0
    expect(() => find(notes, units, peers, amount => {
      spent += amount ?? 1
      if (spent > 100) throw exhausted
    }, 3)).toThrow(exhausted)
    expect(spent).toBeGreaterThan(100)
    expect(notes).toEqual(before)
    spent = 0
    expect(find(notes, units, peers, amount => { spent += amount ?? 1 }, 3)).toBeNull()
    expect(spent).toBeGreaterThan(100)
    expect(spent).toBeLessThan(200_000)
    const lowerTierSpend = spent
    spent = 0
    find(notes, units, peers, amount => { spent += amount ?? 1 }, 1)
    expect(spent).toBeLessThan(lowerTierSpend)
  })

  it('ordinary finned X-Wing: both core corners present, transpose, and fins confined to one corner box', () => {
    const notes = fresh()
    for (const row of [0, 3]) for (let col = 0; col < 9; col++) {
      if (!(row === 0 ? [0, 1, 4] : [0, 4]).includes(col)) notes[row * 9 + col] = notes[row * 9 + col].filter(digit => digit !== 1)
    }
    const result = verify(notes, 'finned-x-wing', 9, 1)
    expect(result.eliminations).not.toContainEqual({ cell: 36, digit: 1 })
    verify(flipped(notes), 'finned-x-wing', transpose(9), 1)
    expect(run(notes, 2)).toBeNull()
    const splitFins = structuredClone(notes)
    splitFins[8].push(1)
    expect(run(splitFins)).toBeNull()
    const sashimi = structuredClone(notes)
    sashimi[0] = sashimi[0].filter(digit => digit !== 1)
    expect(run(sashimi)?.technique).not.toBe('finned-x-wing')
  })

  it('Jellyfish: four full bases, transpose, tier gate, and a fifth-cover near miss', () => {
    const notes = fresh()
    for (const row of [0, 3, 6, 8]) for (let col = 0; col < 9; col++) {
      if (![0, 2, 4, 7].includes(col)) notes[row * 9 + col] = notes[row * 9 + col].filter(digit => digit !== 1)
    }
    verify(notes, 'jellyfish', 9, 1)
    verify(flipped(notes), 'jellyfish', transpose(9), 1)
    expect(run(notes, 2)).toBeNull()
    notes[1].push(1)
    expect(run(notes)).toBeNull()
  })

  it('W-Wing: conjugate bridge between identical bivalue cells, transpose, and a third bridge occurrence near miss', () => {
    const notes = fresh()
    notes[0] = [1, 2]; notes[40] = [1, 2]
    for (const cell of units[1]) if (cell !== 9 && cell !== 13) notes[cell] = notes[cell].filter(digit => digit !== 1)
    verify(notes, 'w-wing', 4, 2)
    verify(flipped(notes), 'w-wing', transpose(4), 2)
    expect(run(notes, 2)).toBeNull()
    notes[10].push(1)
    expect(run(notes)).toBeNull()
  })

  it('XYZ-Wing: sees all three cells, transpose, tier gate, and a non-bivalue wing near miss', () => {
    const notes = fresh()
    notes[0] = [1, 2, 3]; notes[9] = [1, 3]; notes[3] = [2, 3]
    const result = verify(notes, 'xyz-wing', 1, 3)
    expect(result.eliminations).not.toContainEqual({ cell: 12, digit: 3 })
    verify(flipped(notes), 'xyz-wing', transpose(1), 3)
    expect(run(notes, 2)).toBeNull()
    notes[3].push(4)
    expect(run(notes)).toBeNull()
  })

  it('naked quad: union of four digits, transpose, tier gate, and a fifth-digit near miss', () => {
    const notes = fresh()
    notes[0] = [1, 2]; notes[1] = [2, 3]; notes[2] = [3, 4]; notes[3] = [1, 4]
    verify(notes, 'naked-quad', 4, 1)
    verify(flipped(notes), 'naked-quad', transpose(4), 1)
    expect(run(notes, 2)).toBeNull()
    notes[3].push(5)
    expect(run(notes)).toBeNull()
  })

  it('hidden quad: four reserved digits, transpose, tier gate, and an extra occurrence near miss', () => {
    const notes = hidden(4)
    verify(notes, 'hidden-quad', 0, 5)
    verify(flipped(notes), 'hidden-quad', 0, 5)
    expect(run(notes, 2)).toBeNull()
    notes[4].push(1)
    expect(run(notes)).toBeNull()
  })

  it('hidden triple: three reserved digits, transpose, tier gate, and an extra occurrence near miss', () => {
    const notes = hidden(3)
    verify(notes, 'hidden-triple', 0, 4)
    verify(flipped(notes), 'hidden-triple', 0, 4)
    expect(run(notes, 1)).toBeNull()
    notes[3].push(1)
    expect(run(notes, 2)).toBeNull()
  })

  it('hidden pair: two reserved digits, transpose, tier gate, and an extra occurrence near miss', () => {
    const notes = hidden(2)
    verify(notes, 'hidden-pair', 0, 3)
    verify(flipped(notes), 'hidden-pair', 0, 3)
    expect(run(notes, 0)).toBeNull()
    const miss = fresh()
    for (let cell = 2; cell < 9; cell++) miss[cell] = miss[cell].filter(digit => digit > 2)
    miss[2].push(1)
    expect(run(miss, 1)).toBeNull()
  })
})
