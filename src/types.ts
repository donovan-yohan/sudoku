export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type Board = number[]
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type Technique = 'naked-single' | 'hidden-single' | 'locked-candidates' | 'naked-pair' | 'naked-triple' | 'x-wing' | 'swordfish' | 'xy-wing' | 'hidden-pair' | 'hidden-triple' | 'hidden-quad' | 'naked-quad' | 'xyz-wing' | 'w-wing' | 'jellyfish' | 'finned-x-wing' | 'simple-coloring' | 'x-chain' | 'xy-chain' | 'aic'
export interface CandidateRef { cell: number; digit: number }
export interface InferenceLink {
  from: CandidateRef
  to: CandidateRef
  kind: 'strong' | 'weak'
  /** A full row/column/box index, or a bivalue cell. */
  house?: number
  cell?: number
}
export interface ChainProof {
  kind: 'chain'
  links: InferenceLink[]
  conclusion: 'endpoint-disjunction'
}
export interface Deduction {
  technique: Technique
  cells: number[]
  digit: number
  placements: { cell: number; digit: number }[]
  eliminations: { cell: number; digit: number }[]
  explanation: string
  proof?: ChainProof
}
export interface Puzzle {
  id: string
  givens: Board
  solution: Board
  difficulty: Difficulty
  techniques: string[]
  variant?: 'classic' | 'x' | 'killer'
  cages?: {cells:number[];sum:number}[]
  generatorVersion?: string
}
export interface GameSnapshot { values: Board; notes: number[][] }
export interface GameState extends GameSnapshot {
  version: 1
  puzzleId: string
  selected: number
  noteMode: boolean
  past: GameSnapshot[]
  future: GameSnapshot[]
  rewarded: number[]
  rewardedDigits: number[]
  /** Attempt-level acknowledgement; deliberately not part of undo snapshots. */
  completed: boolean
  elapsed: number
  hintsUsed: number
}
export type GameAction =
 | { type: 'select'; cell: number }
 | { type: 'digit'; digit: number; noteMode?: boolean }
 | { type: 'erase' | 'undo' | 'redo' | 'toggle-notes' | 'tick' | 'hint-used' | 'restart' }
export interface LessonAction { cell: number; digit: number; kind: 'place' | 'eliminate' }
export interface Scenario {
  id: string
  caption: string
  board: Board
  candidates: number[][]
  evidence: number[]
  target: number
  digit: number
  kind: 'place' | 'eliminate'
  prompt: string
  proof: string
}
export interface Lesson {
  id: Technique
  title: string
  tier: Difficulty
  summary: string
  rule: string
  prerequisites: string[]
  steps: string[]
  scenarios: [Scenario, Scenario]
}
