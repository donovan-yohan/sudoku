# Implementation seam

Selected direction: static-first React/Vite app, pure TypeScript engine, validated local puzzle bank, deterministic UTC-date selection with seeded Sudoku-preserving transformations. No backend or runtime generation on mobile. Game and lesson progress remain local. Four levels use this app's versioned logical-solver rubric, never clue count alone.

Types live in src/types.ts. Arrays use zero-based row-major cell indices 0..80; zero means empty.

## Engine exports (src/engine.ts)

- UNITS: number[][] (rows 0..8, columns 9..17, boxes 18..26)
- peers(cell:number): number[]
- candidates(board:Board): number[][]
- solve(board:Board): Board|null
- countSolutions(board:Board,limit=2): number
- isValidBoard(board:unknown): board is Board (shape/range/givens consistent)
- findDeduction(board:Board,candidatesOverride?:number[][]): Deduction|null
- ratePuzzle(board:Board): {difficulty:Difficulty;techniques:Technique[];solved:boolean}

findDeduction checks techniques in increasing order. Use full candidate state; override permits retained proven eliminations. Explanations name actual coordinates/evidence. Honest null if unsupported; no solution reveal disguised as hint.

## Puzzle exports (src/puzzles.ts)

- DIFFICULTIES: Difficulty[]
- getDailyPuzzle(date:string,difficulty:Difficulty): Puzzle
- getPracticePuzzle(difficulty:Difficulty,seed:string): Puzzle

Stable date selection, digit/band/stack/row/column permutations preserve uniqueness and difficulty. Catalog base puzzles must actually rate as labeled, tested. Document finite structural bank rather than imply infinitely distinct patterns. Future dates deterministic without scheduled deployments.

## Game exports (src/game.ts, parent-owned)

- createGame(puzzle:Puzzle): GameState
- reduceGame(state:GameState,action:GameAction,puzzle:Puzzle): GameState
- completeUnits(values:Board,solution:Board): number[]
- readGame(puzzle:Puzzle): {state:GameState;warning:string|null}
- saveGame(state:GameState): boolean

## Lessons exports (src/lessons.ts)

- LESSONS: Lesson[] (all eight Technique values; two distinct scenarios each)
- evaluateLesson(scenario:Scenario,action:LessonAction): {correct:boolean;message:string}
- validateScenario(lesson:Lesson,scenario:Scenario): boolean

Lessons may explicitly use partial candidate diagrams instead of pretending arbitrary boards are unique puzzles. Label partial diagrams clearly, show all relevant candidates, validate the logical local claim, ensure at least one consistent completion/assignment. Teach rule before attempt. Scenario answer is one bounded placement/elimination target, not a forced whole solution. For stronger mathematical checks use independent local predicate tests and reject near-miss patterns.

## UI exports (src/App.tsx, src/main.tsx)

App default export. Import engine/puzzles/game/lessons via this seam and src/types.ts. src/styles.css owned by parent. Components can be in src/components/ and src/ui.test.ts only. Accessibility and keyboard semantics, no UI library needed.

Main layout: compact header with Sudoku + daily/practice/learn navigation + theme; one centered ~500px puzzle column with date, difficulty and compact controls. No hero, side panels or explanatory footer. All borders/outlines/strokes at most 1px, hierarchy through opacity. Icon-only lightbulb hint opens the actual deduction on request. Engineering proof caveats stay in developer docs and tests, not permanent UI disclaimers. Board role grid with 9 row containers and labelled gridcell button per cell, roving tabIndex. Keys arrows, 1..9, N notes, Backspace erase, cmd/ctrl Z undo /shift Z redo. Avoid shortcuts outside grid. Preserve board when entering/leaving learn. Lessons keep actual technique/task/proof available without catalog disclaimers or repetitive control narration.

Animation contract: correct newly completed units produce classes/data attributes for CSS. Variety set line-sweep/ripple/scan/constellation or equivalent, deterministic rotation by completion count. Early progress subtle neutral, later transient chromatic shimmer. Full board finale. Pure monochrome resting UI, square geometry. Persist rewarded units, no replay on reload or undo-redo. Live text plus reduced-motion. Parent will implement effect overlay if needed, expose data attributes and event hooks cleanly.
