# Independent release review

Review receipt: 2026-10-21 UTC. Logical parent: Sudoku Ebi `Sudoku`.

## Scope and disposition

Reviewed actual current implementation, not the planning briefs. Three reproducible medium findings below; no high-severity defect established. Recommend fixing the two save/navigation recovery defects before release. The hint reward path also fails the refined completion requirement.

First filesystem command ran `pwd` and read checkout `AGENTS.md`. Actual cwd: `.`. Parent owns integration. The only authored repository file is this document. No application fixes, commits, pushes, deployments, purchases, delegation, profile-default changes, or private-record access.

Applied `docs/MOTION.md`, not superseded blanket no-color proposals. Transient chromatic shimmers and a full-board finale are allowed; resting UI must remain monochrome.

## Findings

### R1 — Medium: practice saves become unreachable after reload

Evidence: `src/App.tsx:45,99-103`; `src/puzzles.ts:71,90,102`; `src/game.ts:45,54,64-65`.

`practiceSeeds` exists only in a React ref. First practice navigation after each mount creates a new Date.now/Math.random seed. That seed is embedded in both generated puzzle identity and storage key. There is no persisted active-practice pointer or recovery list. Therefore successfully saved practice work remains in localStorage but normal navigation cannot reopen it after a refresh/browser restart. This is not storage eviction or private-browsing behavior: it occurs with fully working storage while the UI says “Saved on this device.”

Reproduction executed against the checkout's Vite server in a named isolated browser session:

1. Open Practice; select the first empty cell; enter 4.
2. Inspect the save, reload the app, and open Practice again.
3. Compare saved practice identities.

Actual browser output before reload:

    key: sudoku-game-v1:v1:practice:1792553234340-0.2951309158526292:beginner:0:0
    selected: 0
    value: 4

After reload / Practice navigation, the original key still exists, but the app creates:

    key: sudoku-game-v1:v1:practice:1792553235894-0.3622652622392485:beginner:2:0
    selected: 2
    value: 0

Minimum fix: persist and validate the active practice seed per difficulty; restore it before selecting the puzzle. Only explicit “New practice puzzle” should replace it. Preserve the existing storage-unavailable fallback and warn when the identity pointer cannot be saved. Add a browser regression for entry/notes -> reload -> Practice -> same puzzle and state, including separate difficulty seeds.

### R2 — Medium: unfinished daily becomes unreachable after UTC rollover plus reload

Evidence: `src/App.tsx:28-35,63-69,99-112,134-136,151`; `src/game.ts:45,54`.

The live rollover behavior is good: `today` advances while `dailyDate` stays on the puzzle being played. But the retained date is only component state. A reload always reconstructs the current date, beginner difficulty, and today's puzzle. There is neither a persisted resumable daily identity nor a prior-day picker. Yesterday's saved entries survive in storage but cannot be reached through the application. This undercuts Help's “you can finish an older puzzle first” promise whenever the user closes or refreshes the tab after midnight UTC.

Reproduction executed with a browser-only Date override, removed after the check:

1. Start at `2026-10-20T23:59:58Z`; choose Intermediate.
2. Advance the exposed browser date to `2026-10-21T00:00:01Z`; allow the one-second timer to fire.
3. Reload with the latter date.

Actual output:

    before: date 2026-10-20, level Intermediate
    live rollover: date 2026-10-20, new-puzzle notice true
    after reload: date 2026-10-21, level Beginner
    old save still present: sudoku-game-v1:v1:daily:2026-10-20:intermediate:1:0

Minimum fix: persist/validate the active daily date and difficulty, and offer an explicit resume-previous-unfinished-puzzle choice alongside today's puzzle. An explicit prior-save picker is also sufficient. Do not silently redirect every future launch forever to a completed old puzzle. Add a test across midnight and reload, not merely the mounted-tab notice.

### R3 — Medium: applying a hint bypasses earned completion effects

Evidence: `src/App.tsx:72-87` versus `88-98`; `src/game.ts:43`; `src/components/RewardEffects.tsx:5-10`; requirement `docs/MOTION.md:7-10`.

Ordinary dispatch computes newly earned units, updates reward state, and coalesces a finished board into its finale. `applyHint` directly calls reduceGame and updates state without that reward/announcement pipeline. The reducer still marks the units rewarded. Thus an explained placement completing a row/column/box gets no new effect; a final hinted placement gets no full-board finale. Because the units have already been recorded, the missing event is not recovered afterward.

Reproduction executed with a valid near-complete fixture derived from the actual daily puzzle solution. All cells except the first editable cell were filled correctly; rewarded units were calculated by `completeUnits` before loading the fixture. Effects were enabled.

    fixture: cell 0, correct digit 7, rewarded units 24
    Hint -> Apply this step:
      status: Puzzle complete. A little more clarity.
      reward layers: 0
      board progress: 27
      save status: Saved on this device · 1 hint used

Control: reloaded the same near-complete fixture and entered 7 through the normal number pad:

    status: Puzzle complete. A little more clarity.
    reward layers: 1
    variant: finale

Minimum fix: factor a shared previous/next-state commit path that compares rewarded units and emits one coalesced reward event for both manual and hinted placements. Do not route a note-mode hint through ordinary entry without forcing placement mode. Maintain the no-replay-on-restore/history behavior and reduced-motion CSS. Add browser coverage for hinted unit completion and hinted final completion, with effects off and reduced motion as controls.

## Other reviewed areas

- Engine: read `src/engine.ts` completely. Reviewed MRV solving, uniqueness counting, candidate intersection, deterministic rating, singles, locked candidates, naked subsets, fish in both orientations, and XY-Wing. No concrete unsound inference found for the production hint path. `findDeduction` treats candidate overrides as trusted logical premises; production hints generate them internally rather than from manual notes.
- Hints: `HintPanel.tsx` checks solvability before deductions, uses a values signature to hide stale hints, and discloses that board edits reset elimination analysis. No unsupported solution-number fallback found. Elimination steps deliberately leave manual notes unchanged; that behavior is disclosed and is not filed as a defect.
- Puzzles: read `src/puzzles.ts` completely, including finite bank, deterministic selection, symmetry transform, post-transform rerating, identity version, and strict UTC date validation. No catalog uniqueness defect independently established by this review. Parent-reported independent oracle results are not claimed as my execution.
- Storage/game: reviewed all of `src/game.ts` and relevant history/storage tests. Save validation protects fixed givens, shape, ranges and duplicate notes; storage exceptions degrade to playable state. History is bounded and intentionally not restored. Recovery navigation, rather than the per-puzzle serialization, is the material defect.
- Lessons: read all `src/lessons.ts` and `components/Learning.tsx`, including candidate-premise disclosure, rule-specific validators, bounded completion search, answer evaluation and progress parsing. No material lesson inference defect found. These are explicit partial candidate diagrams, not falsely advertised unique playable puzzles.
- UI/rewards: read `App.tsx`, `Board.tsx`, `Dialog.tsx`, `RewardEffects.tsx`, `reward.ts`, `types.ts`, and the full CSS (long lines inspected with `fold`). Reviewed keyboard event scope, fixed cells, dialogs, preferences, reward suppression on restore/history, transient color and reduced-motion rules. No objection to permitted color effects.
- Deployment: read `vercel.json`, `index.html`, `vite.config.ts`, `package.json`, CI workflow and README. Self-hosted static assets and declared CSP are internally compatible, including the inline theme bootstrap and inline reward styles. CSP `script-src 'unsafe-inline'` is a hardening opportunity, not an evidenced exploitable medium defect here. Hashed asset caching is scoped to `/assets/`. No live Vercel response or deployment was tested; README's hosting Node version is not proven by a remote settings inspection.

## Execution receipt and limitations

- `npm test` executed from the exact checkout: exit 0; Vitest 5.0.5; 7 test files passed; 133 tests passed; reported duration 337 ms. The parent's earlier 129-test result was not substituted for current output.
- Node runtime reported `v26.7.0`.
- Git status showed the application directories/configuration as untracked and `git ls-files` returned no tracked paths. Consequently there was no meaningful tracked baseline diff to attribute to individual workers. The checkout was concurrently active; this is a point-in-time source review, not a frozen commit attestation.
- No `npm run build`, shared `npm run test:e2e`, shared Playwright runner, or shared test output was used by this reviewer.
- An attempted read batch through execute_code was blocked by unattended-mode policy before any calls ran. An inline Node browser probe was also blocked before execution. Neither is reported as a passing check; no approval settings were changed.
- Alternative actual browser checks used `browser_exec` session `sudoku-release-review`, against existing `http://127.0.0.1:5175/`. The server process cwd was verified as this exact checkout before connecting. No server was started/stopped and no production endpoint was touched. Browser checks changed only synthetic localStorage in the review browser session and temporary Date instrumentation; no repository fixtures, screenshots, or probe scripts were authored.
- Browser findings above include real observed outputs, not proposed test results. The daily clock scripts were explicitly removed after verification.
- This review did not rerun the independent catalog/lesson oracle, a production build, full responsive/accessibility testing, remote header verification, or a deployment. Existing unit success does not cover the three browser lifecycle failures above.

Integration acceptance: fix R1/R2 recovery semantics and R3 shared reward commit behavior, then rerun the targeted browser regressions plus the parent's normal release checks serially. No code fixes are included in this contribution.
