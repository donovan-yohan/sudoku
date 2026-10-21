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
- All authored borders, outlines, and icon strokes are at most 1px. Distinguish grid/section hierarchy using opacity, never line thickness. Zero rounded corners remains required.

## Engineering

Vite + React + TypeScript, static-first hosting on Vercel. Keep the engine and lesson definitions pure and testable. Name types before logic. Write behavioral tests before implementation and record real RED/GREEN checks. Every puzzle has one solution; difficulty labels require logical evidence rather than clue count alone. Validate local storage as untrusted input and degrade safely when unavailable. Match daily puzzle identity across visitors using UTC date and deterministic selection.

All delegated profiles share the logical project `Sudoku` and this checkout. Each assignment grants disjoint files. Do not change other profiles' settings or import their private data. No worker commits, pushes, deploys, or purchases. Ebi integrates, reviews, verifies, and publishes.
