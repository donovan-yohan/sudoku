# Sudoku copy and lesson editorial guide

Draft by Kurage, writing contributor, for Ebi integration review.
Scope: UI/help language and lesson guidance only. Not implementation or release approval.
Source: checkout `AGENTS.md` and the parent assignment (session the originating build session, project the Sudoku project). No app source was present at review. All controls, difficulty names, storage behavior, and events below are proposed contracts; show copy only when the corresponding behavior exists and is tested.

## Voice

Quiet, direct, specific. Explain the board, not the player's ability. Use sentence case and ordinary punctuation. No hype, urgency, streak pressure, speed judgments, or claims that a technique is obvious. Never use “wrong” where “conflict” is the fact available. Success can be a short observation; it does not need applause.

## Navigation and first visit

- App name: Sudoku
- Main choices: Daily puzzle / Practice / Learn
- Theme choices: Light / Dark / Use device setting
- Onboarding heading: A place to learn Sudoku
- Introduction: Play a puzzle, or learn one technique at a time. You can pause whenever you like.
- Rules: Fill each row, column, and outlined 3 × 3 box with the numbers 1–9, using each number once in each group. The starting numbers stay fixed.
- First action: Select an empty cell, then choose a number. Turn on Notes to write small reminders instead of an answer.
- Learning invitation: Not sure where to begin? Start with the rules, then try a guided example.
- Actions: Play today's puzzle / Start a lesson / Close introduction

Keep onboarding dismissible. Keep rules available from Help after dismissal. Do not require an account or make the lesson path a prerequisite for play.

## Play controls and help

Visible labels: Notes / Undo / Redo / Erase / Hint / Reveal a cell / Help.
Notes state: Notes on / Notes off. Never communicate the state through color alone.
Touch help: Tap a cell, then tap a number. With Notes on, tapping a number adds or removes a note.
Fixed clue help: This is a starting number. It cannot be changed.

### Proposed keyboard contract

Publish these instructions only after the exact bindings work on supported platforms. Keep shortcuts inactive in text inputs and dialogs where they would interfere with normal input. Do not intercept browser or operating-system shortcuts without verifying compatibility.

- Arrow keys: Move between cells.
- 1–9: Enter a number. With Notes on, add or remove a note.
- N: Turn Notes on or off.
- Backspace or Delete: Clear the selected editable cell, including its notes.
- Ctrl+Z / ⌘Z: Undo.
- Ctrl+Shift+Z / ⌘Shift+Z: Redo.
- Tab / Shift+Tab: Move between controls.
- Enter or Space: Activate a focused button.
- Escape: Close an open help panel or dialog.

Use a single board tab stop with arrow-key navigation, not 81 stops. Selection and keyboard focus must remain visible in either theme. Do not advertise a keyboard shortcut for a hint or reveal until one is deliberately assigned.

## Notes and candidates

Help heading: Notes are reminders, not answers
Help text: A note is a small number you add to a cell. Use it to track possibilities. A candidate is a number not yet ruled out for that cell. Your notes may be incomplete or out of date; writing a note does not prove the number belongs there.
Rules-only candidates: To list the basic candidates, exclude numbers already placed in the cell's row, column, or box. Later techniques can rule out more.

Do not label player-entered notes “all candidates.” If automatic candidates are implemented, distinguish their rule-based calculation from the player's notes and state whether they update automatically. Never silently treat missing notes as logical eliminations in a lesson or hint.

## Hints and reveals

- Hint button: Hint
- Hint introduction: Look for one logical step. You choose whether to apply it.
- Staged actions: Show the area / Explain the step / Apply this step
- Reveal button: Reveal a cell
- Reveal confirmation: Show the solution number for this cell? This gives you an answer without explaining a deduction.
- Reveal actions: Reveal number / Keep working
- No supported hint: No supported logical hint is available for this position. You can undo a move, review the board, or reveal a cell.

A hint explains a supported deduction: placement or elimination. A reveal supplies a solution value. Never disguise a reveal as a hint. A hint must not silently edit the board; “Apply this step” is an explicit action. Keep explanations readable without requiring motion. If existing entries prevent a sound hint, identify that condition rather than inventing a deduction.

## Daily puzzles and difficulty

- Daily heading: Daily puzzle
- Date label: {UTC date} · UTC
- Reset help: A new daily puzzle starts at 00:00 UTC. Your local time may be different.
- Shared-puzzle help: Everyone gets the same daily puzzle for the same UTC date.
- Next-puzzle label: Next daily puzzle in {time remaining}
- Rollover notice: A new daily puzzle is available. You can finish this one first.
- Rollover actions: Keep playing / Open today's puzzle

Retain the displayed date when continuing an older puzzle; do not relabel it as today's. Use the UTC date, not the device's local date, to identify the daily puzzle. Show a countdown only when computed from the same reset boundary. Do not replace an active board automatically.

Proposed four difficulty labels: Beginner / Intermediate / Advanced / Expert.
Difficulty help: Difficulty reflects the techniques needed to solve the puzzle, not just how many starting numbers it has.
Practice action: Choose a difficulty
Lesson invitation: Try the technique before a full puzzle.

Bind labels to the engine's validated technique rubric. Do not promise an “easy” experience or assign difficulty by clue count. “Expert” describes the puzzle's required reasoning, not the person playing it.

## Local progress and recovery

- Storage help: No account needed. Progress and preferences are saved in this browser on this device. They do not sync. Clearing site data, using private browsing, or switching browsers may remove or leave behind your progress.
- Saved status: Saved on this device.
- Save failure: Progress could not be saved in this browser. You can keep playing, but this session may be lost when you leave.
- Invalid saved data: Some saved progress could not be read. That progress has not been restored.
- Start-over confirmation: Clear your entries and notes for this puzzle? The starting numbers will stay.
- Start-over actions: Clear entries and notes / Keep playing

Show “Saved” only after a successful storage write. Do not claim that everything was recovered or lost when only part of the data was checked. If storage is unavailable, show the warning before the player relies on persistence. A UTC reset must not imply that unfinished progress was deleted.

## Errors and feedback

- Duplicate entry: {number} is already in this {row / column / box}.
- Multiple conflicts: {number} is already in this cell's {conflicting groups}.
- Solution check, only if explicitly requested: This entry does not match the solution.
- Lesson placement: This number is still possible, but it is not forced here. Check the other cells in this {group}.
- Lesson elimination: This step does not rule out {number} here. Check which cells share the same {group}.
- Incomplete answer: Select the cell and number for this step.
- Puzzle load failure: This puzzle could not be loaded. Try again.
- Retry action: Try again

Conflict checking detects broken group rules; it does not prove other entries correct. Use solution-mismatch wording only when the solution was actually checked. Do not erase an entry as a side effect of feedback unless the interaction explicitly promises that behavior. Lesson feedback must name the actual logical gap; use the example templates only when their conditions hold.

## Completion and achievement copy

- Correct row: Row complete.
- Correct column: Column complete.
- Correct box: Box complete.
- Puzzle: Puzzle complete.
- Daily: Today's puzzle is complete.
- Lesson step: That follows from the candidates.
- Lesson: Lesson complete. Try another example, or return to the board.
- First independently tracked technique use: You used {technique} to find a step.
- Next actions: Review the board / Try another puzzle / Next lesson

Trigger correct-group feedback only after verification, not merely when every cell is filled. Do not praise a “correct row” if it is inconsistent with the solution. Avoid repeated announcements when one entry completes several groups; combine them into one status message. Pair a subtle monochrome completion animation with text; honor reduced motion. No bouncing, flashing, confetti, forced sound, or streak guilt. Do not infer independent technique mastery from a revealed answer or one guided response.

## Interactive lesson editorial rules

1. Teach a deduction, not a slogan. State the rule, show a validated position, then ask for one move or elimination. Separate what is given from what must be proved.
2. Show prerequisites. Introduce cell, row, column, box, candidate, and elimination before techniques that rely on them. Use “row 3, column 7” in prose and announce coordinates consistently to assistive technology.
3. Make the question exact: “Which number must go in row {r}, column {c}?” or “Which cells can no longer contain {n}?” State whether one or several answers are expected.
4. Expose the evidence. Highlight only the relevant groups and candidates; also describe them in text. Never rely on color, animation, hover, or tiny notes alone.
5. Validate every scenario with the engine. Check givens, candidate sets, the claimed deduction, and the expected interaction. Full puzzles must have one solution. Partial teaching diagrams must be labeled and separately checked for the specific local claim; never imply they are complete playable puzzles.
6. Explain why a deduction is forced. “Only remaining place in this row” is different from “only remaining candidate in this cell.” Do not blur them into “the only option.”
7. Give useful feedback before the answer. Identify the missed relationship, offer a narrower view, then allow an explicit reveal. Accept every logically equivalent valid answer, or narrow the question so a single target is clear.
8. Never infer candidates from incomplete player notes. Supply the complete relevant candidate sets for eliminations and say when irrelevant cells are omitted.
9. Let the player retry, undo, restart the scenario, and leave. Track lesson completion separately from unassisted success. Avoid timers and speed-based praise.
10. Use proven examples, not attractive invented boards. Record the technique, prerequisites, givens, relevant candidates, expected action, proof, and validation evidence alongside each lesson definition. These are acceptance requirements, not claims of completed validation.

### Suggested progression, subject to engine support

- Foundations: Rules, coordinates, notes, and basic candidates.
- Beginner: Naked singles; hidden singles.
- Intermediate: Locked candidates; naked and hidden pairs.
- Advanced: Triples; X-Wing; Swordfish.
- Expert: XY-Wing; simple coloring; candidate chains with every implication shown.

Lesson order and puzzle difficulty are separate rubrics. Do not ship an unsupported technique because it appears in this outline. Define chain assumptions and contradictions explicitly; never present guessing as a proved elimination.

### Reusable scenario structure

Title: Hidden single in a row
Principle: A number must go in a cell if no other cell in the row can contain it.
Setup: Use a validated example with exactly one place for {number} in row {r}. Show the candidates needed to verify that claim.
Prompt: Which cell in row {r} must contain {number}?
Reasoning: The other cells in this row cannot contain {number}. This is the only remaining place for it in the row.
Retry: Check every open cell in row {r}. Where is {number} still possible?
Reveal action: Show the cell
Transfer: Try a new example without the highlighted row.

This is a writing template, not a validated puzzle state. Substitute values only from an engine-checked lesson fixture.

## Integration checks still required

Verify keyboard/touch bindings; screen-reader names and announcements; reduced-motion behavior; all storage outcomes; UTC rollover without board replacement; exact difficulty rubric; hint-versus-reveal behavior; and every technique fixture. Do not publish conditional copy for missing features. This contribution contains no implementation, fixture validation, runtime test, or deployment claim.
