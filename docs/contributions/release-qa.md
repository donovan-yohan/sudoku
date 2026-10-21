# Independent browser release QA

Logical parent: Sudoku. Integration remains with the parent.

## Receipt and scope

- First filesystem action was `pwd` and reading this checkout's `AGENTS.md`. Actual output: the Sudoku checkout.
- Live target: `http://127.0.0.1:5175/`. The displayed daily puzzle during this review was October 21, 2026 UTC, Beginner, initially 24 of 81 cells filled.
- Read `docs/MOTION.md` and applied its superseding user refinement: monochrome resting UI, permitted transient chromatic progress effects and full-board color finale, static text under reduced motion. Early no-color planning documents were not used as release criteria.
- Used Browser Use/CDP with dedicated named sessions `sudoku-release-qa` and `sudoku-release-qa-reduced`, not the parent's Playwright runner or artifacts. Responsive dimensions and media preferences were emulated in Chromium. Output was written to profile scratch.
- Only authored repository file: this document. No fixes, source files, profile defaults, private records, delegation, commits, pushes, deployments, or purchases. No `npm run test:e2e` execution.
- Parent-reported `npm test` 129 passing and acceptance-check coverage are context, not checks independently rerun here.

## Result

Core browser flows exercised successfully, with one medium-priority motion consistency defect and two low-priority readout/status defects. No observed data-loss or blocked-play issue in the tested paths. Parent should triage these findings; this is not unconditional approval of every release criterion.

### QA-1 — Finishing through an applied hint omits the finale

Priority: medium; motion/feedback contract, not puzzle correctness or data loss.

Reproduction:

1. Use the Beginner daily puzzle with effects enabled and reduced motion off.
2. Fill the puzzle correctly except r9c9. The probe solved the rendered givens with an independent Python backtracking solver, then entered digits through the live board and number-pad handlers; it did not inject saved game state.
3. Let prior effects settle, then request Hint. Observed explanation: `Only 3 remains at r9c9 after excluding its row, column, box and proven eliminations.`
4. Choose `Apply this step`.

Expected: the completed puzzle earns the same finale as a direct final digit entry.

Actual, reproduced with the browser foregrounded and `document.visibilityState === 'visible'`:

- Before: progress `24`, reward variant `scatter`, reward count `24`, no running animations after settling.
- After hint: progress `27`, status `Puzzle complete. A little more clarity.`, but reward variant remains `scatter` and reward count remains `24`; no `finale` layer is created.
- Control run with direct final digit entry: progress `27`, variant `finale`, reward count `27`; after six seconds running animations were zero and sampled reward-cell opacity was zero.

Source corroboration: `src/App.tsx` dispatch handles reward transitions, while `applyHint` updates game state without updating the reward state. No fix made.

Evidence: `normal-motion.json`, `hint-finale-foreground.png` in the scratch directory below. The earlier `hint-finale.json` is supplemental; use the foreground control run for the decisive comparison.

### QA-2 — Successful placement lessons report “candidates none” beneath the board

Priority: low; contradictory instructional readout.

Reproduction: Learn → Naked single → select r1c9 → choose 9 → Check reasoning. Also observed in both Hidden single examples and Naked single example 2.

Actual:

- Correct feedback appears and the board displays the placed digit.
- The large readout correctly says `r1c9 contains 9.`
- The readout immediately beneath the board instead says `r1c9: candidates none.`

Expected: the beneath-board readout should describe the placed number, consistently with the board and large readout, rather than an apparently candidate-less empty cell.

Source corroboration: `src/components/Learning.tsx` derives that readout's filled-cell branch from `scenario.board`, rather than the updated `values`. No fix made.

Evidence: `lessons.json`, including both examples of each placement technique.

### QA-3 — Undo leaves stale success/status text

Priority: low; misleading live-status feedback, not a failed undo.

Observed examples:

- Enter 4 in r1c1, then Undo: the cell/readout correctly return to the preceding note state, but `.game-status` still says `Entry updated.`
- After a completed direct-entry solve and settling, Undo changes the completion status from `Puzzle complete. A little more clarity.` to the stale announcement `Puzzle complete.`; Redo restores the full completed-state message.

Expected: undo/redo should announce the resulting state, especially when undo makes a puzzle incomplete. Do not leave a completion announcement on an incomplete puzzle.

Source corroboration: `src/App.tsx` updates announcements for digit/restart/new-unit events but has no undo/redo-specific announcement branch; the completed-state render otherwise masks the stale announcement. No screenreader behavior is claimed.

Evidence: `notes-restart.json`, `normal-motion.json`.

## Executed checks and outputs

### Responsive/theme interaction matrix

Six combinations: 320, 390, and 1440 CSS-pixel widths, each in device-emulated light and dark modes, height 900. Storage was reset between cases in the dedicated review session.

For every combination:

- Actual theme matched the requested mode. Root foreground/background were black/white inverses.
- Root `scrollWidth === innerWidth`: 320/320, 390/390, or 1440/1440 on the puzzle, lesson catalog, and opened Naked single lesson.
- Puzzle and lesson each rendered 81 grid cells; catalog contained 8 lessons.
- Enter 4 → Undo returned r1c1 to empty → Redo restored entry 4.
- Help opened; native Tab and Shift+Tab moved between its controls; native Escape dismissed it and returned focus to Help.
- Help's horizontal scroll width equaled its client width: 318/318 at 320, 388/388 at 390, 498/498 at 1440.
- Restart → Keep playing preserved entry 4.

Evidence: `matrix.json` and six `lesson-{width}-{theme}.png` screenshots. Matrix labels `tabFromLast`/`shiftTabFromFirst` are imperfect probe labels: the recorded sequence started on Effects on, moved to Back to the grid, then back to Effects on. This proves control navigation, not a full focus-trap wraparound test.

### Notes, undo/redo, and restart

At 320/light, using actual pointer clicks and unambiguous aria-labeled number-pad controls:

- Notes on → Toggle note 3 produced `empty, notes 3` in r1c1.
- Undo removed the note; Redo restored it.
- Notes off → Enter 4 replaced the note with entry 4.
- Undo restored note 3; Redo restored entry 4.
- Restart dialog initially focused Keep playing.
- Keep playing preserved entry 4 and returned focus to Restart puzzle.
- Clear entries and notes cleared r1c1, disabled Undo, set status `Entries and notes cleared.`, and returned focus to Restart puzzle.

Evidence: `notes-restart.json`.

### Technique interactions

Exercised all 8 techniques, both guided examples each: Naked single, Hidden single, Locked candidates, Naked pair, Naked triple, X-Wing, Swordfish, XY-Wing.

For all 16 examples:

- Check reasoning without a selected cell/digit rejected the incomplete response with guidance.
- Try again allowed retry.
- Showing the explanation did not complete the example.
- Selecting the configured target/digit/action through the live controls produced correct feedback; Check reasoning then disabled.
- Example 1 advanced to Example 2; Example 2 returned to the catalog.
- Final catalog showed all eight lessons Completed; local storage contained all 16 scenario IDs.

Expected response metadata came from the app's exported lesson definitions via its live Vite module; this verifies UI/progression behavior, not an independent mathematical oracle for lesson validity. Saved completion was inspected in local storage; lesson completion after a full reload was not separately checked.

Evidence: `lessons.json`.

### Reduced motion and completed-state restoration

Separate review session, 390 × 844, light mode, `prefers-reduced-motion: reduce` confirmed true. Solved the rendered puzzle by live DOM cell/number-pad activation, not save-state injection.

- All observed unit-completion events, including coalesced two-unit and final three-unit completions, provided textual status.
- Every sampled reward layer had computed `display: none`; running animation count was zero at every sampled completion.
- Final status: `Puzzle complete. A little more clarity.`; 81 of 81; no horizontal overflow.
- Reload retained the completed puzzle and created zero reward layers: no restored-state celebration replay.

Evidence: `reduced-motion.json`, `reduced-final.png`. Reduced-motion solve was not repeated at every width/theme.

### Normal motion control

Foregrounded 1440-wide dark-mode review session, reduced motion off:

- Direct-entry solve created the finale layer at count 27.
- After six seconds it had zero running animations and sampled reward-cell opacity zero.
- Reload of the completed puzzle had no reward layer and zero running animations.
- Undo/redo did not replace the old finale layer with a new reward event; running-animation counts immediately after interaction include ordinary UI transitions and are not by themselves evidence of reward replay.

Evidence: `normal-motion.json`, `manual-finale.png`. A screenshot taken immediately after triggering the finale can precede its visible animation phase; it is not a substitute for the recorded layer/state comparison.

## Evidence location

Absolute scratch directory:

The Kame profile's private scratch directory, under `cache/scratch/sudoku-release-qa`.

Primary JSON receipts: `matrix.json`, `notes-restart.json`, `lessons.json`, `reduced-motion.json`, `normal-motion.json`.

These are local scratch artifacts and may be pruned; the findings and observed outputs are preserved in this document. Browser harness capture helpers also generated incidental screenshots in their own temporary area; those are not the primary evidence bundle.

## Harness corrections and limitations

- Standalone Node inline execution was attempted from the exact checkout but blocked by the command approval layer, for both `node -e` and stdin heredoc execution. No policy/settings changes were attempted; browser tooling was the working alternative.
- An initial generic text-number locator clicked given board digits instead of number-pad controls. Those results were discarded; the successful notes/restart run uses actual pointer clicks and explicit aria-label selectors. This was a test bug, not an app defect.
- Initial Escape dispatch lacked native key codes and did not dismiss the modal. Repeated with native virtual key code 27; dismissal and focus restoration passed. Not an app defect.
- A long asynchronous JS solve exceeded the browser evaluator's five-second timeout. It was canceled by reload and replaced with short cell/digit evaluations. Completion claims rely on the subsequent finished runs, not the timeout.
- Initial background-tab motion observations were not used to judge effect duration. The decisive normal-motion control and hint-path comparison were repeated with the page foregrounded and visible.
- Responsive emulation is not physical-device testing. No manual iPhone/Android/Safari, screenreader, audible-output, performance/flashing assessment, full accessibility audit, offline/storage-denial, UTC rollover, multi-tab synchronization, or exhaustive keyboard-shortcut coverage is claimed.
- Did not rerun parent unit/build/acceptance suites, verify deployed behavior, or inspect repository-wide concurrent changes. Parent owns final integration and release decision.
