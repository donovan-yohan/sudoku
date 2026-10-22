// Offline original construction. No downloaded puzzle corpus or runtime fallback.
// node scripts/search-expert-puzzles.mjs <output.json> [attempts=300] [seed=23841]
import { registerHooks } from 'node:module'
import { writeFileSync } from 'node:fs'
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context) } catch (error) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context)
    throw error
  }
} })
const { solveVariant, countVariantSolutions, rateVariant } = await import('../src/variant-engine.ts')
const { oracle } = await import('./variant-oracle.mjs')
const output = process.argv[2]
if (!output) throw new Error('Pass an output path')
const attempts = Number(process.argv[3] ?? 300), seed = Number(process.argv[4] ?? 23841)
if (!Number.isSafeInteger(attempts) || attempts < 1 || !Number.isSafeInteger(seed)) throw new TypeError('Invalid search inputs')
let state = seed >>> 0
const random = () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
const shuffle = list => { const result = list.slice(); for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] } return result }
const rules = { variant: 'classic' }, cells = Array.from({ length: 81 }, (_, c) => c)
const accepted = [], covered = new Set(), stats = { attempted: 0, unique: 0, solved: 0, exhausted: 0 }
const interesting = new Set(['xyz-wing', 'w-wing', 'jellyfish', 'finned-x-wing', 'simple-coloring', 'x-chain', 'xy-chain', 'aic'])
function checkpoint() { writeFileSync(output, `${JSON.stringify({ seed, stats, covered: [...covered], accepted }, null, 2)}\n`) }
for (let attempt = 0; attempt < attempts; attempt++) {
  stats.attempted++
  const source = solveVariant(cells.map(() => 0), rules, { random, maxNodes: 10000, maxWork: 2000000 })
  if (!source.first || source.exhausted) continue
  const givens = source.first.slice()
  for (const cell of shuffle(cells)) {
    const digit = givens[cell]; givens[cell] = 0
    const proof = countVariantSolutions(givens, rules, { maxNodes: 5000, maxWork: 300000 })
    if (!proof.unique) givens[cell] = digit
  }
  stats.unique++
  const rating = rateVariant(givens, rules)
  if (rating.status === 'budget-exhausted') stats.exhausted++
  if (!rating.solved) continue
  stats.solved++
  const named = rating.techniques.filter(id => interesting.has(id))
  if (!named.some(id => !covered.has(id))) continue
  const proof = oracle(givens, rules, { maxWork: 100000000 })
  if (!proof.unique || JSON.stringify(proof.first) !== JSON.stringify(source.first)) throw new Error('Independent certification failed')
  const record = { id: `original-expert-search:${seed}:${attempt}`, givens, solution: source.first, difficulty: rating.difficulty, techniques: rating.techniques, profile: rating.profile, provenance: { seed, attempt, method: 'randomized-MRV/unique-clue-removal-v1' } }
  accepted.push(record)
  named.forEach(id => covered.add(id))
  checkpoint()
  console.log(JSON.stringify({ attempt, id: record.id, named, accepted: accepted.length }))
  if (covered.has('xy-chain') && covered.has('aic') && accepted.length >= 4) break
}
checkpoint()
console.log(JSON.stringify({ stats, covered: [...covered], accepted: accepted.length }))
