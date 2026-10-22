import type { CandidateRef, Deduction, InferenceLink } from './types'
import { LogicalBudgetError } from './solver-policy'

/** Hard per-call limits, shared by all chain families (not per start node). */
export const CHAIN_MAX_LINKS = 9
export const CHAIN_MAX_STATES = 20_000

type Spend = (amount?: number) => void
type Edge = { to: number; house?: number; cell?: number }
type ChainTechnique = 'simple-coloring' | 'x-chain' | 'xy-chain' | 'aic'
export interface ChainOptions {
  techniques?: readonly ChainTechnique[]
  /** May tighten, never increase, the hard limits. */
  maxLinks?: number
  maxStates?: number
}
type Graph = { nodes: CandidateRef[]; strong: Edge[][]; weak: Edge[][]; notes: number[][] }
const key = ({ cell, digit }: CandidateRef) => cell * 9 + digit - 1
const coord = (cell: number) => `r${Math.floor(cell / 9) + 1}c${cell % 9 + 1}`
const label = (ref: CandidateRef) => `${coord(ref.cell)}=${ref.digit}`

function buildGraph(notes: number[][], units: readonly number[][], peers: readonly number[][], spend: Spend): Graph {
  const nodes: CandidateRef[] = [], strong: Edge[][] = Array.from({ length: 729 }, () => [])
  const normalized = notes.map((ns, cell) => {
    spend(ns.length + 1)
    const digits = [...new Set(ns)].filter(d => Number.isInteger(d) && d >= 1 && d <= 9).sort((a, b) => a - b)
    for (const digit of digits) nodes.push({ cell, digit })
    return digits
  })
  function connect(a: CandidateRef, b: CandidateRef, house: number) {
    spend()
    if (!strong[key(a)].some(edge => edge.to === key(b))) {
      strong[key(a)].push({ to: key(b), house })
      strong[key(b)].push({ to: key(a), house })
    }
  }
  units.forEach((unit, house) => {
    spend(unit.length + 1)
    if (unit.length !== 9 || new Set(unit).size !== 9 || unit.some(c => !Number.isInteger(c) || c < 0 || c >= 81)) return
    for (let digit = 1; digit <= 9; digit++) {
      spend(9)
      const positions = unit.filter(c => normalized[c].includes(digit))
      if (positions.length === 2) connect({ cell: positions[0], digit }, { cell: positions[1], digit }, house)
    }
  })
  normalized.forEach((digits, cell) => {
    spend()
    if (digits.length !== 2) return
    const [a, b] = digits.map(digit => key({ cell, digit }))
    strong[a].push({ to: b, cell })
    strong[b].push({ to: a, cell })
  })
  const weak: Edge[][] = Array.from({ length: 729 }, () => [])
  for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
    spend()
    if (!exclusive(nodes[a], nodes[b], peers)) continue
    weak[key(nodes[a])].push({ to: key(nodes[b]) })
    weak[key(nodes[b])].push({ to: key(nodes[a]) })
  }
  for (const edges of strong) edges.sort((a, b) => a.to - b.to)
  return { nodes, strong, weak, notes: normalized }
}
const ref = (id: number): CandidateRef => ({ cell: Math.floor(id / 9), digit: id % 9 + 1 })
function exclusive(a: CandidateRef, b: CandidateRef, peers: readonly number[][]) {
  return a.cell === b.cell ? a.digit !== b.digit : a.digit === b.digit && peers[a.cell].includes(b.cell)
}

function explain(links: InferenceLink[], eliminations: CandidateRef[], technique: ChainTechnique, wrap: boolean): Deduction {
  const first = links[0].from, last = links[links.length - 1].to
  const path = label(first) + links.map(link => ` ${link.kind === 'strong' ? '==' : '--'} ${label(link.to)}`).join('')
  return {
    technique,
    cells: [...new Set([first.cell, ...links.map(link => link.to.cell)])],
    digit: eliminations[0].digit,
    placements: [], eliminations,
    proof: { kind: 'chain', links, conclusion: 'endpoint-disjunction' },
    explanation: `${technique === 'simple-coloring' ? `Simple Coloring ${wrap ? 'wrap' : 'trap'}` : technique === 'xy-chain' ? 'XY-Chain' : technique === 'aic' ? 'Alternating Inference Chain' : 'X-Chain'}: ${path}. Each == is a strong link (at least one is true); each -- is a weak link (not both are true). Alternating links prove ${label(first)} or ${label(last)} is true. Remove ${eliminations.map(label).join(', ')}: each conflicts with both endpoints.`,
  }
}

/** Candidate-only logic: no solution search, trial assignments or forcing nets. */
export function findChainDeduction(notes: number[][], units: readonly number[][], peers: readonly number[][], spend: Spend, options: ChainOptions = {}): Deduction | null {
  if (notes.length !== 81 || peers.length !== 81) return null
  const graph = buildGraph(notes, units, peers, spend)
  const bounded = (requested: number | undefined, ceiling: number) => requested === undefined ? ceiling : Number.isNaN(requested) ? 0 : Math.min(ceiling, Math.max(0, Math.floor(requested)))
  const maxLinks = bounded(options.maxLinks, CHAIN_MAX_LINKS)
  const maxStates = bounded(options.maxStates, CHAIN_MAX_STATES)
  let states = 0
  const checked = (links: InferenceLink[], removals: CandidateRef[], technique: ChainTechnique, wrap: boolean) => {
    const deduction = explain(links, removals, technique, wrap)
    // Charge the direct cardinality/candidate checks too, before publishing a proof.
    spend(81 + links.length * 27 + removals.length * 9)
    if (!validateChainProof(graph.notes, units, peers, deduction)) throw new Error('Invalid inference-chain certificate')
    return deduction
  }
  for (const technique of options.techniques ?? ['simple-coloring', 'x-chain', 'xy-chain', 'aic']) {
    for (const start of graph.nodes) {
      if (states >= maxStates) throw new LogicalBudgetError()
      states++
      const queue: { ids: number[]; links: InferenceLink[] }[] = [{ ids: [key(start)], links: [] }]
      for (let head = 0; head < queue.length; head++) {
        spend()
        const state = queue[head], end = state.ids[state.ids.length - 1]
        if (state.links.length % 2 === 1) {
          spend(graph.nodes.length)
          const removals = graph.nodes.filter(n => !state.ids.includes(key(n)) && exclusive(n, start, peers) && exclusive(n, ref(end), peers))
          // A target conjugate to one endpoint has the other endpoint's color:
          // their mutual exclusion is the same-color conflict of a coloring wrap.
          const wrapped = technique === 'simple-coloring' ? removals.filter(n => graph.strong[key(n)].some(e => e.to === key(start) || e.to === end)) : []
          const isColoring = state.links.every(link => graph.strong[key(link.from)].some(e => e.to === key(link.to)))
          if (wrapped.length) return checked(state.links, wrapped, technique, true)
          const suitable = technique === 'xy-chain'
            ? start.digit === ref(end).digit && state.links.length >= 5
            : technique === 'aic'
              ? state.links.some(link => link.to.digit !== start.digit) && state.links.some(link => link.house !== undefined)
              : technique !== 'x-chain' || !isColoring
          if (state.links.length >= 3 && removals.length && suitable) return checked(state.links, removals, technique, false)
        }
        if (state.links.length >= maxLinks) continue
        const edges = technique === 'simple-coloring' || state.links.length % 2 === 0 ? graph.strong[end] : graph.weak[end]
        for (const edge of edges) {
          spend()
          if (state.ids.includes(edge.to)) continue
          if (technique === 'xy-chain') {
            if (state.links.length % 2 === 0 ? edge.cell === undefined : ref(edge.to).cell === ref(end).cell || ref(edge.to).digit !== ref(end).digit) continue
            if (ref(edge.to).cell !== ref(end).cell && state.ids.some(id => ref(id).cell === ref(edge.to).cell)) continue
          } else if (technique !== 'aic' && ref(edge.to).digit !== start.digit) continue
          if (states >= maxStates) throw new LogicalBudgetError()
          states++
          const link: InferenceLink = {
            from: ref(end), to: ref(edge.to), kind: state.links.length % 2 === 0 ? 'strong' : 'weak',
            ...(edge.house !== undefined ? { house: edge.house } : {}),
            ...(edge.cell !== undefined ? { cell: edge.cell } : {}),
          }
          queue.push({ ids: [...state.ids, edge.to], links: [...state.links, link] })
        }
      }
    }
  }
  return null
}

/** Recheck the certificate directly against candidate domains, without searching the graph. */
export function validateChainProof(notes: number[][], units: readonly number[][], peers: readonly number[][], deduction: Deduction): boolean {
  const proof = deduction.proof
  if (notes.length !== 81 || peers.length !== 81 || proof?.kind !== 'chain' || proof.conclusion !== 'endpoint-disjunction') return false
  const links = proof.links
  if (!links.length || links.length > CHAIN_MAX_LINKS || links.length % 2 !== 1 || deduction.placements.length || !deduction.eliminations.length) return false
  const present = (n: CandidateRef) => Number.isInteger(n.cell) && n.cell >= 0 && n.cell < 81 && Number.isInteger(n.digit) && n.digit >= 1 && n.digit <= 9 && notes[n.cell].includes(n.digit)
  const same = (a: CandidateRef, b: CandidateRef) => a.cell === b.cell && a.digit === b.digit
  const seen = new Set<number>()
  for (let i = 0; i < links.length; i++) {
    const link = links[i], { from, to } = link
    if (!present(from) || !present(to) || link.kind !== (i % 2 === 0 ? 'strong' : 'weak')) return false
    if (i === 0) seen.add(key(from))
    else if (!same(links[i - 1].to, from)) return false
    if (seen.has(key(to))) return false
    seen.add(key(to))
    if (!exclusive(from, to, peers)) return false
    if (link.house !== undefined) {
      if (!Number.isInteger(link.house)) return false
      const unit = units[link.house]
      if (!unit || unit.length !== 9 || new Set(unit).size !== 9 || unit.some(c => !Number.isInteger(c) || c < 0 || c >= 81)) return false
      if (from.digit !== to.digit || !unit.includes(from.cell) || !unit.includes(to.cell) || link.cell !== undefined) return false
      if (link.kind === 'strong' && unit.filter(c => notes[c].includes(from.digit)).length !== 2) return false
    } else if (link.cell !== undefined) {
      if (from.cell !== link.cell || to.cell !== link.cell || new Set(notes[link.cell]).size !== 2) return false
    } else if (link.kind === 'strong') return false
  }
  const first = links[0].from, last = links[links.length - 1].to
  const removed = new Set<number>()
  for (const n of deduction.eliminations) {
    if (!present(n) || seen.has(key(n)) || removed.has(key(n)) || !exclusive(n, first, peers) || !exclusive(n, last, peers)) return false
    removed.add(key(n))
  }
  return true
}
