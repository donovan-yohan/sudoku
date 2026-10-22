// Re-certify original sources after a deliberate rubric reset.
// node scripts/recertify-variant-seeds.mjs [additional-original-search.json]
import { registerHooks } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { oracle } from './variant-oracle.mjs'
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context) } catch (error) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context)
    throw error
  }
} })
const { rateVariant } = await import('../src/variant-engine.ts')
const path = new URL('../src/variant-seeds.json', import.meta.url)
const sources = JSON.parse(readFileSync(path, 'utf8'))
if (process.argv[2]) {
  const extra = JSON.parse(readFileSync(process.argv[2], 'utf8'))
  for (const puzzle of extra.accepted) sources.push({ ...puzzle, variant: 'classic' })
}
const accepted = [], fingerprints = new Set()
for (const source of sources) {
  const rules = { variant: source.variant, ...(source.cages ? { cages: source.cages } : {}) }
  const key = JSON.stringify([rules, source.givens])
  if (fingerprints.has(key)) continue
  const rating = rateVariant(source.givens, rules)
  if (!rating.solved || !rating.difficulty) throw new Error(`Source is not publishable under the new rubric: ${source.id} ${rating.status}`)
  const proof = oracle(source.givens, rules, { maxWork: 100_000_000 })
  if (!proof.unique || JSON.stringify(proof.first) !== JSON.stringify(source.solution)) throw new Error(`Independent certification failed: ${source.id}`)
  fingerprints.add(key)
  accepted.push({
    id: source.id, variant: source.variant, difficulty: rating.difficulty,
    givens: source.givens, solution: source.solution,
    ...(source.cages ? { cages: source.cages } : {}),
    ...(source.provenance ? { provenance: source.provenance } : {}),
    certification: { oracle: 'grouped-exact-cover-v1', count: 1, exhausted: false, rubric: rating.rubric, techniques: rating.techniques, profile: rating.profile },
  })
}
writeFileSync(path, `${JSON.stringify(accepted, null, 2)}\n`)
console.log(JSON.stringify({ certified: accepted.length, tiers: accepted.reduce((counts, p) => { const key = `${p.variant}:${p.difficulty}`; counts[key] = (counts[key] ?? 0) + 1; return counts }, {}) }))
