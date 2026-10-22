import type { Difficulty, Technique } from './types'

/** Product-owned logical bands, not an empirically calibrated human scale. */
export const TECHNIQUE_TIER: Record<Technique, number> = {
  'naked-single': 0,
  'hidden-single': 1, 'locked-candidates': 1, 'naked-pair': 1, 'hidden-pair': 1,
  'naked-triple': 2, 'hidden-triple': 2, 'x-wing': 2,
  'naked-quad': 3, 'hidden-quad': 3, swordfish: 3, 'xy-wing': 3,
  'xyz-wing': 3, 'w-wing': 3, jellyfish: 3, 'finned-x-wing': 3,
  'simple-coloring': 3, 'x-chain': 3, 'xy-chain': 3, aic: 3,
}
export const SOLVER_POLICY = 'logical-expert-v2'
export const DEFAULT_LOGICAL_WORK = 2_000_000
export function availableDifficulties(variant: 'classic' | 'x' | 'killer'): Difficulty[] {
  if (!['classic', 'x', 'killer'].includes(variant)) throw new TypeError('Unknown Sudoku variant')
  return variant === 'classic' ? ['beginner', 'intermediate', 'advanced', 'expert'] : ['beginner', 'intermediate', 'advanced']
}
export class LogicalBudgetError extends Error {
  constructor() { super('Logical operation budget exhausted'); this.name = 'LogicalBudgetError' }
}
export interface LogicalOptions {
  maxTier?: number
  maxWork?: number
  /** A caller-owned ledger keeps one budget across families and solve steps. */
  spend?: (amount?: number) => void
  /** Chain certificates are initially qualified only for Classic. */
  chains?: boolean
}
