# Calm Sudoku: experience and learning direction

Author: Shachi, storytelling and experience collaborator.
Scope: design proposal for the Sudoku parent project (Ebi project the Sudoku project), not an implementation or an assertion of shipped behavior.
Source of requirements: checkout `AGENTS.md` and the authorized assignment. No private records, borrowed assets, fictional lore, or other projects inform this proposal.

## The experience promise

Make understanding feel like the reward. The small arc is **notice → try → understand → settle**. The board remains the main event; feedback briefly acknowledges an earned change, then gets out of the way. Nothing depends on characters, a fictional journey, a competitive identity, or a branded game presentation.

A successful session can be one understood elimination, not only a finished puzzle. Expert work gets the same quiet respect as a first single. Avoid infantilizing beginners or turning experts into a prestige class.

## Arrival, return, and the daily puzzle

- Open to a clear choice: today's puzzle, practice, or lessons. Show difficulty and resume state without an animated entrance or modal tutorial.
- On a first visit, offer “Learn a first move” beside “Start a puzzle.” Neither path is compulsory. Explain controls at the point of use.
- The daily puzzle uses the shared UTC identity required by the project. Label it with its UTC date and a concise explanation where useful. At rollover, never replace an in-progress board; offer the new daily separately.
- Returning copy is factual: “Continue today's puzzle.” After an absence, no “you missed,” broken streak, countdown pressure, or guilt. Daily completion is an optional record, not an obligation.
- A missed day loses nothing. Practice and lessons remain available without waiting for another daily release.
- Preserve a stable board layout during play. Put contextual help beside it on desktop and in a deliberate, non-obscuring panel on mobile; opening help must not shrink or reposition cells beneath a finger.

## Completion feedback: small, local, earned

These are proposed timings for usability testing, not measured results. Implement with CSS or native vector geometry, using only black, white, and neutral gray hierarchy. Thin lines, square endpoints, zero rounded corners, no decorative shadows, particles, gradients, or borrowed visual assets. Light mode is a white field with black marks; dark mode reverses them. No glow, zoom, bounce, shake, or full-board inversion.

### Define the trigger before drawing it

A row, column, or box earns feedback only when it transitions from incomplete to fully filled and correct for the validated puzzle solution. A full group that merely has no duplicate digits is not necessarily correct. An elimination or pencil mark does not complete a group. Given cells alone, initial load, restoring progress, changing themes, and opening help never trigger rewards.

This requires a deliberate product distinction: completion feedback confirms the truth of a finished group, but ordinary entries need not reveal whether each digit matches the solution. Explain that scope in help; do not imply the app is an error-free correctness oracle only after a user discovers it. If an explicit no-check mode is introduced later, suppress solution-confirming group effects there rather than quietly leaking answers.

- Detect row, column, and box transitions from the same committed move, then render a single coordinated event. Pencil-mark cleanup is not a second event.
- A confirmed region can be rewarded once per puzzle attempt. Undoing and re-entering a digit does not replay it. Persist acknowledgement with progress when storage is available; session-only tracking is the safe fallback.
- No wrong-entry counterpart: an unearned reward is simply absent. Explicit “Check” feedback uses the separate learning language below, not a failed celebration.

### Row: a line comes to rest

A hairline briefly traces the inside lower edge of the completed row, then fades into the existing grid. About 280–380 ms total. Do not move or brighten the digits. Keep the temporary line inset enough to avoid changing the meaning of box boundaries.

The beat is “this part is settled,” not “you scored.” No toast is needed for a single row.

### Column: the same grammar, another direction

Use the corresponding inside right edge, with the same weight and timing. This feels consistent rather than a new reward category. Keep the selected-cell indicator distinct and unchanged.

### Box: a quiet enclosure

Trace a thin inset rectangular outline once around the completed box, then let it disappear, about 350–450 ms total. No rotating object, expanding ripple, or thickening of the permanent box border. The temporary enclosure must not be mistaken for keyboard focus or the selection state.

### One move completes several regions

Start the earned edges together; do not queue a row show, then a column show, then a box show. Use one shared fade and avoid doubling opacity at intersections. Keep the entire event under 500 ms and accept the next input immediately. Input never waits for animation.

If another move arrives during the event, replace transient emphasis with the latest relevant state rather than accumulating effects. Visible board updates take precedence over finishing a flourish.

### Puzzle: a deliberate exhale

On a newly verified complete solution, replace regional effects with one quiet inset board-outline acknowledgement, about 450–650 ms. No camera movement, confetti, victory overlay, automatic navigation, or celebratory sound by default.

Immediately show a stable adjacent result panel: “Puzzle complete.” Keep the solved grid visible. Offer “Review this puzzle” and “Choose another puzzle”; lessons may be a third, lower-emphasis link. On mobile, place this panel after the grid without stealing focus or scrolling unexpectedly.

Optional factual detail: puzzle difficulty and techniques actually demonstrated through validated lesson or hint interactions. Do not infer mastery, independence, or “techniques used” solely from entered digits. Never call a hinted solve unaided. Time can be available on request, not the headline or a measure of intelligence.

The terminal completion state is durable. On reload, show the completed board and result text without replaying the animation. Undo returns to an unfinished state and removes the completion message, but does not create an endlessly repeatable celebration.

## Non-punitive learning language

Describe the state, explain the constraint, and offer a next action. Be precise without becoming a schoolmaster. No red flashes, buzzers, lives, shame, exaggerated praise, or claims about a person's ability. Encouragement must refer to an observable action.

| Situation | Suggested copy | Behavior |
| --- | --- | --- |
| First useful observation | “Start with this row. Which digit is missing?” | Highlight only the relevant unit; leave the board readable. |
| Supported elimination | “Yes. Those two cells reserve 2 and 7, so neither digit can go elsewhere in this row.” | Keep the reason visible long enough to inspect; do not auto-advance. |
| Incorrect elimination | “That candidate is still possible. What excludes it?” | Explain the missing constraint on request; preserve the attempt for comparison, with an obvious undo. |
| Duplicate entry | “There is already a 6 in this column.” | When conflict checking is enabled, identify both cells with non-color-only markers; offer undo. |
| Wrong choice without an immediate duplicate | “This choice conflicts with the puzzle's solution. Reveal the reason, or undo and keep exploring.” | Only after an explicit check; do not invent a local logical contradiction if none has been established. |
| Hint requested | “Let's narrow the search to this box.” | Begin with location, not the answer. Let the user request another step. |
| Repeated difficulty | “See a smaller example, reveal this step, or keep trying.” | Real choices with no timeout and no forced simplification. |
| Correct move, uncertain reasoning | “That works here. Which constraint makes it necessary?” | Optional reflection in a lesson, not an interruption during free play. |

“Correct” requires validated reasoning or a verified move, not confident wording. If an alternative explanation is sound, accept it; do not reject a valid deduction merely because it differs from the scripted path. Where the lesson engine only recognizes specific explanations, say so and allow another attempt without branding the user's reasoning false.

Hints have a reveal ladder: relevant region → relationship to notice → explicit deduction → apply on request. Never charge a penalty, silently place a digit, or advance without consent. Keep a disclosed hint history so learners can review what helped.

## Progression: increasing independence, not decorative ranks

Keep puzzle difficulty separate from lesson progress. The project's four puzzle levels need solver-backed technique evidence, not clue count or completion time. The following learning stages are a proposed curriculum map, not claims that lesson scenarios already exist or that a learner must proceed in lockstep.

| Stage | Reasoning focus | Interactive scenario and observable success |
| --- | --- | --- |
| Orientation | Rows, columns, boxes; scanning; naked and hidden singles | On a validated board or explicitly labeled partial-board exercise, select the relevant unit, identify its missing possibility, then place the forced digit. Explain why the other cells cannot take it. |
| Relationships | Candidates; locked candidates; naked and hidden pairs | Compare intersecting units, select the candidates constrained to a region or pair, and remove only the candidates that relationship excludes. |
| Patterns | Triples; X-Wing; broader multi-unit reasoning | Identify the supporting cells and shared candidate before making an elimination. Include a near-match where one extra candidate invalidates the pattern. |
| Expert reasoning | Swordfish; XY-Wing; coloring and carefully defined inference chains | Build or inspect a bounded implication sequence. State its assumptions and the exact common consequence; reject a plausible-looking chain with a missing link. |

Use familiar technique names for discoverability, but teach the relationship rather than pattern-shaped guesswork. Check prerequisite coverage before publishing a lesson; an expert label does not excuse a missing explanation. Advanced topics can be phased in only with validated content, never empty “expert” cards posing as available lessons.

Each technique follows this rhythm:

1. **Notice:** give a small, readable scenario with the necessary candidates visible. Say what is being sought without highlighting the answer.
2. **Explain:** demonstrate one example and its reason before asking for an independent move or elimination.
3. **Try:** use a different validated scenario. Ask the learner to identify support and consequence, not just tap a glowing cell.
4. **Distinguish:** offer a valid pattern and a near-match; ask why only one supports the deduction.
5. **Transfer:** offer a fuller board where the learner chooses where to look. Guidance stays available but is not automatically displayed.
6. **Reflect:** show the actual deduction and the learner's choices. End with “Try another example” or “Return to your puzzle,” not an obligatory next lesson.

Keep status labels honest: “Explored,” “Completed with guidance,” and “Demonstrated independently” describe recorded interactions. A reasonable proposed threshold for the last label is correct support and consequence on two distinct validated scenarios, including one unguided transfer. This is product evidence, not a scientific certification of mastery. A revealed answer does not count as independent evidence, and replaying the same scenario does not manufacture it. Never reduce prior progress because someone asks for help later.

Let people preview or jump ahead, with prerequisite links rather than locks. Offer optional review of techniques they have encountered; no decay timer, streak obligation, or race to expert. If local storage is unavailable, explain that progress lasts for this session and keep lessons usable.

## Attention and accessibility guardrails

- Respect `prefers-reduced-motion` immediately and on change. Reduced motion replaces traces with static adjacent text or a nonmoving completion marker, not a faster animation. Also provide an in-app animation-off choice; neither setting removes the information.
- Never flash, pulse repeatedly, or invert the board. There is no autoplay audio. Any future sound requires explicit opt-in and a visible mute control; sound cannot carry unique information.
- Use a polite, coalesced live announcement such as “Row 4 and box 5 complete.” On the final move announce only “Puzzle complete.” Do not announce every candidate update or force screen readers through decorative animation. Decorative strokes are hidden from assistive technology.
- Offer persistent, user-requested access to completed-region status rather than relying on a brief visual event. Completion status, focus, selection, conflicts, and related-cell highlighting need distinguishable semantics and non-color-only cues.
- Keep digits and important controls at WCAG AA contrast in both themes. Essential focus and state indicators need non-text contrast too. Neutral gray is not permission for unreadable candidates. Verify actual rendered contrast; these guidelines are not an audit result.
- Fully support keyboard play and lesson actions, with visible focus and documented controls. No timed key sequences, drag-only elimination, hover-only explanations, or focus theft after completion. Avoid a keyboard trap in the grid; provide a documented way to enter and leave it.
- Give screen-reader cells meaningful row, column, value, given/editable, and candidate state. Announce user-requested detail rather than overwhelming every navigation step. Test an actual screen reader; ARIA presence alone is not verification.
- Aim for touch targets of at least 44 CSS px for controls. A full mobile grid may need a different approach: test adjacent-cell accuracy at narrow widths, provide a well-spaced number pad, and offer an accessible enlarged cell-entry view rather than pretending every visible cell meets that target.
- Test zoom, text enlargement, portrait/landscape, and small desktop windows. Feedback panels must not cover the number pad or obscure puzzle context. Never make precision drawing or animation perception part of a lesson answer.
- Do not dismiss the explanation on a timer. Let learners pause, undo, reread, and exit without losing their board. Keep assistance controls consistent across input methods.

## Integration checks for the parent project

These are acceptance checks to run against implementation; they have not been executed on a running app by this contributor.

- Correctly complete a row, column, and box individually; confirm one local acknowledgement each and no digit movement. Fill a duplicate-free but solution-incorrect unit; confirm no earned reward.
- Complete multiple units with one move; confirm a single coalesced event and announcement. Complete the puzzle; confirm it supersedes regional effects, keeps the board visible, and leaves input/focus under user control.
- Undo, redo, reload, and reopen a solved puzzle; confirm stable status without reward farming or replay on hydration. Test rapid entry while effects are active.
- Enable reduced motion and animation-off; confirm all status information survives without motion. Check both themes, keyboard-only navigation, an actual screen reader, touch, narrow layouts, and zoom.
- Exercise each hint rung, wrong elimination, alternative valid deduction, revealed answer, and local-storage failure. Confirm explanations stay truthful and progress claims reflect the help actually used.
- Validate every published lesson scenario with the engine: unique-solution full puzzles, legal candidates, valid deductions, intended prerequisites, and solvable follow-up states. Label partial-board exercises explicitly and validate their local constraints; do not imply a unique full puzzle unless verified.
- Verify puzzle-level labels against the implemented logical solver. Do not equate lesson stage, speed, clue count, or an absence of mistakes with actual puzzle difficulty.
- Cross a UTC daily rollover with unfinished work. Confirm the board stays intact, the new daily is offered separately, and no missed-day message creates pressure.

## Contribution boundary and limitations

This contribution is original prose and interaction direction suitable for the public MIT project; it includes no imported artwork, audio, typeface, branded presentation, or external asset dependency. Proposed timings, copy, thresholds, and curriculum require implementation and usability testing. There was no app execution, lesson-engine validation, accessibility audit, commit, push, deployment, purchase, profile change, or desktop-project binding in this assignment. Only `docs/contributions/experience.md` is authorized for writing. Directory association was verified; a named desktop session association was not established.
