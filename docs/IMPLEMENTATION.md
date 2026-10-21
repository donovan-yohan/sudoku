# Implementation seam

Static React/Vite app with a pure TypeScript constraint engine and deterministic generation in a dedicated Web Worker. No backend. Game and lesson progress remain local. Difficulty uses a versioned logical-solver rubric, never clue count alone. Classic supports four levels; X and Killer currently support Beginner, Intermediate and Advanced. Unsupported Expert variants are not relabeled easier puzzles.

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

These unchanged v1 helpers preserve existing saved puzzles and supply a certified Classic fallback. Sudoku symmetries preserve uniqueness, but transformed boards are rerated because detector order can change the operational tier.

New play uses `generatedDailyRequest(date,variant,difficulty)` or `generatedPracticeRequest(seed,variant,difficulty)` from `src/generated-puzzles.ts`. IDs include v2, daily/practice, UTC date or nonce, variant and difficulty. `src/generation-client.ts` creates a worker for the selected request and terminates it on cancellation. App checks request serials before adopting a result. A saved v1 puzzle remains reachable under its original identity.

`src/variant-engine.ts` owns validated rules, variant peers/candidates, bounded exact search, logical deductions and ratings. Killer cages form a complete connected partition, with distinct digits and exact sums. Search exhaustion is never uniqueness. `src/variant-generator.ts` creates original randomized MRV completions and generous Beginner positions. Classic/X Beginner has 45 givens, several immediate singles and a complete naked-single path. Killer Beginner has no numeric givens, small cages and singleton-sum entry points.

Harder Classic/X generation has a fixed operation budget, then uses independently certified, rerated templates if needed. Harder Killer currently uses a finite certified template bank with spatial symmetries, not digit permutations that could invalidate cage sums. Random practice is not a promise of infinitely distinct hard structures. Generator metadata retains origin/fallback information; no wall-clock deadline changes daily content. The independent grouped-assignment oracle is `scripts/variant-oracle.mjs`.

## Game exports (src/game.ts, parent-owned)

- createGame(puzzle:Puzzle): GameState
- reduceGame(state:GameState,action:GameAction,puzzle:Puzzle): GameState
- completeUnits(values:Board,solution:Board): number[]
- readGame(puzzle:Puzzle): {state:GameState;warning:string|null}
- saveGame(state:GameState): boolean

## Practical lessons

- `src/practical-lessons.ts` exposes eight general techniques with replayable provenance. X-Wing has four real positions and every other technique has two.
- `src/practical-variant-lessons.ts` exposes four diagonal/cage techniques, each with two real positions.
- `src/components/Walkthrough.tsx` reveals and applies the stored deductions through a real placement, pruning related notes as values change.

The general JSON comes from `scripts/generate-practical-lessons.mjs`. Tests independently prove source uniqueness, replay earlier deductions and validate each named pattern and consequence. Variant tests prove complete diagonal/cage solutions and opposite-action impossibility. Full candidate domains remain internal; complete candidate lists are shown only in the relevant cells. The legacy `lessons.ts` mathematical fixtures remain test inputs, not the rendered quiz interface.

## UI exports (src/App.tsx, src/main.tsx)

App default export. Import engine/puzzles/game/lessons via this seam and src/types.ts. src/styles.css owned by parent. Components can be in src/components/ and src/ui.test.ts only. Accessibility and keyboard semantics, no UI library needed.

Main layout: compact header with Sudoku + daily/practice/learn navigation + theme; one centered ~500px puzzle column with date, difficulty and compact controls. No hero, side panels or explanatory footer. All borders/outlines/strokes at most 1px, hierarchy through opacity. Icon-only lightbulb hint opens the actual deduction on request. Engineering proof caveats stay in developer docs and tests, not permanent UI disclaimers. Board role grid with 9 row containers and labelled gridcell button per cell, roving tabIndex. Keys arrows, 1..9, N notes, Backspace erase, cmd/ctrl Z undo /shift Z redo. Avoid shortcuts outside grid. Preserve board when entering/leaving learn. Lessons keep actual technique/task/proof available without catalog disclaimers or repetitive control narration.

Animation contract: correct newly completed units produce classes/data attributes for CSS. Variety set line-sweep/ripple/scan/constellation or equivalent, deterministic rotation by completion count. Unit duration 1200ms + 35ms per completed unit without increased intensity. Early progress subtle neutral, later transient chromatic shimmer. Full board finale. Correct digit-set completion also earns staggered hops/shimmers on matching digit spans, never moving the gridcell or board. Persist reward acknowledgements, no replay on reload or undo-redo. Live text plus reduced-motion.

## Modes, archive and learning groups

Use versioned date/mode/difficulty seeds for generated Classic, X (both diagonals 1–9) and Killer (connected sum cages without repeated digits). Validation, uniqueness, hint candidates and note pruning must respect the selected constraints. Beginner should have generous starting structure and a naked-single-only path, not merely the old sparse bank under a softer label. Never infer expert difficulty from clue count alone.

Daily archive uses native date/calendar input with previous/next-day controls, bounded from 2026-01-01 through the device's current UTC date. Future days remain generatable from their stable seeds but are not navigable before their date. Preserve per-mode/difficulty/date progress and separate random-practice identities.

Learning separates General, X Sudoku and Killer Sudoku catalogs. General techniques remain available to every player; variant sections contain validated diagonal and cage techniques, not duplicated general lessons with changed headings. Each lesson uses a real puzzle position and demonstrates its technique through to a number placement. Show a concise rule, relevant board notes and specific mathematical steps. Remove prerequisite lists, instructional checklists, candidate-study captions, place/eliminate radio forms, arbitrary candidate-elimination quizzes and learning-process narration. Internally retain original puzzle and replayable prior deductions; display notes are only a projection of verified domains.

X-Wing has four examples, two per orientation. Optional typed rectangle metadata supports two read-only possibility tables alongside the revealed case-by-case explanation. Hypotheses never become board entries; only the recorded eliminations and final placement advance the walkthrough. The additional examples replay transformed original clues, not hand-transformed candidate snapshots. Sharing metadata uses `Daily Sudoku` and one approved 1200×630 PNG.

Naked triple, Swordfish and XY-Wing explanations name full relevant candidate lists, the causal argument and the target's before/after domains. Swordfish covers row- and column-based reasoning. Its second example chooses an independently validated alternative premise at the identical recorded state without changing detector actions or prior history. Tests keep that exception local to the displayed teaching step.
