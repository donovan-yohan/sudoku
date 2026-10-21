# Sudoku — preimplementation QA acceptance matrix

Author: Kame (kame-qa), independent QA collaborator.
Target: logical project Sudoku (the Sudoku project), public source `donovan-yohan/sudoku`.
Checkout: `.`.
Parent session: the originating build session.
Intended production origin: `https://sudoku.donovanyohan.com` (not visited or tested).

## Receipt and evidence boundary

**PASS — planning artifact only. Product behavior: NOT RUN / UNVERIFIED.**

Observed during planning:
- `pwd` returned the authorized checkout above.
- Read root `AGENTS.md` and `package.json`; root instructions are the requirements authority. The package manifest declares Vite/React/TypeScript, Vitest and Playwright scripts; that does not prove dependencies install or scripts pass.
- A native file listing at inspection time exposed the root guidance and manifest, but no application or test sources. This is a snapshot, not a claim about concurrent contributors' later work.
- No application started, dependencies installed, browser opened, engine executed, storage mutated, or production endpoint checked. No RED/GREEN results exist from this assignment.
- Directory verified; named desktop project/session association not established. No desktop project bindings changed.
- Authorized write scope: this document only. No commits, pushes, deployment, purchases, profile edits, private records, or delegation.

An initial combined discovery command was blocked by the execution approval guard because it embedded `python3 -c`; separate `pwd` and native file-read calls completed discovery. That tooling block is not an application defect.

## Acceptance conventions

Every matrix row below has initial execution status **NOT RUN**. Expected outcomes are acceptance criteria, not observations. `E` denotes a pure engine/data check; `B` a browser interaction; `V` visual/computed-style inspection; `A` assistive technology/manual input. A future runner must record the exact tested revision and observed result for each row.

Project requirements: daily and practice modes, four genuinely rated levels, interactive beginner-to-expert lessons, keyboard/touch, monochrome light/dark themes, thin borders/no rounded corners/no decorative shadows, soft correct-unit rewards, reduced motion, opt-in sound, local progress, unique solutions, UTC deterministic daily identity, safe untrusted storage, static Vercel delivery. No account or tracking.

Some observable contracts are not yet specified. Resolve these before marking related tests PASS; do not silently invent their behavior:
- Four visible level names and an engine rating specification (allowed techniques, hardest required technique, tie-break/effort metric, and documented thresholds). This plan uses L1–L4, not guessed UI labels.
- A lesson catalog mapping beginner through expert, explicit supported techniques and prerequisites, and the intended expert ceiling. Proposed examples below are coverage suggestions, not an assertion of an existing catalog.
- Whether daily offers one fixed level or one puzzle per level. In either case the identity key must explicitly include the intended variant; equal date/variant must yield equal givens everywhere.
- Active-session behavior at UTC midnight; choose keep-current-with-new-day notice or explicit rollover. Never silently discard the active board.
- Practice selection/repeat policy, hint/error-check mode, timer behavior if present, undo/history persistence, and restart/completed-puzzle replay behavior.
- Reward replay policy after undo/re-entry and across reload. Baseline below requires idempotent rendering and no celebratory replay just from hydration. Explicit user replay can be a separate documented action.
- Storage schema/version, migration policy, and stable puzzle/lesson content versions. Progress must never attach to different givens after a content release.

## Fixture and oracle prerequisites

Do not bless fixtures because the production validator accepts them. Before executing the matrix, prepare an independently checked, versioned corpus:

| Fixture | Required construction and independent evidence |
| --- | --- |
| F-LEVEL | At least three distinct uniquely solvable puzzles for each L1–L4, including rating boundaries. Store 81-cell givens, canonical solution, stable ID/version, full logical trace and rating evidence. Use a separate solution counter capped at two, not the production uniqueness routine alone. |
| F-INVALID | Bad dimensions, invalid types/ranges, duplicate givens in each unit type, contradiction without immediate duplicate, zero-solution board, and multi-solution board. Preserve copies to assert validators do not mutate input. |
| F-REWARD | Independently validated states one correct entry short of a row, column, box, two intersecting units and all three; a complete conflict-free unit inconsistent with the unique solution; duplicate-filled units; and a board one correct entry short of completion. Include unit IDs and expected transition sets. |
| F-LESSON | Every shipped lesson scenario: board, givens, candidates derived from board constraints, focus pattern, explanatory premises, accepted move/elimination set, valid alternatives, rejected counterexamples and post-state. Independent solution enumeration proves accepted eliminations remove no possible solution digit. |
| F-STORAGE | Fresh store; valid partial/completed daily, practice and lesson saves; syntactically corrupt JSON; null/array/incorrect field types; oversized/malformed board; changed givens; stale/unknown version; mismatched ID/date/level; negative/nonfinite counters; duplicate candidates; corrupt lesson step; denied reads/writes; quota failure. |
| F-DATE | Freeze UTC clock before/after midnight, month/year rollover, leap-day transition and daylight-saving boundaries. Test visitor time zones UTC, America/New_York and Asia/Tokyo, including different local calendar days at the same instant. |

Fixture generation seeds and counterexamples must be retained. A stalled or unsupported logical solver is not evidence that a puzzle is expert; classify as unrated/reject until explained. Do not equate clue count, guessing, or a successful backtracking solve with a technique-based rating.

## Engine and puzzle-data matrix

| ID / kind | Setup and action | Required outcome / oracle |
| --- | --- | --- |
| E01 / E | Validate F-LEVEL with independent solver and production loader. | Exactly one solution per puzzle; givens unchanged and agree with solution; all solution rows/columns/boxes contain digits 1–9 exactly once. |
| E02 / E | Load every F-INVALID case through public engine boundaries. | Reject invalid/unsatisfiable/ambiguous puzzles with controlled results; no hangs, partial usable puzzle, mutation of source, or assumed canonical solution for ambiguous data. |
| E03 / E | Enter, replace, clear and note digits on editable cells; attempt each operation on givens; test out-of-range coordinates/digits and invalid input types. | Only valid editable operations affect state; givens immutable; rejected operations do not alter board/history. Candidates and values remain structurally valid. |
| E04 / E | Check row, column and box conflicts separately, including intersections; resolve one conflict while leaving another. | Correct cell/unit conflict sets; no false clean state; candidate notes do not count as placed digits. |
| E05 / E | Validate full correct board, full wrong board and incomplete conflict-free board. | Completion true only for full correct solution; local lack of duplicates is not sufficient for solved status. |
| E06 / E | Run deterministic generation/selection repeatedly for each frozen daily key across independent initializations/time zones. | Same stable ID, givens, solution and intended level for equal UTC date/variant/content version; no dependence on locale, random runtime seed or storage history. |
| E07 / E | Compare F-DATE boundary keys and daily catalog selections. | UTC date changes only at UTC midnight; valid puzzles at month/year/leap transitions; distinct date identity even if catalog eventually reuses a board. Define and test repeat cadence rather than assuming infinite uniqueness. |
| E08 / E | Generate/select practice for each L1–L4 over a reproducible seed sample; replay same seed. | Every result uniquely solvable and rated as requested; seed replay reproducible where supported; no daily state/key mutation. Sample/seed count documented; sampling is not proof over all seeds. |
| E09 / E | Rate all F-LEVEL and boundary fixtures; independently replay every logical trace. | Each step entailed by board constraints, trace finishes without guessing, rating meets documented band. L1–L4 have demonstrably different required logical work; relabeling identical distributions fails. |
| E10 / E | Feed a puzzle requiring a technique beyond a selected band's ceiling, and an unsupported/stalled case. | Never advertise as that lower band or automatically call a stalled case L4. Return supported rating or explicit unrated/rejected state. |
| E11 / E | Undo/redo if shipped, restart and new-puzzle operations after values/notes/hints. | Documented state transitions deterministic; original givens preserved; restart isolates current puzzle; daily and practice progress cannot bleed into one another. |
| E12 / E | Feed F-REWARD transitions to pure unit-completion derivation. | Output exactly newly correct unit IDs, not an event per rerender. Completed means every cell equals the independently verified unique solution, not merely filled or duplicate-free. Incorrect globally inconsistent units emit nothing. |
| E13 / E | Repeat last action, hydrate identical state, alter notes, select cells, and clear/re-enter last correct digit. | No events for no-op/selection/note/hydration. Re-entry follows explicit replay policy without accumulating duplicated events. |

## Browser daily/practice interaction matrix

Run the core flow on each responsive/theme combination in the coverage section; do not count screenshots of empty forms as interaction evidence.

| ID / kind | Setup and action | Required outcome |
| --- | --- | --- |
| B01 / B | Fresh local state; open app, select daily, enter values/notes, leave and return. | Daily identity/date and selected level are understandable; editable cells accept intended input; givens remain locked; return restores the same puzzle state rather than resetting. |
| B02 / B | Same frozen instant in two fresh browser contexts with different time zones/locales. | Same daily key and givens for the same intended variant; local date formatting does not select a different daily. |
| B03 / B | Keep partially played daily open across UTC midnight, background/foreground and reload. | Documented rollover UI; old progress retained under old key; new day opens correct puzzle; no mixed board/date or unrequested data loss. |
| B04 / B | For each L1–L4, start practice, make moves, return to daily, then resume practice. | Correct rated level shown and used; modes isolate state; new practice/restart behavior is explicit and protects existing progress per documented policy. |
| B05 / B+A | Keyboard only: navigate into board, move among cells, enter 1–9, delete, toggle notes, traverse controls and exit board. | Visible focus; predictable arrow keys and Tab route; accessible names for row/column/value/given/notes; no keyboard trap or browser-wide shortcut interception. |
| B06 / B+A | Touch: select edge/corner cells, enter/erase digits and notes with on-screen controls, change selected cell rapidly. | Exactly selected cell changes once per tap; no hover-only affordance; board selection preserved while using keypad; gestures do not accidentally enter a neighbor digit. |
| B07 / B | Enter an incorrect value, conflict, then correction; use hint/check if shipped. | Error/check behavior matches selected mode; no false solved state; correction clears appropriate feedback only; hint explains supported logic and never edits givens or misstates certainty. |
| B08 / B | Complete F-REWARD final board through actual UI input; dismiss result and reload. | Completion occurs once after final committed value, keyboard/touch remain usable; persisted completed state correct; no unsolicited sound or repeat victory on render/reload. |
| B09 / B | Repeated rapid entry, delete, mode changes and restart/new puzzle while feedback is active. | Stable final state corresponding to committed actions; no duplicate input, stranded animation overlay, stale highlights or completion from the previous puzzle. |

## Interactive technique lesson matrix (primary feature)

Catalog gate: every shipped technique must have a catalog entry, a validated interactive scenario and an explanation of why the logic applies. Suggested progression for product review: singles/hidden singles; locked candidates and pairs; triples/subsets and fish; advanced fish/wings/chains as the declared expert ceiling permits. The product may choose a different sound taxonomy, but must identify what its beginner and expert coverage actually teaches.

| ID / kind | Setup and action | Required outcome |
| --- | --- | --- |
| L01 / B+A | Open catalog using touch and keyboard; inspect the first and highest-level lessons. | Visible beginner-to-expert path, technique names, prerequisites and learning goals; expert content is not just beginner puzzles with fewer clues. All advertised lessons are reachable or explicitly marked unavailable, not dead links. |
| L02 / E | Validate every F-LESSON premise, candidate set and accepted action using independent oracle. | Pattern genuinely present; no unshown prerequisite deduction; all claimed eliminations/moves logically entailed. A correct final digit alone is not proof of the claimed technique. |
| L03 / B | Begin each lesson and advance through explanation before attempting a move/elimination. | Premises, relevant units/candidates and causal explanation presented before task. User performs an actual action; reading static slides alone cannot complete an interactive lesson. |
| L04 / B | Submit correct action; separately submit a valid alternative when multiple actions satisfy the stated task. | Accepted actions match authored task contract, not a single hardcoded click; appropriate explanatory feedback; board/candidates advance consistently. If only a focus action is requested, explain why another valid action is outside that task rather than calling it logically false. |
| L05 / B | Submit wrong digit, irrelevant elimination, elimination of the solution digit, and input outside task focus; retry. | Clear specific feedback tied to logic; no false success/completion; state remains recoverable and invalid actions do not poison later steps. No humiliating or color-only feedback. |
| L06 / B | Attempt skip/next before action, duplicate submit, back/forward and rapid tapping. | No accidental pass, duplicated step or stale feedback; intentional skip is labeled and not recorded as demonstrated mastery. |
| L07 / B | Request hint, reveal explanation/solution, restart and revisit. | Hints scaffold reasoning; reveal-assisted completion distinguishable from independently solved work where mastery is recorded. Restart returns a valid original scenario and resets only the intended attempt. |
| L08 / B | Complete a beginner, intermediate and expert lesson via real actions; reload mid-step and after completion. | Step, accepted actions and completion restore consistently; no auto-solving from hydration; expert interaction requires its advertised technique. |
| L09 / B+A | Use keyboard and screen reader on candidate-elimination and placement lessons at mobile and desktop widths. | Candidate controls distinguish value vs note vs elimination; pattern meaning described textually, not solely by animated highlighting. Explanation remains available while acting. |
| L10 / E+B | Validate and execute every scenario in the shipped catalog, not just one lesson per band. | Full scenario inventory reconciles to executed IDs; counterexamples for each technique rejected; no unsupported claim that a lesson tier passed from a representative sample alone. |

## Correct-unit reward and motion matrix

| ID / kind | Setup and action | Required outcome |
| --- | --- | --- |
| R01 / B+V | Finish row-only, column-only and box-only F-REWARD states. | One soft, short-lived monochrome effect per newly correct target unit; precisely that unit identified. Grid remains legible; no layout shift, focus theft or input interception. |
| R02 / B+V | Finish intersecting two-unit and three-unit states and final puzzle cell. | Exact completed-unit set celebrated, each once; coordinated effects do not multiply or obscure final puzzle feedback. Capture event IDs/counts as well as video. |
| R03 / B+V | Fill duplicate unit, incomplete unit with full notes, and conflict-free unit inconsistent with solution; make a correct entry that completes no unit. | No unit reward in any case, including no offscreen/inaudible celebration event. A green-looking board is not the correctness oracle. |
| R04 / B | Select/reselect, switch themes, resize, navigate away/back, reload completed state, and repeat no-op input. | No new reward caused solely by render, resize, navigation or hydration. Undo/re-entry follows recorded replay policy and cannot replay continuously. |
| R05 / B+V | Set `prefers-reduced-motion: reduce` before opening; complete units and a lesson; toggle preference during a session. | Non-moving feedback retains correctness information; no sweeping/scaling/translating celebratory motion. Any minimal opacity/static indication follows documented reduced-motion behavior immediately, not only after reload. |
| R06 / B+A | Fresh profile, complete units/puzzle/lessons; then explicitly opt in to sound if offered, reload, mute. | Silent by default; no autoplay attempt before consent. Opt-in/mute preference persists safely; visual/text equivalent always available. |
| R07 / V | Review normal-motion reward recording in both themes with repeated rapid completions. | Soft original minimalist effect, no flashes/strobe or saturated color; borders/cells remain readable. Duration/easing documented and reviewed against intent; aesthetic quality needs human review, not an invented automated score. |

## Responsive, monochrome and accessibility matrix

Coverage: use CSS viewport widths **320**, **390**, **1280** and **1440**; record heights (baseline 568, 844, 800 and 900 respectively). Test all four widths in light/dark, each with normal/reduced motion. Emulate Chromium for the full matrix; cross-check core play, lessons, persistence and motion in Firefox and WebKit. Emulation is not a real-device pass: separately record iOS Safari and Android Chrome touch checks when devices are available. Test landscape/short-height and mobile browser/keyboard chrome separately.

| ID / kind | Setup and action | Required outcome |
| --- | --- | --- |
| U01 / B+V | At each width/theme/motion combination, open daily, practice level selector, active board, lesson explanation/action and completion UI. | No horizontal document overflow, clipped controls, overlapping text or inaccessible actions. All 81 cells visible and distinguishable; ordinary vertical page scrolling allowed; no scaling the whole page to hide overflow. |
| U02 / B+V | At 320/390, operate all digit/candidate controls and read long explanations; rotate and resize mid-entry. | Board state/focus survives layout change; controls remain reachable; actual hit boxes tested at edges. Prefer 44 CSS-pixel primary touch controls; never rely on overlapping invisible targets to enlarge small board cells. Record any WCAG 2.2 target-size exception with spacing/alternative input evidence. |
| U03 / V | Inspect computed styles and screenshots for board, controls, overlays, active/disabled/error states and reward frames. | Pure black/white surfaces and neutral equal-RGB grays only for hierarchy; inverse dark theme; no colored semantic states, decorative shadows, gradients or rounded corners. Border radius zero on custom UI; thin borders with box boundaries still understandable. Distinguish browser/OS-owned UI from authored styles. |
| U04 / B+V | Toggle theme during play and lessons, reload and return. | Theme applies to all surfaces including dialogs; no lost input or false reward. Preference restored; selected theme/control name is accessible. Resolve system-theme default policy before testing first visit. |
| U05 / A+V | Keyboard walkthrough, 200% zoom, enlarged text, screen reader reading and live feedback; inspect contrast. | Usable focus and reading order; no color-only meaning; text contrast at least 4.5:1 (large text 3:1), meaningful controls/focus at least 3:1. Success/error announcements useful and not spammed on selection. No `user-scalable=no` or blocked pinch zoom. |
| U06 / B | Scroll during touch input, open/close dialogs and navigate back from lesson. | No stuck scroll lock, hidden focus, accidental board input behind modal or inaccessible close; modal restores focus to invoking control. |

## Local progress and corrupt-storage matrix

Run failure injection against the actual persistence boundary, not by merely clearing the browser manually. Malformed data is untrusted even on this static app.

| ID / kind | Setup and action | Required outcome |
| --- | --- | --- |
| S01 / E+B | Fresh state, then edit values/notes in daily and practice, progress a lesson, choose theme and allowed sound setting; reload and reopen. | Exact intended persistent state restored with correct mode/puzzle ID/version/date/level/lesson step. Ephemeral selection/timer/history follow declared policy. No false reward, duplicated completion or lost most-recent committed move. |
| S02 / E+B | Load each corrupt F-STORAGE value independently and reload app. | No blank screen/crash; reject invalid fields safely and recover to a usable known state with understandable notice when progress is lost. Never mutate givens, trust injected solutions or silently mark a lesson complete from unchecked data. |
| S03 / E+B | Save with valid shape but wrong puzzle identity, date, content version, level, solution/givens or contradictory history. | Schema validation plus semantic validation prevent attaching a save to another puzzle; preserve unrelated valid settings/progress where possible. Old-version migration only if explicit and tested; unknown future versions safely ignored. |
| S04 / E+B | Make storage getters/setters throw security errors, then simulate quota failure during autosave. | App playable in memory without crashing; nonpersistent mode/save failure disclosed; never report a successful save after failed write. Existing valid saves not destroyed by partial writes. |
| S05 / B | Reload immediately after a committed move and after completion, then close/reopen context using persisted origin storage. | Defined persistence timing verified; last committed change retained at promised boundary. Distinguish controlled reload from abrupt process termination and document limits of either test. |
| S06 / E+B | Rapid changes, restart, mode switch and two tabs editing the same/different puzzle keys. | No cross-puzzle corruption; documented same-key conflict strategy (last valid write or reconciliation), no crash on storage events or resurrection of a deleted/reset state without explanation. |
| S07 / E+B | Corrupt only lesson state, only one practice save, or only preferences. | Recovery scope limited to invalid record where feasible; valid daily progress not erased just because a preference is malformed. Reset action explicitly describes its scope. |
| S08 / B | Inspect storage and runtime network activity while playing/learning. | Only necessary local puzzle/lesson/preferences data; no credentials, account creation, trackers or unexpected analytics/remote writes. This check is scoped to observed flows, not a guarantee about all possible traffic. |

## Static delivery checks (later, authorized environment only)

| ID / kind | Setup and action | Required outcome |
| --- | --- | --- |
| H01 / build+B | Execute declared tests/build and run resulting static build locally; open entry and refresh every actual routed URL. | Real exit codes and artifacts retained; no runtime console/page errors or missing assets; routing works on direct load without a dynamic server dependency. A build pass does not substitute for browser flows. |
| H02 / B | When deployment verification is separately authorized, open intended HTTPS host, refresh lesson/practice URLs and inspect cache/update behavior. | Correct public app/version and assets; no mixed content; cache update cannot mix puzzle versions or overwrite valid progress. Not a deployment authorization from this document. |
| H03 / source | Inspect public release contents and license before publication by integrator. | MIT license present with appropriate attribution; no private records, credentials, tracking configuration or accidentally bundled test secrets. `private: true` in package metadata alone does not conflict with public MIT source and is not a privacy audit. |

## Execution receipt and release gating

Future run record per row:

`ID | revision/build | fixture + seed | browser/device/version | viewport/theme/motion/time zone | exact steps | expected | observed | PASS/ISSUES/BLOCKED/INCONCLUSIVE | evidence path | limitation`

- A PASS needs observed behavior and the relevant independent oracle. Save engine assertion output, failing seed/counterexample, and browser trace/screenshots/video/accessibility observations as applicable. A screenshot alone cannot prove state persistence, sound silence, correct solution logic or event cardinality.
- For behavioral development, retain real RED output before implementation and GREEN output afterwards; do not manufacture retrospective failures. No such commands were run here.
- Treat incorrect puzzles/lessons, false correctness rewards, corrupt-state crashes, lost/misattributed progress and inaccessible primary interactions as release-blocking issues. Classify severity from reproducible impact, not dramatic labels.
- Unresolved product contracts block their affected rows; missing browser/device infrastructure is a test limitation, not an app failure. A broken fixture/oracle must be repaired before assigning a product defect.
- Inventory every shipped puzzle catalog/rating band and lesson scenario; reconcile expected IDs with executed IDs programmatically during execution. Do not infer full lesson coverage from three example lessons or universal generator correctness from a seed sample.
- Product acceptance requires all applicable required rows passing, documented resolutions for open contracts, and explicit acceptance of any remaining limitations by the integrator. This plan supplies no release approval.

Current conclusion: planning deliverable prepared. All engine, browser, device, accessibility, persistence, build and deployment acceptance results remain **NOT RUN**.
