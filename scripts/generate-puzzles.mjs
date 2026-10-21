#!/usr/bin/env node
/** Offline original puzzle search. No downloaded puzzle data or runtime generation.
 * node scripts/generate-puzzles.mjs --output /absolute/path/catalog.json --attempts 3000
 * The fixed PRNG seed makes this search reproducible; checkpoints survive interruption.
 * Output is reviewed/tested before embedding into src/puzzles.ts.
 */
import { writeFileSync } from 'node:fs'
import { countSolutions, ratePuzzle } from '../src/engine.ts'
const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const output = option('--output', null)
if (!output) throw new Error('Pass --output /absolute/path/catalog.json')
const attempts = Number(option('--attempts', '3000'))
let state = Number(option('--seed', '1637910')) >>> 0
const random = () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
const shuffle = array => { const result = array.slice(); for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] } return result }
const digits = [1,2,3,4,5,6,7,8,9]
function fullGrid() {
  const values = Array(81).fill(0), rows = Array(9).fill(0), cols = Array(9).fill(0), boxes = Array(9).fill(0)
  function visit() {
    let target = -1, options = []
    for (let cell = 0; cell < 81; cell++) {
      if (values[cell]) continue
      const used = rows[Math.floor(cell/9)] | cols[cell%9] | boxes[Math.floor(cell/27)*3 + Math.floor(cell%9/3)]
      const legal = digits.filter(d => !(used & 1 << d))
      if (!legal.length) return false
      if (target < 0 || legal.length < options.length) { target = cell; options = legal; if (legal.length === 1) break }
    }
    if (target < 0) return true
    const row = Math.floor(target/9), col = target%9, box = Math.floor(target/27)*3 + Math.floor(target%9/3)
    for (const digit of shuffle(options)) {
      const bit = 1 << digit
      values[target] = digit; rows[row] |= bit; cols[col] |= bit; boxes[box] |= bit
      if (visit()) return true
      values[target] = 0; rows[row] &= ~bit; cols[col] &= ~bit; boxes[box] &= ~bit
    }
    return false
  }
  if (!visit()) throw new Error('full-grid search failed')
  return values
}
const catalog = { beginner: [], intermediate: [], advanced: [], expert: [] }
const stats = { generated: 0, unsupported: 0 }
for (let attempt = 0; attempt < attempts; attempt++) {
  const values = fullGrid()
  for (const cell of shuffle(Array.from({ length: 81 }, (_, i) => i))) {
    const digit = values[cell]; values[cell] = 0
    if (countSolutions(values) !== 1) values[cell] = digit
  }
  const rating = ratePuzzle(values)
  stats.generated++
  if (rating.solved) {
    const list = catalog[rating.difficulty], text = values.join('')
    if (list.length < 4 && !list.includes(text)) {
      list.push(text)
      writeFileSync(output, JSON.stringify({ seed: option('--seed', '1637910'), stats, catalog }, null, 2))
      console.log(`attempt ${attempt + 1}: ${rating.difficulty} ${list.length}/4, ${rating.techniques.join(', ')}`)
    }
  } else stats.unsupported++
  if (Object.values(catalog).every(list => list.length >= 4)) break
  if (attempt % 100 === 99) console.log(JSON.stringify(stats))
}
writeFileSync(output, JSON.stringify({ seed: option('--seed', '1637910'), stats, catalog }, null, 2))
console.log(JSON.stringify({ stats, counts: Object.fromEntries(Object.entries(catalog).map(([k,v]) => [k,v.length])) }))
if (Object.values(catalog).some(list => list.length < 4)) process.exitCode = 1
