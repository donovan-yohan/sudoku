import { describe, expect, it } from 'vitest'
import seeds from './variant-seeds.json'
import { candidates, UNITS, peers } from './engine'
import { rateVariant } from './variant-engine'
// @ts-expect-error independent plain JavaScript constraint implementation
import { enumerate } from '../scripts/independent-oracle.mjs'

const newFamilies = new Set(['hidden-pair','hidden-triple','hidden-quad','naked-quad','xyz-wing','w-wing','jellyfish','finned-x-wing','simple-coloring','x-chain','xy-chain','aic'])

describe('original expert construction and proof regression', () => {
  it('includes original full puzzles exercising multiple genuinely expanded families', () => {
    const originals = seeds.filter(seed => seed.id.startsWith('original-expert-search:'))
    expect(originals.length).toBeGreaterThanOrEqual(4)
    const checked = new Set<string>()
    for (const source of originals) {
      const original = source.givens.slice()
      const proof = enumerate(original)
      expect(proof.count, source.id).toBe(1)
      expect(proof.first).toEqual(source.solution)
      const rating = rateVariant(original, { variant: 'classic' })
      expect(rating).toMatchObject({ solved: true, difficulty: 'expert', lowerTierStalled: true })
      const values = original.slice()
      let notes = candidates(values)
      for (const step of rating.trace) {
        for (const action of step.eliminations) {
          expect(notes[action.cell]).toContain(action.digit)
          expect(source.solution[action.cell]).not.toBe(action.digit)
          if (newFamilies.has(step.technique)) {
            const forced = original.slice(); forced[action.cell] = action.digit
            expect(enumerate(forced, null, 1).count, `${source.id} ${step.technique} ${action.cell}=${action.digit}`).toBe(0)
          }
        }
        if (step.proof) {
          const links = step.proof.links
          expect(links.length).toBeLessThanOrEqual(9)
          for (const [i, link] of links.entries()) {
            expect(link.kind).toBe(i % 2 ? 'weak' : 'strong')
            if (link.kind === 'strong') {
              if (link.house !== undefined) expect(UNITS[link.house].filter(cell => notes[cell].includes(link.from.digit))).toEqual([link.from.cell, link.to.cell].sort((a, b) => a - b))
              else expect(notes[link.cell!]).toHaveLength(2)
            } else expect((link.from.cell === link.to.cell && link.from.digit !== link.to.digit) || (link.from.digit === link.to.digit && peers(link.from.cell).includes(link.to.cell))).toBe(true)
          }
        }
        if (newFamilies.has(step.technique)) checked.add(step.technique)
        for (const action of step.placements) { expect(action.digit).toBe(source.solution[action.cell]); values[action.cell] = action.digit }
        for (const action of step.eliminations) notes[action.cell] = notes[action.cell].filter(d => d !== action.digit)
        const legal = candidates(values)
        notes = notes.map((list, cell) => list.filter(d => legal[cell].includes(d)))
      }
      expect(values).toEqual(source.solution)
    }
    expect([...checked]).toEqual(expect.arrayContaining(['aic','xy-chain','w-wing','xyz-wing']))
  }, 60_000)
})
