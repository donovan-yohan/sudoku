# Adversarial review plan: Sudoku learning app

Author: Fugu, independent reviewer (Hermes profile `fugu-reviewer`).
Assignment context: logical project Sudoku, Ebi id the Sudoku project; parent session the originating build session.
Checkout: `.`.

## Status and evidence boundary

This is a preimplementation review plan. No application code was reviewed. No application tests, browser checks, solver verification, accessibility audit, build, or deployment were run. Test cases below are proposed acceptance checks, not reported results. There is no claim that the app currently satisfies them.

Inspected source of requirements: root `AGENTS.md`, especially Scope and Engineering. The supplied user brief adds beginner-to-expert scenarios as the main feature, static Vite/React/TypeScript on Vercel, and public MIT source at `donovan-yohan/sudoku`. Review only this fresh project; historical profile/project records are not evidence.

Directory was verified with `pwd`. The initial combined pwd/read command was blocked by the tool approval guard before execution; separate pwd and native file read succeeded. Scoped instruction discovery returned the root AGENTS.md; docs did not yet exist when inspected. No named desktop-project association was established or inspected. This assignment permits writing only this document; fixes and executable test files belong to integration work.

## Release decision rules

- Block release for nonunique/unsatisfiable generated puzzles, unsound lesson deductions, corrupted undo/progress, executable stored content, public secrets, or inaccessible core play/lesson flows.
- Block claims of four genuinely rated levels until published logical criteria and solver traces support them. Clue count, generator attempt count, and backtracking depth alone are not difficulty evidence.
- Block the learning-feature claim if beginner-to-expert lessons are merely prose, unsupported examples, or answer entry without interactive explanations and feedback.
- Require reproducible evidence, not screenshots of green test summaries alone: revision, command, environment, seeds/fixtures, assertions, result counts, and failure reproduction. Record actual RED before a behavioral implementation and GREEN afterward where project instructions require it. Never manufacture a RED retrospectively.
- Sampling can reveal failures; it cannot prove all possible generator seeds safe. Runtime generation must validate every emitted puzzle or select only independently validated static artifacts. Bound generation work and define a safe failure path.

## Proposed test harness and independent oracles

Keep engine and lesson evaluation pure and callable without React. Use table-driven unit tests plus reproducible property tests; exercise interaction/storage through integration tests and a real browser. Test the production bundle as well as development mode.

Use an independent exact solver that counts solutions up to two. It must not share candidate generation or constraint logic with the production solver. For 81-cell fixtures, reject malformed encodings first; enforce digits 1–9 once per row, column, and box. Cross-check the oracle against valid complete grids, contradictory grids, empty grids, and an independently checked unique fixture before trusting it.

Keep seed, generator/catalog version, date key, puzzle ID, givens, logical trace, lesson ID/step, and minimized reproduction with each failure. Pin randomness in tests. Separate satisfiability/uniqueness evidence from technique-proof evidence.

Suggested initial generator campaign: 1,000 reproducible seeds for each declared level, followed by a larger scheduled sweep. The integrator should set explicit CI duration limits and publish the actual sample count. Do not quietly omit rejected seeds or downgrade a requested level; report acceptance/rejection and failure reasons. A bounded retry failure must produce a clear unavailable state or a validated matching-level fallback.

## 1. Generator and board correctness

G01 — Complete-grid controls. Use this proposed complete fixture, validating it independently before relying on it:

```text
534678912
672195348
198342567
859761423
426853791
713924856
961537284
287419635
345286179
```

Expected after oracle validation: one solution, no duplicate in any unit. Replacing r1c1 with 6 creates a duplicate; a full-looking invalid board must not win. Removing r1c1 alone should produce one solution and restore 5. The empty grid must hit the two-solution cutoff, not be called unique or exhaustively enumerated.

G02 — Validate each emitted puzzle. Assert exactly 81 cells, supported cell encoding, immutable givens, at least one blank for playable puzzles, and exactly one solution. Assert the production answer equals the independent solution and obeys all givens. Never equate “production solver found one answer” with uniqueness.

G03 — Malformed inputs. Cover 80/82 cells, ragged rows, nulls, floats, negative digits, values above 9, NaN/Infinity at direct API boundaries, numeric strings where not supported, duplicate givens, and contradictory partial boards. Return typed errors without crashes, hangs, partially initialized games, or silent coercion.

G04 — Metamorphic checks. Digit permutations, transposition, band/stack permutations, and row/column permutations within bands/stacks preserve solution count and transform the solution accordingly. Do not assume an implementation's deterministic tie-breaking produces the same trace after transformation.

G05 — Budget and cancellation. Force retry exhaustion, solver cutoff, and cancellation; no infinite loop or blocked mobile main thread. Stale worker/async results must not overwrite a newly started puzzle. Static hosting must not require a server-only generator endpoint.

G06 — Completion. Fill a valid solution, a full invalid board, and an incomplete conflict-free board. Only a valid completed grid wins. If “correct” feedback consults the answer rather than merely duplicate-free units, document that policy and test it consistently.

## 2. Honest logical difficulty

D01 — Define four named levels before accepting labels. Publish their allowed techniques, prerequisite ordering, maximum required technique, and whether search is ever allowed. “Expert” must not mean an unexplained guess. The beginner-to-expert lesson catalog must explain techniques the playable difficulty system requires, or disclose any gap.

D02 — For every shipped/catalog/generated puzzle, replay a legal logical solve from givens using only permitted techniques. Verify each assignment and elimination from the current state, with no hidden answer lookup or backtracking in a claimed logical trace. A stalled puzzle is unrated, not automatically expert.

D03 — Prevent level inflation. Under the declared deterministic rating policy, run lower-tier solvers on every higher-tier fixture. If the policy claims a harder technique is required, demonstrate lower-tier closure stalls before invoking it. One unnecessarily fancy trace does not establish difficulty. Record that a technique-bounded rating is an operational definition, not a universal measure of human difficulty.

D04 — Negative fixtures. Present a low-clue puzzle solvable by singles and a higher-clue puzzle requiring an advanced technique, after independent fixture validation. Labels must follow the published logical policy rather than clue count. Force disagreement between requested level and calculated rating; reject or transparently label, never silently mislabel.

D05 — Deterministic evidence. Same puzzle and rating-version produce the same rating and reproducible trace. A rating-policy change must version stored ratings; do not silently reinterpret prior achievement data.

## 3. Daily identity and determinism

T01 — Pin clock instants immediately before and after `2026-10-20T00:00:00.000Z`. Expected UTC keys are `2026-10-19` and `2026-10-20`. Repeat with browser zones UTC, America/New_York, Asia/Tokyo, and Pacific/Kiritimati: same instant gives the same daily identity and givens everywhere.

T02 — Repeat across fresh profiles, reloads, production/development builds, and supported browsers. Daily selection must not depend on Math.random, local timezone, locale, object iteration accidents, or previous local progress. If daily includes selectable difficulty, define the identity as date plus difficulty plus catalog/algorithm version and test every offered variant.

T03 — Define upgrade behavior. Reordering/extending a catalog or changing a seeded generator must not silently change the same date's puzzle or attach progress to different givens. Prefer stable date-to-puzzle mappings or pinned daily versions. Reproduce a saved game across an upgrade; migrate safely or disclose the reset without interpreting old moves as new puzzle progress.

T04 — Keep a game open through UTC midnight and reload. Specify whether an in-progress old daily is retained or explicitly replaced; no silent board swap or progress loss. Test leap day, year boundary, offline reload, clock reversal, and invalid clock input at the pure selector boundary.

T05 — Honest limitations. A fully static app using the device clock cannot enforce a trusted date, prevent clock cheating, hide future seeds, or protect an embedded solution. Do not advertise those properties. No accounts means progress is local, not cross-device sync.

## 4. Interactive lessons and valid eliminations

L01 — Catalog coverage. Inventory actual beginner-to-expert techniques with prerequisites and validated scenarios. For every lesson, require an explanation before the requested move/elimination, an interactive decision, specific feedback for an incorrect attempt, and a path to retry/reset. Do not count a title or static paragraph as an interactive lesson.

L02 — Validate state. Confirm givens are consistent, any supplied candidate masks match the declared lesson state, and each scenario is satisfiable. If a lesson starts from a partially solved state, replay prior assignments/eliminations or supply a verified derivation. If candidates are intentionally incomplete, explain why; missing candidates must never manufacture a naked pair or single.

L03 — Check each elimination two ways. First, verify the named technique's premises on the pre-step candidate state. Second, independently solve with the eliminated digit forced into that cell; it must be unsatisfiable. For assignments, forcing a different value must be unsatisfiable. Satisfiability evidence alone cannot prove the named technique applies. If a lesson intentionally permits multiple solutions, an elimination must hold across all compatible solutions, not merely a chosen answer.

L04 — Attack the proof. Remove one pattern cell; add a candidate that breaks the premise; move a witness outside its unit; substitute a nearby plausible target; include a lookalike locked candidate/pair with an extra candidate. Reject invalid deductions without advancing, removing notes, or revealing an unrelated solution.

L05 — Branching and alternatives. Accept any valid action the prompt explicitly permits, not only the first hard-coded target. If the exercise requires a specific demonstration, explain why an otherwise valid move does not answer this prompt. Replay all allowed branches; each resulting state and explanation must remain sound.

L06 — State isolation. Repeat, reset, back/next, rapid double-click, keyboard submit, reload, and restart after an incorrect attempt. No double elimination, skipped proof, leaked prior board, or focus trap. Hints progressively explain evidence instead of silently filling the solution. Lesson fixtures must not accidentally mutate the active daily game.

## 5. Untrusted storage, undo, and notes

S01 — Parse defensively. Exercise missing key, empty value, truncated JSON, invalid JSON, null, array instead of object, unknown schema version, wrong field types, invalid 81-cell lengths, out-of-range coordinates, duplicate note digits, and moves that edit givens. Corrupt values must not crash mounting or produce a misleading solved state.

S02 — Bound resources. Supply oversized strings, deeply nested data, excessive history, huge note arrays, and invalid counters/timestamps. Check input size/depth/count limits and fail safely. Test `__proto__`, `constructor`, and `prototype` keys; parsing/merging must not pollute object prototypes. Do not test live credentials or unrelated storage namespaces.

S03 — Storage unavailable. Make reads and writes throw SecurityError/QuotaExceededError; test restricted/private-mode behavior. Play and lessons must still work in memory. Clearly indicate inability to save; do not report persistence success. Recovery should discard only the invalid app-owned record after an explicit safe policy, not clear unrelated origin storage.

S04 — Migration and identity. Load every supported older schema, unknown future schema, and a save with a mismatched puzzle ID/version/givens. Reject or migrate explicitly. Validate derived fields (completion, score, candidates) against board state instead of trusting stored booleans. Never run stored strings as code or markup.

U01 — Define one action. Enter digit, replace digit, erase, toggle note, automatic peer-note pruning, hint, and reset each need documented history semantics. Test undo/redo snapshots of board, notes, and completion together. Givens are never editable or undoable.

U02 — Exact sequence. Select an editable cell; add notes {2,5}; place a valid digit that prunes peer notes; undo; redo. Assert exact before/after note restoration, not merely the selected digit. Select another cell; replace/erase a digit; undo in reverse. Wrong/blocked input must not create phantom history entries.

U03 — History branches. Undo twice, make a different move, then attempt redo: stale future must be unavailable. Test empty undo/redo, rapid keyboard repeats, bounded history, reload, new puzzle, daily rollover, and lesson transitions. History from puzzle A must never modify B. Test reset/clear confirmation and its promised undo policy.

U04 — Notes policy. Specify whether notes are manual, auto candidates, or separate modes. Toggle a note twice; overwrite a value while in notes mode; clear cell; switch note mode via keyboard/touch. Automatic pruning must affect only the intended peers and be reversible. Invalid/conflicting entries must follow a documented policy and never erase unrelated notes.

U05 — Win transition. Undo the winning move and redo it; persistence and celebration return to the right state. Completing an already full unit must not repeatedly trigger celebrations on selection or theme changes. Multiple completed units from one move must not queue disruptive effects.

U06 — Concurrent tabs. Open the same daily in two tabs; edit each and trigger storage events. Define conflict policy and test it: no silent mixture of incompatible board/history snapshots. If last-writer-wins is chosen, disclose it and keep records internally atomic and validated.

## 6. Keyboard, accessibility, mobile, and visual contract

A01 — Keyboard-only complete flow. Start daily/practice, select level, traverse board, enter/erase digits, toggle notes, undo/redo, request hint, complete a lesson, reset, and switch theme. Define arrow/Home/End behavior and Tab entry/exit for the grid; every control must be reachable with a visible focus indicator. No keyboard trap or global hotkeys stealing typing from a dialog/input. Test platform-appropriate shortcuts and browser defaults.

A02 — Screen reader. Inspect accessible roles/names/states and manually test VoiceOver/Safari and another supported combination when available. Announce coordinates, given/editable status, value, notes, selection, validation and lesson feedback. Avoid reading the entire board on each keystroke. Status/errors must not depend solely on animation or color. Dialogs need labels, initial focus, Escape behavior, and focus restoration.

A03 — Touch/layout. Test 320 CSS-pixel width, desktop, portrait/landscape, on-screen keyboard, browser zoom to 200% and 400%, and large text. No covered controls, horizontal loss of critical content, or accidental neighbor entry. Meet WCAG 2.2 AA target-size requirements (24 CSS pixels or applicable spacing/exception), with larger controls where practical. Confirm pointer and keyboard inputs share state semantics.

A04 — Contrast and structure. Check both pure white/black and inverse dark modes; neutral grays only for hierarchy. Verify text and nontext contrast, distinct 3×3 boundaries, visible selection/focus/conflict using non-color cues, thin borders, zero rounded corners, and no decorative shadows/colored accents. Check first paint/system theme and persisted override without inaccessible flashes.

A05 — Reward without harm. Trigger row, column, box, and simultaneous completions. Effects must be soft, original, and nonblocking; no flashing hazard or layout shift. With prefers-reduced-motion enabled before load and changed at runtime, disable/substantially reduce motion while preserving feedback. Sound stays off until explicit opt-in. No repeated reward for invalid full units. Validate behavior manually as well as via DOM assertions.

## 7. XSS, public secrets, and static release boundary

X01 — Treat saved values, URL query/hash, imported state if supported, and lesson metadata as untrusted. Send harmless sentinel payloads such as `<img src=x onerror="window.__sudokuXssProbe=1">` through each supported entry point. Assert literal rendering or rejection, no probe execution after reload, and no unexpected requests. Test javascript: links if external links are supported. Do not invent import/sharing features merely to test them.

X02 — Inspect dangerous sinks: raw HTML rendering, innerHTML, eval/Function, dynamic script URLs, unsafe object merges, markdown link handling if present. Prefer React text rendering and allowlisted schemas. Check runtime and production output; static hosting does not neutralize DOM XSS.

X03 — Public-source exclusion. Before public push, inspect tracked/staged files, intended published history, public assets, production bundle, source maps, logs, fixtures and deployment configuration for secrets or private records. Use local secret scanning plus manual review with redacted reports. VITE_* variables are public bundle inputs, not secret storage. Exclude real credentials, tokens, cookies, profile configs, private paths/data exports, and copied personal records. If a secret was ever published, removal alone is insufficient: revoke/rotate it through the owner.

X04 — Build/deployment checks for the integrator. Confirm MIT license and dependency/license suitability; perform clean install, type check, behavioral suite and production build with documented commands. Serve built output and test direct navigation/reload at supported routes, correct static assets, HTTPS configuration, and host-compatible security headers/CSP. Security policy must work with the actual asset strategy; do not declare CSP effective without browser verification. Check dependencies for known vulnerabilities and triage real exposure rather than assuming an audit score proves safety.

X05 — Privacy/network. Inspect production network requests and persisted keys through play and lessons. No tracking, analytics, account services, paid APIs, credential prompts, or private profile access. Document any required third-party asset request; prefer self-contained assets. Browser-local progress is not secret storage. Source maps and answer data being public are not themselves secrets; embedded credentials are.

## Evidence handoff and scope limits

For each case, the integrator should record: case ID, artifact/revision, fixture/seed/date key, exact execution command or manual steps, expected/actual result, PASS/FAIL/BLOCKED, and redacted evidence location. A failing property test must print a replayable minimized input. Track engine tests, browser automation, and manual accessibility/device coverage separately; none substitutes for the others.

Suggested order: independent oracle controls → generator/lesson soundness → difficulty and daily identity → storage/history invariants → browser/keyboard/a11y → production bundle/security checks. Do not wait for a complete UI to test pure logic. Do not claim unavailable browser/device combinations were tested. Do not push or deploy as part of this review assignment.

Receipt for this contribution: PASS — requested preimplementation plan authored; directory verified and root project instructions read. Output is `docs/contributions/review-plan.md`. Limitations: application correctness remains unreviewed and untested; proposed fixture expectations require execution; no named desktop-project association established. This is not a release PASS.
