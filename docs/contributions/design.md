# Sudoku — visual and motion specification

Author: Hotate (hotate-design), visual/interaction design contribution.
Project: Sudoku, Ebi id the Sudoku project.
Parent session: the originating build session.
Status: actionable proposal, not an implemented or visually verified interface.

## 1. Evidence, boundaries, and design idea

Observed: the checkout's root `AGENTS.md` requires daily/practice Sudoku, four logically rated levels, beginner-to-expert interactive lessons, monochrome styling, local progress, and reduced-motion support. At initial inspection only root instructions and Git metadata were present; no application screen was inspected. This is a fresh assignment, not an extension of historical project work.

Target: static Vite + React + TypeScript, Vercel, `sudoku.donovanyohan.com`, public MIT repository `donovan-yohan/sudoku`. These are supplied requirements, not verified deployment claims. This document does not implement CSS, change settings, introduce dependencies, or authorize release.

Direction: **a quiet instrument that briefly becomes luminous when logic resolves**. The grid is the hero. Typography, spacing, rules, and structural marks carry the interface; no color, pill badges, rounded cards, gradients, decorative shadows, or generic gamification confetti. Borrow the emotional principle of a satisfying rhythmic resolution associated with Tetris Effect, not its assets, audio, particles, layout, or recognizable choreography. The original reward here is an ordered “unit echo”: a thin monochrome trace resolves around the completed mathematical unit.

Priority order: interactive learning, playable board, readable feedback, then atmosphere. Rewards never obscure digits, steal focus, or delay the next move.

## 2. Semantic visual tokens

All sizes are CSS pixels. Zero corner radius applies to buttons, fields, menus, dialogs, tooltips, board, and focus outlines. Use solid neutral sRGB grays only; no subtly tinted black or white.

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| Canvas / default surface | `#FFFFFF` | `#000000` | Entire page, controls, board |
| Ink | `#000000` | `#FFFFFF` | Main copy, entered digits, strong rules |
| Secondary ink | `#595959` | `#A6A6A6` | Metadata, clues, explanatory secondary text |
| Quiet surface | `#F2F2F2` | `#141414` | Peer cells, subdued panels |
| Marked surface | `#E0E0E0` | `#292929` | Matching digits, lesson premise cells |
| Essential rule | `#767676` | `#898989` | Cell boundaries, inactive control outline |
| Strong rule / focus | `#000000` | `#FFFFFF` | Box boundaries, board edge, focus |
| Disabled ink | `#767676` | `#898989` | Explicitly disabled controls only |

Dark mode is a true black/white inversion of visual roles, not a whole-page inversion filter. Neutral intermediate values are intentionally tuned for hierarchy; do not invert images, text antialiasing, or browser affordances with a filter. All content surfaces are opaque except a modal backdrop and decorative reward traces.

Theme choice: System / Light / Dark, default System; persist explicit choice locally. Put it in an accessible labeled menu, not an unexplained sun icon. Theme change is immediate with no crossfade or full-screen flash. Respect system changes only while System is selected.

### Contrast requirements

Acceptance targets: normal text and candidate numerals at least 4.5:1 against their actual surface; large text at least 3:1; active component boundaries, focus indicators, and essential graphical distinctions at least 3:1 against adjacent colors. Prefer 4.5:1 even for large text. Pure black/white are the strongest pairing. Never reduce the opacity of instructional text to create hierarchy.

The hex pairs above are design candidates, not a certified contrast audit. Verify every pairing with a WCAG contrast calculator after implementation, including secondary text on marked surfaces, inverted controls, disabled-versus-enabled states, and focus against both board and cell. If a combination fails, use Ink rather than weakening the requirement. Decorations may be subtler only when they convey no essential information.

Gray fill alone cannot encode state. Combine it with position, border style, weight, and explicit status text. Preserve borders and focus in forced-colors mode; do not rely on background fills surviving it.

## 3. Spacing, type, and layout

Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64. Use 4 only inside compact metadata/candidate groups; 8 between associated controls; 12 within control groups; 16 between board and controls; 24 between sections; 32 between major regions; 48 or 64 around the desktop composition.

Use a local system sans stack: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. No remotely loaded fonts. Use tabular, lining numerals for grid digits, timer, and dates; test the chosen platform font for unambiguous 1/7 and 6/9. Do not trade legibility for an unusually thin weight.

| Role | Size / line height | Weight |
| --- | --- | --- |
| Page title | 28 / 34 mobile; 32 / 40 desktop | 500 |
| Section / lesson title | 20 / 28 | 500 |
| Body / controls | 16 / 24 | 400; active control 600 |
| Metadata / captions | 14 / 20 | 400 |
| Board digits | clamp 22–32 / 1 | given 600; entered 400 |
| Candidate digits | clamp 10–12 / 1.2 | 500 |

Use sentence case, normal tracking, and short labels. Do not set essential UI text below 14px; candidates are the sole compact exception and require the accessible candidate alternative below. No all-caps navigation. A small plain “Sudoku” wordmark is sufficient.

### Mobile-first composition

At 320px and above, maintain 16px page gutters. Content order: header, mode/title, compact puzzle metadata, board, status line, number pad, editing controls, optional technique assistance. Keep lesson navigation equally prominent with Daily and Practice; lessons are not buried inside Settings. Header may wrap into two rows rather than shrink labels.

Board width: `min(100% of available content width, 504px)`; square, centered, with nine equal tracks in each direction. Board width includes its outer border. Never round each track independently; use shared grid tracks to avoid accumulated rounding and doubled strokes. Page width, padding, and box sizing must prevent horizontal overflow at 320px.

On mobile, arrange number pad as five equal columns across two rows: first row 1–5, second row 6–9 plus Erase. Targets at least 48px high, 8px gaps, with number-label size 20px. Separate Notes toggle, Undo, and Redo into a wrapping row of at least 44px-high targets. Empty pad slots are not interactive. Do not make the board smaller to fit everything into one viewport; allow vertical scrolling. Avoid a fixed bottom panel that covers controls, status, or the board. Apply device safe-area padding where appropriate.

At 768–1023px keep the single-column structure, max width 560px, with optional metadata alongside its title. At 1024px and above use a centered layout capped at 1120px, 32px outer padding, 32px column gap, board column capped at 504px and lesson/context column 320–360px. Keep board plus number pad together. Reading order remains board/status/controls followed by context, even if context is visually beside the board. No empty dashboard card wall.

At narrow widths Sudoku cells cannot all meet a 44px preferred touch target while the complete board fits. Record this as a deliberate dense-grid constraint, not a claim of universal touch-target compliance. Use the full visible cell as the hit area, no tiny candidate-only tap targets, and provide large number buttons plus keyboard navigation. Offer a labeled “Enlarge board” view with controlled two-dimensional board scrolling and a persistent selected-cell readout; ordinary page content must still reflow. Test accidental adjacent-cell taps on a real small phone.

## 4. Grid and interaction states

Grid: 1px cell rules, 2px box separators and outer edge; separators replace, not stack on, cell rules. No shadows. Draw borders on the grid coordinate system so seams stay consistent at fractional sizes and different pixel densities. Keep text aligned to cell centers.

State layering from back to front: canvas; peer/match fill; lesson marks; selected-cell outline; digits/candidates; input-focus outline; nonblocking decorative reward. Focus and all essential glyphs remain readable throughout every effect.

- Given: secondary ink, weight 600, read-only semantics. User entry: Ink, weight 400. Give a selected-cell readout such as “Row 3, column 7. Given 4” so origin is not weight-only.
- Selected: 2px inset Ink outline and quiet fill; never fully invert all selected content just to make it visible. Selection persists when the number pad has keyboard focus.
- Related row/column/box: quiet surface; matching entered digit: marked surface. These fills are optional assistance, not the only way to identify a cell.
- Keyboard focus: separate 2px strong outline with 2px offset where space permits. On the board, use an outer board focus outline plus selected-cell inset outline. Do not clip focus with overflow hiding.
- Notes: fixed 3×3 positions, no jitter when notes change. Selected-cell candidate editor presents readable 16px labels with 44px-high toggles, rather than forcing precision taps on miniature candidates.
- Conflict: persistent solid underline beneath the offending entry plus a corner diagonal mark; status states the row/column/box conflict in words. No red, shake, or flash. Announce politely after the input action, not on every navigation step.
- Incorrect lesson response: retain the learner's choice, show “Not yet” and a specific reason. Offer Try again and Explain. Never identify an unproven elimination as correct merely because it matches the final solution.
- Disabled: retain a visible label, use disabled semantics, do not communicate it by opacity alone. Explain an unavailable action when relevant, e.g. “Nothing to undo.”

One board tab stop; arrow keys move cell focus; digits enter; Delete/Backspace erase; N toggles Notes; Escape exits temporary assistance. Do not steal platform shortcuts. Announce row/column, given/entry, candidates, and conflict for the focused cell. Tabbing exits to the controls normally. On-screen buttons and keyboard operate the same selection and history. A labeled keyboard-help control exposes the shortcuts without requiring hover.

## 5. Lessons are the main feature

Lesson index: a plain ruled list grouped Foundation / Intermediate / Advanced / Expert, with technique name, prerequisite, a one-sentence purpose, and textual Not started / In progress / Completed status. Put “Start learning” beside “Play daily” on the entry screen. Do not infer an app difficulty rating from these editorial learning groups.

Lesson layout: title and prerequisite, brief logical rule, validated scenario board, one explicit task, then feedback and next step. Progress reads “Step 2 of 5,” not an unexplained progress strip. Keep the prompt above or immediately beside the board; never require repeated scrolling to remember the task. On mobile the instruction precedes the board and response controls follow it.

Scenario loop:

1. Observe: freeze relevant givens/notes; describe what can be known now. Mark premise cells with quiet fill and solid inset corner brackets. A text list names the same cells.
2. Predict: ask exactly one action: select a cell, place a digit, or eliminate a candidate. State interaction mode visibly (“Select candidates to eliminate”), so elimination cannot be mistaken for entry.
3. Explain: learner commits with Check reasoning. Show the rule and cited cells/candidates, not just “Correct!” Mark proposed eliminations with a diagonal slash and the textual phrase “Remove candidate 7 from r4c6.”
4. Apply: preview the validated consequence, allow Continue; preserve a Back action and Reset scenario. Do not silently advance or overwrite the underlying practice puzzle.
5. Transfer: a second validated scenario without the first example's highlights. Give targeted hints on request. Completion requires the intended logical action, not a guessed digit.

Suggested progression: cell/house rules → full house → naked/hidden singles → locked candidates → naked/hidden subsets → X-Wing → XY-Wing and other validated advanced patterns → supported expert chains. This is an editorial proposal: publish only techniques backed by actual validated definitions and explanations. Do not promise a chain lesson until the engine supports its evidence. Expert does not mean guessing.

For dense expert annotations, default to one inference at a time with Next inference / Previous inference, and a textual deduction list. Use straight 1px links with square endpoints, solid/dashed distinctions and numbered steps; never show an unreadable full-board spiderweb by default. Ensure line crossings do not obscure candidates. Explain any line convention before using it.

Hint ladder: orient attention → identify unit/pattern → explain deduction → explicitly offer Apply. A hint must not immediately reveal the solution. Incorrect responses never auto-consume a hint. Lessons are untimed by default; any practice timer can be hidden.

## 6. Daily, practice, and honest difficulty

Daily heading includes a human-readable date and an explicit UTC label; identity must follow the shared UTC daily puzzle, not silently change with local time. Keep Resume, Restart (with confirmation), and Practice distinct. Daily completion is a quiet status with Review puzzle and Learn a technique, not a forced share screen.

Four playing labels: Beginner / Intermediate / Advanced / Expert. Each puzzle's detail panel includes a short “Why this level?” explanation tied to its validated logical solve path and actual hardest supported technique. Do not rate by clue count, arbitrary completion time, visual badge density, or lesson group alone. Display a rating-unavailable state instead of inventing evidence. Difficulty selection uses a labeled rectangular list with selected marker and explanatory text; never communicate level with color or ambiguous star counts.

Local progress failure: play remains available; show a nonmodal “Progress cannot be saved on this device” message with a dismiss action. Empty lesson catalog: explain the state, do not fill it with fictitious completion metrics. Invalid scenario or puzzle data: disable only the affected content and offer a safe return; no manufactured board. Loading placeholders are static ruled blocks, not shimmering skeletons. Restart/reset confirmations name what will be erased and preserve a clear Cancel action.

## 7. Original motion: unit echo

### Trigger and correctness contract

Reward only a new transition from not complete to fully correct for a row, column, or box, verified by the puzzle engine; duplicate-free but incomplete is insufficient. Input feedback and reward validation are separate. Do not compare a lesson move to a hidden answer as a substitute for its logical proof.

Track rewarded unit identities per puzzle attempt. Undo/re-entry does not replay rewards for previously rewarded units; explicit restart resets them. Loading a saved board produces no retroactive celebration. Note entry, navigation, candidate removal, invalid moves, and automatic initial givens do not trigger unit completion. If an explicit hint fills a value, show explanatory feedback but no unit reward from that action. Lesson-specific rewards occur only after a checked logical step, never on unsubmitted exploration.

### Choreography and timing

All values are milliseconds measured from the accepted move. Motion is decorative; the final digit and status are committed at time 0. Use ease-out `cubic-bezier(0.16, 1, 0.3, 1)` unless noted. No scale, camera movement, blur, oscillation, particle emission, or full-screen inversion.

| Phase | Time | Rendering |
| --- | --- | --- |
| Acknowledge | 0–100 | New digit's underline reveals from its center outward; 1px stroke, maximum 2px travel, no glyph movement |
| Unit trace | 60–360 | A 1px Ink trace walks the completed unit's existing boundaries; 24% maximum opacity; linear progress |
| Echo | 180–460 | A second parallel 1px trace moves at most 3px outward from the unit boundary, fading from 12% to 0; ease-out |
| Settle | 360–520 | Primary trace fades to 0; normal grid and selection are unchanged |

Row: trace runs from the completed cell toward both row ends, each branch interpolating its own remaining distance over the same 300ms duration. Column: same logic vertically. Box: trace travels clockwise and counterclockwise from the nearest perimeter point to the completed cell, each finishing at the opposite perimeter point. This boundary-only treatment distinguishes the box from a row without sweeping a bright fill over digits. Keep echoes within the board's decorative overlay bounds, including edge units; clipping the outer 3px is preferable to layout growth. Decorative traces never receive pointer events or accessibility focus.

If one move completes multiple units, use one combined overlay: row starts at 60ms, column at 100ms, box at 140ms; shift each unit's later phases by the same offset. At intersections composite with maximum opacity, not additive brightness. Overall combined effect must finish within 600ms. No queue: a new valid move cancels existing traces and may start its own eligible reward. Never block or debounce number entry to preserve animation.

Puzzle completion: coalesce all unit traces from the final move into a single 600ms maximum effect. At time 0 show a persistent “Puzzle complete” status; at 120ms reveal a thin underline beneath that text over 240ms. Offer Review and New puzzle without automatically opening a modal. No autonomous repeating victory animation, sound, or forced focus relocation. Screen reader gets one polite completion summary, not separate row/column/box announcements.

Lesson step correct: 160ms reveal of the feedback panel's top rule, plus a static “Correct — [logical reason]” message. Do not run a full unit sweep for a candidate elimination. Keep explanation visible until the user continues.

### Reduced motion and other preferences

With `prefers-reduced-motion: reduce`, disable all moving traces, outward echoes, underline reveals, panel transitions, and decorative fades. Update digits and persistent textual status immediately. Use a static additional unit boundary for 600ms if desired, removed in one state change; it must not blink or repeat. The default recommendation is text-only feedback. Provide an Effects on/off preference, with off overriding everything and system reduced motion always taking precedence over on. Sound defaults off; no audio assets or playback without explicit opt-in. Do not require haptics, sound, or motion to understand correctness.

There is no idle animation. Interactive hover/focus changes are immediate; pressed surface may settle within 80ms only outside reduced motion. Expand/collapse content uses no height animation; preserve the reader's place. Screen readers announce semantic outcomes, not animation phases.

## 8. Engineering handoff and acceptance checks

Keep semantic tokens, board states, reward eligibility, and rendering separate. Reward renderer consumes validated unit IDs and the input source; it does not solve puzzles or decide logical correctness. Layout must work before effects load, with effects absent, and when animation is canceled. No animation library is required by this design.

Implementation review checklist (not executed by this contribution):

- Inspect 320, 390, 768, 1024, and 1440px widths; portrait/landscape; both themes; 200% zoom and 400% reflow. Verify page-level horizontal overflow is absent, controls wrap, and any board scrolling is explicitly scoped to enlarged-board mode.
- Check actual contrast for every text, candidate, mark, focus, selection, conflict, and boundary pairing. Test forced colors and OS text scaling; add a higher-legibility candidate editor if miniature notes are insufficient.
- Keyboard-only complete an entry, notes edit, undo, lesson elimination, hint, reset, theme change, and completion review. Focus must remain visible and never trapped.
- Test VoiceOver with Safari and NVDA with a supported desktop browser; verify grid labels, givens, candidate editor, progress, feedback, and consolidated live announcements. Check touch behavior on real iOS and Android devices.
- Validate all lesson scenarios and rating explanations against actual engine evidence. Verify no unsupported technique or fabricated scenario ships.
- Exercise row, column, box, simultaneous triple completion, rapid input, undo/re-entry, saved-board load, hint-generated fill, restart, and final completion. Verify each trigger matches the contract and status appears before motion finishes.
- Measure the 600ms cap and inspect on a lower-performance phone. Animate decorative transform/opacity or a bounded overlay; never animate board layout, digit position, or expensive full-screen filters.
- Test reduced motion before load and when changed live: cancel in-flight effects immediately, preserve the accepted move and explanation. Test effects off and storage unavailable.
- Capture light/dark screenshots with all interaction states; seek human feedback on density, understandable non-color marks, narrow-cell tapping, and whether the reward feels rewarding rather than distracting.

## 9. Contribution receipt and limitations

Directory verified by initial `pwd`: `.`.
Root `AGENTS.md` was read in that same first filesystem action. Relevant Hotate role skill and role reference were read. Initial repository discovery found no nested instructions or app files. The working directory of shell calls remained the supplied checkout.

Authorized artifact: `docs/contributions/design.md` only. No CSS, application code, configuration, private records, commits, pushes, deploys, purchases, delegation, or profile edits are part of this contribution. Named desktop project association was not established; no desktop-project tool was used.

Real limits: no running app existed in the inspected initial files, so there is no screenshot review, browser execution, usability result, measured animation, screen-reader validation, or accessibility-conformance claim. Numerical palette/layout probe attempts were blocked by unattended execution restrictions; no computed contrast ratios are claimed. The contrast targets and implementation checks above remain acceptance requirements, not test results. The specification is ready for integration without waiting for app implementation.
