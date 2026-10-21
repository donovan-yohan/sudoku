import data from './practical-lesson-data.json'
import type { Board, Deduction, Difficulty, Technique } from './types'

/** Rectangle coordinates are zero-based, matching board and candidate indices. */
export interface XWingPattern {
  digit: number
  orientation: 'rows' | 'columns'
  rows: [number, number]
  columns: [number, number]
}

/** A complete, replayable Sudoku position, never an isolated candidate diagram. */
export interface PracticalScenario {
  id: string
  variant: 'classic'
  kind: 'place'
  caption: string
  board: Board
  candidates: number[][]
  evidence: number[]
  steps: (Deduction & { board: Board; candidates: number[][]; xWing?: XWingPattern })[]
  target: number
  digit: number
  prompt: string
  proof: string
  provenance: {
    source: 'catalog' | 'practice' | 'generated' | 'generated-transform'
    puzzleId: string
    originalPuzzle: Board
    priorSteps: Deduction[]
    seed?: string
    tier?: Difficulty
    attempt?: number
    /** Original source before a Sudoku-preserving transformation. */
    sourcePuzzle?: Board
    transformation?: { transpose: boolean; digitShift: number }
  }
}

export interface PracticalLesson {
  id: Technique
  generalTechnique: Technique
  title: string
  tier: Difficulty
  rule: string
  summary: string
  scenarios: PracticalScenario[]
}

// The offline generator is the sole data authority. Tests independently replay
// every prefix and check uniqueness with the standalone, non-engine oracle.
export const PRACTICAL_LESSONS: PracticalLesson[] = data.map(lesson => ({
  ...lesson,
  summary: lesson.rule,
})) as PracticalLesson[]
