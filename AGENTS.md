# Sudoku

Public, MIT-licensed Sudoku learning app for https://sudoku.donovanyohan.com.

## Scope

- Daily and practice Sudoku, four genuinely rated difficulty levels.
- Interactive technique lessons from beginner to expert. Explain the logic before asking for a move or elimination. Use validated examples, not made-up puzzle states.
- Responsive desktop and mobile. Keyboard and touch. Dark and light modes.
- Flat monochrome resting design. Pure black and white, neutral grays only for hierarchy. Thin borders, zero rounded corners, no decorative shadows or persistent colored accents. Color is reserved for transient progress effects and the completion celebration.
- Soft, varied correct row/column/box completion effects that grow with progress. Early rewards are subtle and monochrome; later rewards may have transient chromatic shimmers. A completed puzzle gets a full-board color celebration. The resting interface stays monochrome. Respect reduced-motion preferences. Sound only after explicit opt-in.
- Local progress and preferences. No account, tracking, paid services, private profile records, or credentials in this public repository.

## Product UI

- Center the puzzle and compact controls. No hero, sidebar explainers, marketing slogans, reassurance, or instructional footer in daily/practice play.
- Hints use a lightbulb icon with an accessible name. Show the actual deduction only after a request; no card or paragraph introducing hints.
- Visible text must serve the current action. Delete internal proof/audit caveats and repeated obvious instructions rather than rephrasing them. Keep correctness evidence in tests and docs; put optional teaching detail behind a deliberate disclosure.
- Lessons use actual clue-based puzzles and demonstrate how the named technique leads to a real number placement. No abstract blank-grid candidate quizzes, place/eliminate radio forms, arbitrary target-candidate tasks or learning-process narration. Show a concise rule and a concrete step-by-step board change, with relevant notes only. Keep full validated domains and prior solve provenance internally; do not fill unrelated cells with 1–9 noise.
- All authored borders, outlines, and icon strokes are at most 1px. Distinguish grid/section hierarchy using opacity, never line thickness. Zero rounded corners remains required.
- Settings hold theme, completion effects and opt-in Show mistakes. Mistakes are off by default; when enabled, incorrect user entries may use red and a brief cell-only shake. Respect reduced motion. Notes is a stable-label pencil toggle; no auto-notes feature.
- Installable offline PWA uses original monochrome square icons and a complete versioned shell cache. Preserve local saves/preferences and never force a reload during a puzzle update.
- Classic, Killer and X modes use their actual constraints throughout generation, uniqueness, hints, notes and presentation. Daily identity uses a versioned UTC date + game mode + difficulty seed; archive starts 2026-01-01, navigation ends today. Random practice has separate persisted identities. Beginner needs generous starting structure and an approachable singles-only path.
- Keypad digits with at least nine visible copies are dimmed and disabled without consulting solution correctness. Newly completed correct sets of nine earn staggered digit-only hop/shimmer effects once per attempt, respecting effects-off/reduced-motion and no undo/reload replay.

## Engineering

Vite + React + TypeScript, static-first hosting on Vercel. Keep the engine and lesson definitions pure and testable. Name types before logic. Write behavioral tests before implementation and record real RED/GREEN checks. Every puzzle has one solution; difficulty labels require logical evidence rather than clue count alone. Validate local storage as untrusted input and degrade safely when unavailable. Match daily puzzle identity across visitors using UTC date and deterministic selection.

All delegated profiles share the logical project `Sudoku` and this checkout. Each assignment grants disjoint files. Do not change other profiles' settings or import their private data. No worker commits, pushes, deploys, or purchases. Ebi integrates, reviews, verifies, and publishes.
