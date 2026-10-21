import type { Board, Difficulty, Puzzle } from './types'
import { ratePuzzle, solve } from './engine'

export const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert']

/** Finite structural bank: four independently generated original bases per tier.
 * Generated offline by scripts/generate-puzzles.mjs, seed 1637910 (190 attempts).
 * No third-party puzzle corpus. All bases have one solution and a complete logical
 * solve at exactly their label under engine rubric v1; tests replay every step.
 * Dates/practice seeds select and transform these bases, not infinitely new patterns.
 */
export const CATALOG: Readonly<Record<Difficulty, readonly string[]>> = {
  beginner: [
    '028040000000200005004690000009000000800302076700000052000000007450100600070000109',
    '010200050006000230008000000004000008003046090050080700020001000400305000001004080',
    '000004201007600000018000407000086000004000000300200086005010003800560040900000000',
    '004096001000500400000320000013060200000049050050000109030070000809000043002000000',
  ],
  intermediate: [
    '000900603506340001000001000005009028000005070062030000000000049040000100007500030',
    '006700000040600000002000430300001000050004010097000300000020180000000009800059600',
    '007030000009008100540000000608007040003040000000200090000500700000804001932070005',
    '300900700500062090608100002200040001050008070000090800000570069000000000000003400',
  ],
  advanced: [
    '905030000010000008000020000008040007209100800070800100000007030400090000503000200',
    '000050009040072005009000000860009007000010060002704000000200900024000010000085074',
    '610000000503010002000009100000905000000230070009000056007800600000006005000004003',
    '000507008090100570000200010000000400750046000000008030070000080010000009006003004',
  ],
  expert: [
    '007035000000700100800406005065000400008900700400000019000200080050018004000003000',
    '000000008000034070700000009800209000000503080200080006900057010020000007008040300',
    '320050000904007005000000109000000000807024090019000000002000804000005001050609000',
    '700090650910000000000206040000900207049002000000080000100670000800305000000000008',
  ],
}

function seeded(seed: string): () => number {
  let state = 2166136261
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619)
  return () => {
    state = (state + 0x6D2B79F5) | 0
    let t = state
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
function shuffle<T>(list: T[], random: () => number): T[] {
  const result = list.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
function transformation(random: () => number): (board: Board) => Board {
  const axis = () => shuffle([0,1,2], random).flatMap(group => shuffle([0,1,2], random).map(i => group * 3 + i))
  const rows = axis(), cols = axis(), digits = [0, ...shuffle([1,2,3,4,5,6,7,8,9], random)]
  const transpose = random() < 0.5
  return board => Array.from({ length: 81 }, (_, cell) => {
    const r = rows[Math.floor(cell / 9)], c = cols[cell % 9]
    return digits[board[transpose ? c * 9 + r : r * 9 + c]]
  })
}
const baseSolutions = new Map<string, Board>()
function select(mode: 'daily' | 'practice', seed: string, difficulty: Difficulty): Puzzle {
  if (!DIFFICULTIES.includes(difficulty)) throw new Error('Unknown difficulty')
  if (typeof seed !== 'string') throw new Error('Seed must be a string')
  const random = seeded(`sudoku-v1:${mode}:${difficulty}:${seed}`)
  const bank = CATALOG[difficulty]
  const index = Math.floor(random() * bank.length)
  const source = bank[index], givens = [...source].map(Number)
  let solution = baseSolutions.get(source)
  if (!solution) {
    const result = solve(givens)
    if (!result) throw new Error('Invalid catalog base')
    solution = result
    baseSolutions.set(source, result)
  }
  // Sudoku symmetries preserve uniqueness, but greedy solver order can change the
  // strongest technique it uses. Re-rate transformed boards rather than assuming
  // the operational rubric is invariant. Bounded retries end at the validated base.
  for (let attempt = 0; attempt <= 24; attempt++) {
    const transform = attempt < 24 ? transformation(random) : (board: Board) => board.slice()
    const transformed = transform(givens)
    const rating = ratePuzzle(transformed)
    if (!rating.solved || rating.difficulty !== difficulty) continue
    return { id: `v1:${mode}:${seed}:${difficulty}:${index}:${attempt}`, givens: transformed, solution: transform(solution), difficulty, techniques: rating.techniques.slice() }
  }
  throw new Error('Catalog base failed its declared rating')
}

/** A strict YYYY-MM-DD UTC civil date; no visitor timezone or clock dependency. */
export function getDailyPuzzle(date: string, difficulty: Difficulty): Puzzle {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Expected UTC date YYYY-MM-DD')
  const parsed = new Date(`${date}T00:00:00.000Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('Invalid UTC date')
  return select('daily', date, difficulty)
}
export function getPracticePuzzle(difficulty: Difficulty, seed: string): Puzzle { return select('practice', seed, difficulty) }
