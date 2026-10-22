import type { Deduction, Technique } from './types'

type Spend = (amount?: number) => void
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const coord = (cell: number) => `r${Math.floor(cell / 9) + 1}c${cell % 9 + 1}`

/** Visit lazily so the caller's shared work ledger bounds enumeration too. */
function choose<T>(items: readonly T[], size: number, spend: Spend, visit: (selection: T[]) => Deduction | null): Deduction | null {
  const selection: T[] = []
  function walk(start: number): Deduction | null {
    spend()
    if (selection.length === size) return visit(selection)
    for (let i = start; i <= items.length - (size - selection.length); i++) {
      spend()
      selection.push(items[i])
      const result = walk(i + 1)
      selection.pop()
      if (result) return result
    }
    return null
  }
  return walk(0)
}

function elimination(technique: Technique, cells: number[], removals: { cell: number; digit: number }[], explanation: string): Deduction | null {
  if (!removals.length) return null
  return { technique, cells: [...new Set(cells)].sort((a, b) => a - b), digit: removals[0].digit, placements: [], eliminations: removals.sort((a, b) => a.cell - b.cell || a.digit - b.digit), explanation }
}

function hiddenSubset(notes: number[][], units: readonly number[][], size: number, spend: Spend): Deduction | null {
  for (const unit of units) {
    spend()
    // Census once per house; digits with more than `size` positions cannot
    // belong to a hidden subset, so avoid fruitless combination scans.
    const positions = new Map<number, number[]>()
    for (const digit of DIGITS) {
      spend(unit.length)
      const cells = unit.filter(cell => notes[cell].includes(digit))
      // Leave hidden singles to their own earlier detector.
      if (cells.length >= 2 && cells.length <= size) positions.set(digit, cells)
    }
    const result = choose([...positions.keys()], size, spend, digits => {
      spend(size * size)
      const cells = [...new Set(digits.flatMap(digit => positions.get(digit)!))].sort((a, b) => a - b)
      if (cells.length !== size) return null
      spend(size * 9)
      const removals = cells.flatMap(cell => notes[cell].filter(digit => !digits.includes(digit)).map(digit => ({ cell, digit })))
      const technique = size === 2 ? 'hidden-pair' : size === 3 ? 'hidden-triple' : 'hidden-quad'
      return elimination(technique, cells, removals, `${digits.join(', ')} occur only in ${cells.map(coord).join(', ')} within one house. Those ${size} digits occupy these ${size} cells; remove their other candidates.`)
    })
    if (result) return result
  }
  return null
}

function nakedQuad(notes: number[][], units: readonly number[][], spend: Spend): Deduction | null {
  for (const unit of units) {
    spend(unit.length)
    const possible = unit.filter(cell => notes[cell].length >= 2 && notes[cell].length <= 4)
    const result = choose(possible, 4, spend, cells => {
      spend(4)
      const digits = [...new Set(cells.flatMap(cell => notes[cell]))].sort((a, b) => a - b)
      if (digits.length !== 4) return null
      spend(unit.length)
      const removals = unit.filter(cell => !cells.includes(cell)).flatMap(cell => digits.filter(digit => notes[cell].includes(digit)).map(digit => ({ cell, digit })))
      return elimination('naked-quad', cells, removals, `${cells.map(coord).join(', ')} contain only ${digits.join(', ')} in one house. These four cells reserve the four digits; remove them elsewhere in that house.`)
    })
    if (result) return result
  }
  return null
}

function xyzWing(notes: number[][], peers: readonly number[][], spend: Spend): Deduction | null {
  for (let pivot = 0; pivot < notes.length; pivot++) {
    spend()
    if (notes[pivot].length !== 3) continue
    spend(peers[pivot].length)
    const wings = peers[pivot].filter(cell => notes[cell].length === 2 && notes[cell].every(digit => notes[pivot].includes(digit)))
    const result = choose(wings, 2, spend, ([a, b]) => {
      const common = notes[a].filter(digit => notes[b].includes(digit))
      if (common.length !== 1 || new Set([...notes[a], ...notes[b]]).size !== 3) return null
      const z = common[0]
      spend(peers[pivot].length)
      const removals = peers[pivot].filter(cell => cell !== a && cell !== b && peers[a].includes(cell) && peers[b].includes(cell) && notes[cell].includes(z)).map(cell => ({ cell, digit: z }))
      return elimination('xyz-wing', [pivot, a, b], removals, `${coord(pivot)} has ${notes[pivot].join('/')}; its bivalue wings ${coord(a)} (${notes[a].join('/')}) and ${coord(b)} (${notes[b].join('/')}) see the pivot. Either the pivot or a wing must be ${z}; remove ${z} only from cells seeing all three.`)
    })
    if (result) return result
  }
  return null
}

function wWing(notes: number[][], units: readonly number[][], peers: readonly number[][], spend: Spend): Deduction | null {
  spend(notes.length)
  const bivalue = notes.flatMap((list, cell) => list.length === 2 ? [cell] : [])
  return choose(bivalue, 2, spend, ([a, b]) => {
    if (peers[a].includes(b) || !notes[a].every(digit => notes[b].includes(digit))) return null
    for (const x of notes[a]) for (const unit of units) {
      spend(unit.length)
      const bridge = unit.filter(cell => notes[cell].includes(x))
      if (bridge.length !== 2 || bridge.includes(a) || bridge.includes(b)) continue
      const [u, v] = bridge
      if (!(peers[a].includes(u) && peers[b].includes(v)) && !(peers[a].includes(v) && peers[b].includes(u))) continue
      const y = notes[a].find(digit => digit !== x)!
      spend(peers[a].length)
      const removals = peers[a].filter(cell => cell !== b && !bridge.includes(cell) && peers[b].includes(cell) && notes[cell].includes(y)).map(cell => ({ cell, digit: y }))
      const result = elimination('w-wing', [a, b, u, v], removals, `${coord(a)} and ${coord(b)} both have ${notes[a].join('/')}. The only ${x} candidates in a house are ${coord(u)} and ${coord(v)}, seen by the respective wings. Both wings cannot be ${x}, so at least one is ${y}; remove ${y} from their common peers.`)
      if (result) return result
    }
    return null
  })
}

/** Select actual supplied lines, rather than constructing independent topology. */
function lineFamilies(units: readonly number[][], spend: Spend): number[][][] {
  spend(units.length * 9)
  const rows = units.filter(unit => unit.length === 9 && unit.every(cell => Math.floor(cell / 9) === Math.floor(unit[0] / 9))).map(unit => unit.slice()).sort((a, b) => a[0] - b[0])
  const columns = units.filter(unit => unit.length === 9 && unit.every(cell => cell % 9 === unit[0] % 9)).map(unit => unit.slice()).sort((a, b) => a[0] - b[0])
  return [rows, columns]
}

function jellyfish(notes: number[][], units: readonly number[][], spend: Spend): Deduction | null {
  const families = lineFamilies(units, spend)
  for (let axis = 0; axis < 2; axis++) {
    const bases = families[axis], covers = families[1 - axis]
    if (bases.length !== 9 || covers.length !== 9) continue
    for (const digit of DIGITS) {
      spend(81)
      const positions = bases.map(unit => unit.filter(cell => notes[cell].includes(digit)))
      const possible = bases.map((_, index) => index).filter(index => positions[index].length >= 2 && positions[index].length <= 4)
      const result = choose(possible, 4, spend, selected => {
        spend(36)
        const evidence = selected.flatMap(index => positions[index])
        const coverIndices = covers.flatMap((unit, index) => evidence.some(cell => unit.includes(cell)) ? [index] : [])
        if (coverIndices.length !== 4) return null
        const baseCells = new Set(selected.flatMap(index => bases[index]))
        spend(36)
        const removals = coverIndices.flatMap(index => covers[index].filter(cell => !baseCells.has(cell) && notes[cell].includes(digit)).map(cell => ({ cell, digit })))
        return elimination('jellyfish', evidence, removals, `For ${digit}, four ${axis === 0 ? 'rows' : 'columns'} are confined to four ${axis === 0 ? 'columns' : 'rows'} (${evidence.map(coord).join(', ')}). Each base must use a different cover; remove ${digit} from those covers outside the four bases.`)
      })
      if (result) return result
    }
  }
  return null
}

function finnedXWing(notes: number[][], units: readonly number[][], peers: readonly number[][], spend: Spend): Deduction | null {
  const families = lineFamilies(units, spend)
  spend(units.length * 9)
  const boxes = units.filter(unit => unit.length === 9 && unit.every(cell => Math.floor(cell / 27) * 3 + Math.floor(cell % 9 / 3) === Math.floor(unit[0] / 27) * 3 + Math.floor(unit[0] % 9 / 3)))
  for (let axis = 0; axis < 2; axis++) {
    const bases = families[axis], covers = families[1 - axis]
    if (bases.length !== 9 || covers.length !== 9) continue
    for (const digit of DIGITS) {
      spend(81)
      const positions = bases.map(unit => unit.filter(cell => notes[cell].includes(digit)))
      for (let regular = 0; regular < bases.length; regular++) {
        spend()
        if (positions[regular].length !== 2) continue
        spend(18)
        const coreCovers = covers.filter(unit => positions[regular].some(cell => unit.includes(cell)))
        if (coreCovers.length !== 2) continue
        for (let finned = 0; finned < bases.length; finned++) {
          spend()
          if (finned === regular || positions[finned].length < 3 || positions[finned].length > 4) continue
          // All four ordinary X-Wing corners must actually exist: no sashimi.
          const corners = coreCovers.flatMap(unit => positions[finned].filter(cell => unit.includes(cell)))
          if (corners.length !== 2) continue
          const fins = positions[finned].filter(cell => !corners.includes(cell))
          for (const box of boxes) {
            spend(9)
            if (!fins.every(cell => box.includes(cell))) continue
            const finCorner = corners.filter(cell => box.includes(cell))
            if (finCorner.length !== 1) continue
            const cover = coreCovers.find(unit => unit.includes(finCorner[0]))!
            const removals = cover.filter(cell => box.includes(cell) && !bases[regular].includes(cell) && !bases[finned].includes(cell) && fins.every(fin => peers[fin].includes(cell)) && notes[cell].includes(digit)).map(cell => ({ cell, digit }))
            const evidence = [...positions[regular], ...positions[finned]]
            const result = elimination('finned-x-wing', evidence, removals, `For ${digit}, ${evidence.map(coord).join(', ')} form an ordinary X-Wing with all four corners and fins at ${fins.map(coord).join(', ')} in one corner box. If a fin is true it excludes ${digit} there; if all fins are false the X-Wing does. Remove ${digit} only on that corner's cover inside the fin box, outside the base lines.`)
            if (result) return result
          }
        }
      }
    }
  }
  return null
}

/** Trusted exclusion-only domains; no guessing, topology globals or mutation. */
export function findExpertPattern(notes: number[][], units: readonly number[][], peers: readonly number[][], spend: Spend, maxTier: number): Deduction | null {
  if (maxTier < 1) return null
  return hiddenSubset(notes, units, 2, spend)
    ?? (maxTier >= 2 ? hiddenSubset(notes, units, 3, spend) : null)
    ?? (maxTier >= 3 ? hiddenSubset(notes, units, 4, spend)
      ?? nakedQuad(notes, units, spend)
      ?? xyzWing(notes, peers, spend)
      ?? wWing(notes, units, peers, spend)
      ?? jellyfish(notes, units, spend)
      ?? finnedXWing(notes, units, peers, spend) : null)
}
