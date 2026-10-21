# Daily Sudoku learning — product brief

Author: Koi (product framing). Assignment context: parent session the originating build session; logical project Sudoku (the Sudoku project).

## Basis and outcome

Known requirements: the user request and checkout `AGENTS.md`. This is a fresh project brief, not evidence of implemented behavior or user research. Architecture and curriculum boundaries below are proposals for Ebi to integrate.

Help someone solve today's puzzle and learn a reusable logical technique when stuck, on phone or desktop. Success means the learner can explain and make a justified placement or elimination, not merely reveal an answer. Assumption to test: short, focused scenarios transfer better than a long reference article; no research or retention claims are made.

## Lean release scope

Release one coherent loop: choose a genuinely rated puzzle → play → get a logical explanation → practice that technique → return to the unchanged puzzle.

- Daily: one deterministic UTC puzzle per difficulty per day, shared across visitors; a finite, validated practice bank at the same four levels.
- Four levels: Beginner, Intermediate, Advanced, Expert. Publish a versioned technique-based rubric and each puzzle's required logical trace; clue count is not a rating. Proposed ceilings: singles; locked candidates/pairs; triples/X-Wing; Swordfish/XY-Wing. Assign the lowest tier with a completed supported logical solve, with a required above-prior-tier step for non-beginner puzzles. Reject puzzles requiring guessing or unsupported logic. These labels describe this app's rubric, not a universal measure of human difficulty.
- Minimum curriculum spanning beginner to expert: naked single, hidden single, locked candidates, naked pair, naked triple, X-Wing, Swordfish, XY-Wing. Each gets an explanation, guided scenario and separate transfer scenario. Do not market this as exhaustive mastery of all Sudoku techniques. A level ships only with supported explanations for every technique its puzzle traces use.
- Essential play: digit entry, erase, manual pencil marks, undo/redo, restart confirmation, explicit hints, local resume and completion summary. Valid alternate moves must remain possible; a walkthrough is not a forced move sequence.
- Mobile/desktop, keyboard/touch, light/dark, local preferences; flat monochrome visual system and quiet completion feedback.

Not in this release: accounts, cloud sync, leaderboards, streak pressure, social sharing, ads/analytics, payments, multiplayer, runtime puzzle generation, exhaustive advanced curriculum or unlimited practice. No login gate. Archive browsing and more content can follow after the core loop is verified.

## Primary journeys

1. **New learner:** open Daily → see UTC date and four explained levels → start Beginner → request a hint → see the rule and relevant cells before revealing the action → open its guided scenario → make a reasoned move → solve a separate transfer scenario → return to the same saved daily board.
2. **Returning solver:** open on another day → resume the unfinished board with its original date or explicitly start today's puzzle → use notes and undo → finish → see completion and whether hints were used. No forced midnight reset or loss of yesterday's work.
3. **Intentional practice:** open Lessons without starting a puzzle → choose a technique with visible prerequisites → inspect the rule → try a placement/elimination → receive specific feedback → retry or complete transfer → optionally choose a matching practice puzzle.
4. **Expert on phone or desktop:** choose Expert → inspect the rating explanation → solve with touch or keyboard → ask for a supported next logical step, not a random digit → finish with the same rules and progress semantics as other levels.

## Observable release acceptance criteria

| ID | Acceptance / evidence required |
| --- | --- |
| P1 Daily identity | Two fresh clients using the same catalog version, UTC date and level receive the same puzzle ID independent of local timezone. Test both sides of UTC midnight. An open board never silently changes at rollover. Show the date explicitly as UTC. |
| P2 Puzzle integrity | Every shipped puzzle has 81 valid cells, consistent givens and exactly one solution; an independent solution counter verifies uniqueness. Its full replayable logical trace solves it under the published rubric. No difficulty derived solely from clue count. Catalog validation fails the build for invalid or unclassified entries. |
| P3 Play correctness | Givens cannot change. Entries, erase, notes, undo/redo and confirmed restart behave consistently with keyboard and touch. Partial valid units are not marked complete; a filled but incorrect board is not a win. Wrong guesses are not silently replaced by solution values. |
| P4 Functional teaching | Every scoped technique has at least one validated guided scenario and one distinct transfer scenario, with prerequisites and explanation before an action request. Learners select the actual cell/digit placement or elimination. Correct actions produce a rule-based explanation; incorrect actions explain the failed condition without advancing or destroying the state. |
| P5 Sound reasoning | Automated fixtures verify each claimed placement/elimination from the displayed givens and candidate context; examples may not depend on hidden solution lookup or arbitrary user pencil marks. Replay confirms highlighted evidence and resulting state. A transfer scenario has a different layout, not just a renamed lesson step. |
| P6 Useful hints | A hint first names the technique and relevant evidence; revealing the action is a separate deliberate step. Opening it does not mutate the board. Return from a lesson preserves the originating puzzle, entries and notes. If current entries are inconsistent or the supported solver has no justified step, explain that honestly rather than inventing a hint. |
| P7 Local continuity | Reload restores board, notes, date, puzzle ID, lesson progress and preferences when storage works. Validate schema/version, ranges and consistency before restoring. Corrupt, obsolete or unavailable storage does not crash or imply saved progress; offer a clear reset/recovery path. Do not claim cross-device sync. |
| P8 Accessible input | Core play and lessons are usable at 360px phone width and desktop without horizontal page scrolling; test touch and keyboard end-to-end. Provide visible focus, accessible cell coordinates/value/given/notes, labelled controls and announced feedback. Number-pad/control targets are at least 44px; where dense cells are smaller, retain a separate large input pad and avoid precision-only gestures. No information conveyed by animation alone. |
| P9 Visual behavior | Pure black/white with neutral gray hierarchy, inverse dark mode, thin borders, zero rounded corners, no decorative shadows or color accents. Each newly correct completed row/column/box gets a subtle original line-sweep or luminance pulse, never layout movement or an interaction lock. Multiple units completing together remain quiet; redraw/reload does not replay rewards. Reduced motion substitutes a static acknowledgement. Sound is off unless explicitly enabled. |
| P10 Finish and practice | Completion verifies the board, saves status locally and offers another practice puzzle or lesson. Show hint usage without shaming. Exhausted practice inventory is disclosed; do not imply unlimited unique puzzles or fabricate a new puzzle. |
| P11 Static delivery | Vite React TypeScript build works as static assets on Vercel, with direct-route reloads tested if routes are used. Test missing/failed catalog fetch and uncovered dates: explain unavailability, preserve progress and offer available practice; never label an old board as today's. UTC comes from the device clock, so incorrect clocks remain an explicitly documented limitation. |
| P12 Public safety | Public repository is `donovan-yohan/sudoku`, MIT licensed. No credentials, private records, accounts, tracking or paid services are required. Shipping solutions in static assets is acceptable for a learning app; make no anti-cheat or competitive-integrity claim. |

Gate the release on these behavioral checks, including real RED/GREEN evidence per repository guidance; screenshots alone cannot verify teaching or puzzle validity. Manual checks must include phone-size touch, desktop keyboard, light/dark and reduced motion. This document does not assert those checks have run.

## Proposed architecture A — validated static content first

**Recommendation:** generate/curate and validate content before deployment; serve immutable, versioned JSON plus the React app. Keep the engine and lesson predicates pure TypeScript, separate from presentation and browser storage. Content build tooling may generate candidate puzzles offline, but generation is not required in the browser or at request time.

- Build pipeline: puzzle inputs → independent uniqueness check → supported logical solve/rating → lesson rule validation → dated manifest and content-addressed assets. Reject invalid content before publishing. Commit/version the rubric alongside the content.
- Explicit manifest maps `(UTC date, level)` to stable puzzle IDs; never derive daily identity from array position, random choice or local timezone. Freeze already published dates across catalog updates. Publish at least 90 future UTC dates at launch (a proposed content budget); replenishment is a release responsibility, not a promise of perpetual autonomous operation.
- Static content API: `GET /content/v1/daily.json`, `GET /content/v1/puzzles/{id}.json`, `GET /content/v1/lessons/{id}.json`; no mutation endpoint, account service or database. Manifest references a catalog version and matching immutable asset paths. Browser validates fetched data; partial/stale releases fail gracefully.
- Daily navigation reads UTC once per lookup; in-progress state retains its original identity. No network is needed to keep playing an already loaded board, but full offline cold start is not promised without an explicit cache/service-worker scope.
- Store only bounded, versioned local progress/preferences keyed by puzzle/lesson identity. Derive candidates from board rules, not user notes. Treat saved data and downloaded JSON as untrusted input.

### API/type sketch (contract proposal, not implemented code)

```ts
type Level = 'beginner' | 'intermediate' | 'advanced' | 'expert';
type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type Cell = number; // runtime integer guard: 0..80
type Board = readonly (Digit | 0)[]; // runtime exact-length guard: 81
type Technique = 'naked-single' | 'hidden-single' | 'locked-candidates'
  | 'naked-pair' | 'naked-triple' | 'x-wing' | 'swordfish' | 'xy-wing';
type Action = { kind: 'place' | 'eliminate'; cell: Cell; digit: Digit };
type LogicalStep = {
  technique: Technique; evidenceCells: Cell[];
  actions: Action[]; explanationKey: string;
};
interface Puzzle {
  id: string; schemaVersion: 1; givens: Board; solution: Board;
  rating: { level: Level; rubricVersion: string; trace: LogicalStep[] };
}
interface DailyManifest {
  schemaVersion: 1; catalogVersion: string;
  days: Record<string, Record<Level, string>>; // validated YYYY-MM-DD UTC → IDs
}
interface Scenario {
  id: string; board: Board;
  candidates: ReadonlyArray<readonly Digit[]>; // validated logical context
  prompt: string; acceptedActions: Action[]; explanationKey: string;
}
interface Lesson {
  id: string; technique: Technique; prerequisites: Technique[];
  rule: string; guided: Scenario; transfer: Scenario;
}
// Pure functions; boundaries validate dates, indices, boards and schemas.
declare function dailyId(m: DailyManifest, utcDate: string, level: Level): string | null;
declare function nextLogicalStep(board: Board): LogicalStep | null;
declare function evaluateAction(s: Scenario, action: Action):
  { correct: boolean; explanationKey: string; evidenceCells: Cell[] };
```

Validators must establish more than these TypeScript shapes. In particular, scenario candidates need a replayable derivation from the board or documented preceding sound deductions. Accepted actions are all valid answers to the bounded prompt, not simply the first move in a recorded trace. `null` from hint logic is not proof of an invalid puzzle; UI distinguishes inconsistent entries, completion and unsupported/stalled logic.

### A versus runtime generation

| Trade-off | A: build-time validated static bank | Runtime generation |
| --- | --- | --- |
| Teaching quality | Inspectable examples, fixed traces and regression fixtures before release | Must validate uniqueness, level and teachability on the critical path |
| Daily consistency | Frozen date/level manifest, easy to reproduce a report | Requires a stable seeded algorithm and pinned version; client/version drift can change results |
| Mobile cost | Fetch small assets; immediate play | CPU/latency variability; browser workers/cancellation and bounded retries needed |
| Hosting | Static Vercel assets, no service secrets | Client generation can still be static; server generation adds API operation and cost |
| Inventory | Finite; explicit replenishment and uncovered-date handling | More potential variety, but rejection rates and quality are not automatically solved |

Prefer A for launch because verifiable teaching is the differentiator. Revisit client-side practice generation only when finite inventory is an observed problem, after measured mobile performance and the same correctness/rating gates. Keep daily identity independent of that experiment. Final architecture, implementation and release signoff remain with Ebi.

## Handoff and limits

This contribution defines scope and proposed contracts only. No app implementation, content corpus, solver traces, accessibility tests, deployment, domain ownership or repository publication has been verified here. No analytics are added to validate the product assumption: use consenting manual learner walkthroughs to observe whether a learner can independently apply the transfer scenario. Directory verification is not a named desktop-project association; no association was established in this task.
