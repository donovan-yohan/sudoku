# Motion addendum

## Opt-in mistake feedback

The later Show mistakes preference defaults off. When enabled, a wrong editable entry is red based on the puzzle solution, including wrong values that do not duplicate a peer. Only a newly entered wrong value triggers a short horizontal movement of its digit, not the board or cell boundary. Notes, givens, settings changes, restore, undo and redo do not trigger it. Reduced motion disables shaking while retaining red and accessible invalid-state feedback. This exception does not change the default quiet monochrome play mode.

The user refined the brief during implementation. This supersedes the no-color/no-full-board-effect proposals in the early profile contribution documents.

- Keep the resting UI black/white, thin square geometry, inverse themes.
- Rotate a set of original effects rather than replay one. Hairline sweep, soft cell wave, box perimeter trace, sparse square constellation, and prism scan are examples.
- Early unit completions are subtle neutral effects. Later completions grow in spread and duration, with transient chromatic shimmers only inside the earned effect.
- Finishing the whole puzzle earns a brief full-board color celebration. Preserve digits and input, do not flash or shake the page, and return to monochrome.
- Coalesce simultaneously completed row/column/box into one event, rotate deterministically, never replay on restored state or undo/redo.
- Let unit effects breathe with a 1200ms base plus 35ms per completed unit, preserving the original intensity. Digit-set celebrations use staggered individual hops/shimmers; neither effect shifts the board or replays after undo/restoration.
- Reduced motion yields static textual status, not a faster animated effect. Sound stays off.

Confirmed user direction, not a claim of implemented or tested behavior.
