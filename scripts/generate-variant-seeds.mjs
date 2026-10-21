// Offline certification only: node scripts/generate-variant-seeds.mjs <spike-json>
// Input is the original engine-generated spike output, not a third-party corpus.
import { registerHooks } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { oracle } from './variant-oracle.mjs'
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context) } catch (error) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context)
    throw error
  }
} })
const { rateVariant, solveVariant } = await import('../src/variant-engine.ts')
const { CATALOG } = await import('../src/puzzles.ts')
if (!process.argv[2]) throw new Error('Pass the original spike benchmark JSON path')
const input = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const candidates = input.accepted.filter(p => p.level !== 'beginner').map(p => ({
  id: `spike:${p.mode}:${p.level}:${p.seed}`, variant: p.mode, difficulty: p.level,
  givens: p.givens, solution: p.solution, ...(p.spec.cages ? { cages: p.spec.cages } : {}),
}))
for (const difficulty of ['intermediate', 'advanced', 'expert']) for (const [i, text] of CATALOG[difficulty].entries()) {
  const givens = [...text].map(Number), solved = solveVariant(givens, { variant: 'classic' })
  candidates.push({ id: `original-catalog-v1:${difficulty}:${i}`, variant: 'classic', difficulty, givens, solution: solved.first })
}
const accepted = [], fingerprints = new Set()
for (const candidate of candidates) {
  const rules = { variant: candidate.variant, ...(candidate.cages ? { cages: candidate.cages } : {}) }
  const rating = rateVariant(candidate.givens, rules)
  if (!rating.solved || rating.difficulty !== candidate.difficulty) continue
  const proof = oracle(candidate.givens, rules, { maxWork: 100_000_000 })
  if (!proof.unique || JSON.stringify(proof.first) !== JSON.stringify(candidate.solution)) throw new Error(`Independent certification failed: ${candidate.id}`)
  const key = JSON.stringify([candidate.variant, candidate.givens, candidate.cages])
  if (fingerprints.has(key)) continue
  fingerprints.add(key)
  accepted.push({ ...candidate, certification: { oracle: 'grouped-exact-cover-v1', count: 1, exhausted: false, rubric: rating.rubric, techniques: rating.techniques } })
}
writeFileSync(fileURLToPath(new URL('../src/variant-seeds.json', import.meta.url)), `${JSON.stringify(accepted, null, 2)}\n`)
console.log(JSON.stringify({ certified: accepted.length, tiers: accepted.reduce((a, p) => { const key = `${p.variant}:${p.difficulty}`; a[key] = (a[key] ?? 0) + 1; return a }, {}) }))
