export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type Board = number[]
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type Technique = 'naked-single' | 'hidden-single' | 'locked-candidates' | 'naked-pair' | 'naked-triple' | 'x-wing' | 'swordfish' | 'xy-wing'
export interface Deduction {
  technique: Technique
  cells: number[]
  digit: number
  placements: { cell: number; digit: number }[]
  eliminations: { cell: number; digit: number }[]
  explanation: string
}
export interface Puzzle {
  id: string
  givens: Board
  solution: Board
  difficulty: Difficulty
  techniques: Technique[]
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
  elapsed: number
  hintsUsed: number
}
export type GameAction =
 | { type: 'select'; cell: number }
 | { type: 'digit'; digit: number }
 | { type: 'erase' | 'undo' | 'redo' | 'toggle-notes' | 'auto-notes' | 'tick' | 'hint-used' | 'restart' }
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
