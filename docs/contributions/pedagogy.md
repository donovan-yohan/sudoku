# Sudoku pedagogy and mathematical correctness

Contributor: Iruka (iruka-sensei), teaching/proof-design contribution.

Scope: design specification, not an implemented or validated lesson engine. Prepared for the user-authorized Sudoku project at `.`, parent session the originating build session, logical parent Ebi project the Sudoku project. Root `AGENTS.md` was read before project inspection. No prior project history is assumed.

## 1. Learning contract

Teach a reason, then ask for an action. A solution lookup is not an explanation. Every accepted lesson step must follow from the displayed grid and established candidate facts, without relying on a hidden answer.

A lesson cycle is: objective → prerequisite reminder → observe → identify evidence → predict consequence → make placement/elimination → explain why → transfer to a different arrangement. Reveal progressively: unit, pattern, decisive implication, then full explanation. A wrong attempt must not silently alter the board. Do not punish investigation or use a timer as a proxy for understanding.

A correct digit with an invalid stated reason receives two distinct signals: “That digit matches the solution” and “This reason does not establish it.” Lesson completion requires the intended reasoning task, not guessing the answer. In free play, logically valid alternative techniques remain valid. In a narrowly targeted lesson, acknowledge them and offer reset/continue rather than falsely calling them wrong.

Four puzzle difficulty bands are provisional: Beginner, Intermediate, Advanced, Expert. Assign using a documented deterministic logical solver policy, hardest necessary technique, dependency depth and workload. Clue count alone is not evidence. Lesson mastery and puzzle rating are different measures. Expert does not mean “needs guessing.” Publish the supported technique ceiling; do not claim exhaustive human-solving coverage.

## 2. Progression and prerequisites

Each stage has guided demonstration, scaffolded exercise, independent exercise, and transfer exercise with relocated/digit-permuted structure. A permutation alone tests recognition invariance, not diverse strategy selection; include structurally different examples too. Mark a stage mastered only after independent evidence identification and application; record hints separately, without withholding content behind a punitive gate.

| Stage | Techniques / conceptual objective | Required understanding | Required learner evidence |
| --- | --- | --- | --- |
| 0: rules | Rows, columns, boxes; givens versus entries; one digit per unit | None | Identify peers, explain a duplicate, distinguish legal from proven |
| 1: beginner | Full-house completion; naked single; hidden single in row, column, box | Rules, unit membership | State which alternatives are excluded, or all remaining locations for a digit |
| 2: candidate literacy | Complete candidate sets; pencil marks versus engine candidates | Basic singles | Enumerate candidates using all three units; spot a missing note without treating it as an elimination |
| 3: intermediate intersections | Locked candidates: pointing and claiming | Complete candidates, hidden singles | Identify source unit, intersection, all source occurrences, outside targets |
| 4: intermediate subsets | Naked pairs/triples, hidden pairs/triples; quads as optional extension | Candidate completeness, set union, intersections | Identify k cells/digits and the exact subset restriction; distinguish naked from hidden proof |
| 5: advanced fish | X-Wing, Swordfish; optional Jellyfish | Strong links, base/cover unit sets, subset reasoning | Enumerate every base occurrence for one digit and the k cover units |
| 6: advanced wings | XY-Wing, XYZ-Wing | Bivalue cells, common peers, conditional reasoning | Name pivot/wings, branch cases, and cells that see every required candidate instance |
| 7: advanced coloring | Simple coloring on conjugate pairs | Exactly-two occurrence links, weak versus strong implications | Identify a connected conjugate graph and prove color contradiction or two-color visibility |
| 8: expert chains | X-chains, XY-chains, alternating inference chains (AIC) | Candidate propositions, strong/weak links, negation | Supply a checkable implication path and explain why both endpoint alternatives exclude the target |
| 9: expert extensions | Finned fish, ALS-XZ, uniqueness-based rectangles as explicitly qualified modules | Ordinary fish; almost-locked sets; puzzle uniqueness distinction | Verify the extra fin/visibility restrictions, ALS restrictions, or explicit uniqueness premise |

Teach candidate literacy before any elimination task even if learners skip earlier singles. Optional expert modules ship only after their specialized validator exists. Until then label them planned, not available. Forcing nets/search are separate optional material: disclose branching assumptions and distinguish exhaustive contradiction proof from an unexplained trial.

### Scenario authoring requirements

Each technique needs a positive scenario, a near-miss with the decisive prerequisite broken, a distractor scenario, and a transfer scenario. Each authored board must be a reachable state of a uniquely solvable puzzle, with replayable placements/eliminations and a frozen expected proof certificate. Do not hand-invent a visually plausible candidate diagram and call it a validated puzzle. Abstract diagrams may explain logic only when explicitly labeled non-playable and not counted as puzzle fixtures.

Useful near-misses: an extra source occurrence breaks pointing; a third digit breaks a naked pair; one extra cover column breaks an X-Wing; a cell seeing only one wing cannot be an XY-Wing target; a candidate absent only from personal notes has not been eliminated. Include multiple simultaneous valid patterns so recognition does not depend on the only highlighted shape.

## 3. Candidate semantics: completeness is a proof precondition

For an empty cell c, define legal candidates L(c) = {1,…,9} minus values already placed in every peer. Filled cells have no candidate set. Legal does not mean globally feasible.

Keep these three layers distinct:

1. Legal candidates L: reconstructed from the current grid; no advanced deductions.
2. Logical candidates C: L minus individually validated eliminations, with a replayable justification ledger. A sound ledger preserves all values that can occur in a completion consistent with the accepted state. C can still contain impossible values awaiting deduction; it need not equal the set of globally feasible values.
3. Player notes N: arbitrary annotations. Missing N entries prove nothing. Extra notes are possible user mistakes, not engine evidence.

Technique detection uses C, never N. For lessons requiring a complete candidate display, render C directly or synchronize notes through an explicit “show complete candidates” action. Explain when previously proved eliminations make C smaller than L. Do not restore a proved elimination merely because L is recomputed; do not retain it if its assumptions were undone.

Reject a placement that duplicates a peer or makes the logical state contradictory. In lesson mode, additionally require a verified deduction. Free-play entry policy may allow unresolved mistakes, but they must not enter the trusted teaching state or ledger. Never derive a proof from an inconsistent tentative board.

Undo/edit/reset must restore a prior trusted snapshot or replay from givens and invalidate all dependent deductions. A givens/board revision mismatch invalidates certificates. Candidate changes must not create an empty cell domain or leave an unfilled unit digit with zero locations. These checks are necessary, not sufficient, for global consistency.

## 4. Technique correctness obligations

All rules below assume a consistent accepted state with complete C and no duplicate accepted values. Every target is empty, currently contains the candidate being removed, and is not part of the protecting pattern unless the rule explicitly permits internal elimination.

- Full house / naked single: the missing unit digit / only candidate is determined; reject empty domains rather than interpreting them as singles.
- Hidden single: an unplaced digit has exactly one candidate location in a specified unit. “One highlighted location” is not sufficient: enumerate all nine cells.
- Locked candidates: all remaining source-unit locations for d lie in its intersection with a second unit. Eliminate d from the second unit outside that intersection. Prefer at least two source locations in the teaching example; a sole location is already a hidden single. Check both pointing (box→line) and claiming (line→box).
- Naked subset: k distinct empty cells in one unit have a union of exactly k candidates. Eliminate those digits from other cells of that unit. No selected cell has an empty domain. A triple need not have three candidates in each cell.
- Hidden subset: k unplaced digits have candidate locations whose union is exactly k cells of a unit; every selected digit occurs. Remove other candidates only inside those cells. A pair of highlighted digits is insufficient without excluding their other unit locations.
- Basic fish: for a digit d, choose k distinct row bases and k column covers (or transpose). Every base occurrence lies in those covers, each base has at least one occurrence, and C is sound. Then remove d from covers outside bases. Ordinary teaching examples use at least two occurrences per base and avoid degenerate embedded singles/subsets. Validate the full base candidate census, not four/six highlighted corners. Finned fish require a separate certificate; do not relax this rule informally.
- XY-Wing: pivot {x,y}, distinct wings {x,z} and {y,z}, with three distinct digits and each wing seeing pivot. A target outside these cells must see both wings and contain z. Pivot x forces the {y,z} wing to z; pivot y forces the {x,z} wing to z. The wings need not see each other.
- XYZ-Wing: pivot {x,y,z}, wings {x,z} and {y,z}, both seeing pivot. The z target must see pivot and both wings: pivot z is a third branch. Omitting pivot visibility is unsound.
- Simple coloring: graph vertices are occurrences of one digit; an edge connects exactly two occurrences in a unit, implying opposite truth values. Two same-color vertices sharing a unit invalidate that color; an uncolored target seeing both colors is false. Check graph connectivity and reject malformed odd cycles/inconsistent premises rather than issuing arbitrary eliminations.
- Chains: each node denotes (cell,digit), not merely a cell. A weak link means not-both-true; a strong link means at-least-one-true. Bivalue cells and conjugate unit pairs supply strong links only while exactly two alternatives remain. Validate directed implications, including negation, on the current revision. A robust elimination certificate explicitly establishes “target true implies contradiction”; a placement certificate establishes “target false implies contradiction.” Do not accept an alternating-looking line as proof without checking each link and endpoint implication.
- ALS-XZ / finned fish: require explicit specialized predicates and validators before publishing. For ALS-XZ, specify the variant, ALS sizes/unions, restricted common candidate semantics and target visibility; for finned fish, enumerate fins and prove why each target is excluded both when a fin is true and when every fin is false. A generic expert label is not a validator.
- Uniqueness techniques: use only in a separately labeled module whose premise is a verified unique puzzle and an explicit supported rectangle variant. Explain the alternative-completion argument. Never present uniqueness as a consequence of local Sudoku rules or accept a rectangle shape alone.

## 5. Feedback that explains why

Every step should name (a) observation, (b) governing rule, (c) consequence, (d) scope. Example template, not a validated fixture: “In row {r}, every remaining {d} is inside box {b}. Row {r} must contain {d}, so those positions reserve {d} within box {b}. Remove {d} from the other cells of that box—not from the rest of the row.” Coordinates and candidate lists must be generated from the checked certificate, not handwritten independently.

Error feedback should distinguish invalid pattern, incomplete evidence, valid deduction using a different technique, stale board, and a correct target with unsupported reasoning. Explain the first failed predicate: “There is another {d} at {cell}, so these are not the only two positions.” Do not expose the solution as the explanation. Offer a useful next observation rather than “try again.”

Use monochrome distinctions that survive both inverse themes: thin outline, dashed outline, hatch, digits/symbol labels, and concise prose. Never make color the sole evidence channel. Support keyboard selection, touch-friendly controls, visible focus, a textual proof summary, and non-drag alternatives. Completion animation should be a short line/opacity treatment, not rounded confetti or a color flash; honor reduced motion. Trigger unit rewards only on a transition to a validated complete row/column/box, not merely duplicate-free partial fill. Undo/redo and repeated checks must not spam rewards. A finished unit does not certify the whole puzzle.

## 6. Runtime architecture B: shared pure domain, separate orchestration

Recommendation: architecture B for production lessons, using static fixtures as authored inputs rather than an independent rules implementation. The static Vite app can execute this entirely client-side; no server/API hosting is required. “API” below means TypeScript module interfaces.

Layering:

- `domain`: grid/unit/peer utilities, candidates, invariants, proof validators, immutable reducer. No React, storage, animation or clock.
- `techniques`: deterministic detectors emitting proof certificates; validators independently re-check certificates rather than trusting detector highlights.
- `game`: user entries/notes, undo, daily/practice identity and completion transitions. Keep tentative play separate from a trusted logical state.
- `lessons`: fixture loading, instructional phase, evidence questions, accepted alternatives, hints, mastery. Calls the same domain validation/application as game hints; does not own a competing candidate implementation.
- `ui`: renderer and accessible interactions derived from state; certificate highlights and prose share the same semantic data.
- `content-validation`: offline fixture/replay/uniqueness checks. Export only approved versioned fixtures to the static bundle; runtime rejects unsupported schema versions.

### Proposed types (design surface, not existing implementation)

```ts
// Constructors validate all untrusted numbers; brands are not runtime checks.
type Cell = number & { readonly __cell: unique symbol }; // 0..80
type Digit = number & { readonly __digit: unique symbol }; // 1..9
type Unit = { kind: 'row' | 'column' | 'box'; index: number }; // 0..8
type Revision = number & { readonly __revision: unique symbol };
type Grid = ReadonlyArray<Digit | null>; // exactly 81
type Candidate = Readonly<{ cell: Cell; digit: Digit }>;
type Effect =
  | Readonly<{ kind: 'place'; cell: Cell; digit: Digit }>
  | Readonly<{ kind: 'eliminate'; cell: Cell; digit: Digit }>;
type Technique =
  | 'full-house' | 'naked-single' | 'hidden-single' | 'locked'
  | 'naked-subset' | 'hidden-subset' | 'fish'
  | 'xy-wing' | 'xyz-wing' | 'coloring' | 'chain';
// Optional expert extensions are not accepted until registered validators exist.
type PremisesByTechnique = {
  'full-house': { unit: Unit };
  'naked-single': { cell: Cell };
  'hidden-single': { unit: Unit; digit: Digit };
  locked: { source: Unit; destination: Unit; digit: Digit };
  'naked-subset': { unit: Unit; cells: readonly Cell[] };
  'hidden-subset': { unit: Unit; digits: readonly Digit[] };
  fish: { digit: Digit; bases: readonly Unit[]; covers: readonly Unit[] };
  'xy-wing': { pivot: Cell; wings: readonly [Cell, Cell] };
  'xyz-wing': { pivot: Cell; wings: readonly [Cell, Cell] };
  coloring: { digit: Digit; edges: readonly (readonly [Cell, Cell])[] };
  chain: { assumption: { candidate: Candidate; truth: boolean };
    implications: readonly { from: Literal; to: Literal }[] };
};
type Literal = Readonly<{ candidate: Candidate; truth: boolean }>;
type Proof = { [K in Technique]: Readonly<{
  technique: K;
  puzzleId: string;
  revision: Revision;
  premises: PremisesByTechnique[K];
  effects: readonly Effect[];
}> }[Technique];
type Failure = Readonly<{
  code: 'stale' | 'invalid-state' | 'unsupported' | 'missing-premise'
    | 'invalid-effect' | 'schema';
  messageKey: string;
  evidence: readonly Candidate[];
}>;
type Result<T> = { ok: true; value: T } | { ok: false; error: Failure };
type TrustedState = Readonly<{
  puzzleId: string;
  givens: Grid;
  grid: Grid;
  revision: Revision;
  candidates: ReadonlyArray<readonly Digit[]>; // complete C, 81 cells
  ledger: readonly Proof[];
}>;
// In implementation this is opaque; only the validator can construct it.
type CheckedProof = Proof & { readonly __checked: unique symbol };
type GameState = Readonly<{
  trusted: TrustedState;
  tentativeEntries: Grid;
  notes: ReadonlyArray<readonly Digit[]>;
}>;
type LessonState = Readonly<{
  fixtureId: string;
  fixtureVersion: number;
  phase: 'observe' | 'evidence' | 'predict' | 'apply' | 'explain' | 'transfer';
  trusted: TrustedState;
  selectedEvidence: readonly Candidate[];
  hintsUsed: readonly string[];
  attempts: number;
}>;
interface TeachingEngine {
  initialize(puzzleId: string, givens: Grid): Result<TrustedState>;
  detect(state: TrustedState, allowed: readonly Technique[]): readonly Proof[];
  check(state: TrustedState, proof: Proof): Result<CheckedProof>;
  apply(state: TrustedState, proof: CheckedProof): Result<TrustedState>;
  explain(proof: CheckedProof): {
    messageKey: string;
    evidence: readonly Candidate[];
    effects: readonly Effect[];
  };
}
```

Runtime constraints beyond the types: validate distinct cells/digits, legal unit relations, range/array sizes and nonempty effects. Each rule checks that every claimed effect is entailed; do not trust arbitrary supplied effects. `apply` rechecks identity/revision and current premises even for a checked proof, applies effects atomically, increments revision and preserves givens. A checked brand cannot cross JSON/storage boundaries. `initialize` computes L, validates local consistency and consumes only puzzle content that passed offline uniqueness validation; it does not imply a full runtime uniqueness search. Importing arbitrary puzzles requires a separate explicit validation path.

Use revision together with puzzle identity and a monotonic session revision policy (including undo) to prevent stale certificates being accepted on a different board branch. An alternative is a canonical state fingerprint; never rely on revision alone across sessions. Restore a saved ledger by validating/replaying it; do not accept persisted candidate arrays or mastery flags as trusted proofs. An unsupported/corrupt save degrades to safe givens and recoverable preferences, with a clear message.

The proof API accepts a subset of a pattern's available eliminations if each is valid. Detector ordering must not dictate correctness. Normalize effect/evidence sets before comparing lesson answers. Evidence questions can demand the intended complete source census separately from deduction acceptance.

### B versus static-only fixtures

| Concern | Static fixture / expected-click script | Architecture B |
| --- | --- | --- |
| Cost | Smallest initial UI/demo | More engine/validator work and tests |
| Correctness | Can check one frozen path offline; clicks alone do not establish logic | Each current-state action receives rule validation |
| Alternatives | Needs explicit authored branches; otherwise valid answers can be rejected | Recognizes any supported valid certificate; lesson goal remains separate |
| Notes / undo | Easy to drift from real game semantics | Shared candidate semantics and replay |
| Explanations | Handwritten text can diverge from board | Certificate-derived coordinates and consequences |
| Content | Still needs unique puzzles and sound authored states | Same fixture obligations; engine does not absolve authors |

A narrow MVP may use static fixtures with one immutable scenario and explicit resets, provided it says “guided example,” validates every scripted step offline, and does not pretend to be an open reasoning tutor. Keep fixture schema compatible with B: puzzle/version, givens, replay ledger, target technique, accepted evidence requirements, checked effects, staged hints, text keys, transfer fixture IDs. Do not create a second candidate engine for the MVP. Prefer shipping fewer verified lessons over an expert syllabus of unverified click-throughs.

## 7. Mathematical and behavioral release checklist

Content and board integrity:

- [ ] Every playable fixture has 81 cells, legal givens, and exactly one solution (independent solver counts up to two).
- [ ] Replay starts from givens and validates each placement/elimination, maintaining givens and complete candidates.
- [ ] Target pattern exists on the exact replay revision; all explanation coordinates resolve.
- [ ] Every near-miss fails for its intended predicate, not an unrelated contradiction.
- [ ] Prerequisites are explicit and accessible; lesson sequencing does not require an untaught candidate concept.

Proof validation:

- [ ] Positive and negative behavioral tests are written before each rule implementation; record real RED/GREEN results.
- [ ] For each rule, mutate a decisive premise (extra occurrence, missing peer, wrong digit, stale revision); no elimination is accepted.
- [ ] Placement oracle: no completion satisfies the state plus `cell != digit`. Elimination oracle: no completion satisfies the state plus `cell == digit`. First establish that the input state has a completion, to avoid vacuous proofs.
- [ ] Test generic logical rules on consistent multi-solution boards too. A hidden unique answer must not conceal an invalid proof. Test uniqueness-only modules separately.
- [ ] Use a reference solver implementation independent of production detectors; also inspect the local rule proof. Oracle agreement alone cannot distinguish a good explanation from a lucky answer on a unique board.
- [ ] Test digit permutations, transpose, row permutations within bands, column permutations within stacks, and band/stack permutations. These transformations preserve Sudoku constraints; arbitrary row swaps do not.
- [ ] Test candidate completeness after elimination, placement, undo, branching, save/restore and note editing. Notes never change C.
- [ ] Test no empty cell domains, no missing unit locations, atomic failed actions and unchanged givens.

Interaction and product:

- [ ] Wrong-but-legal, right-but-unsupported, alternative-valid and stale attempts have distinct feedback.
- [ ] Touch and keyboard can supply the same evidence without drag-only input; screen-reader text explains the deduction.
- [ ] Both monochrome themes keep pattern roles legible without color; reduced motion suppresses celebratory movement.
- [ ] Each completed unit reward fires on a validated transition only; multiple newly completed units are handled without excessive effects.
- [ ] Daily puzzle selection uses UTC identity shared across visitors; lesson progress never changes the daily puzzle seed or identity.
- [ ] Difficulty manifests record solver/version, technique order, hardest required technique and workload; repeatable tests support the four bands.
- [ ] Storage is schema-validated, optional and safely recoverable; no accounts/private records are needed.

## 8. Contribution verification and limitations

This contribution defines pedagogy, proposed types, proof obligations and acceptance gates. It does not implement a solver, create fixture boards, establish actual puzzle difficulty ratings, test animations, verify accessibility in a browser, or supply executed RED/GREEN evidence. The unchecked boxes are integration release requirements, not implied passes. Type/API names are proposals for the parent integrator, not claims about existing source modules.

Directory association was verified by working in the requested checkout. No named desktop project association was established or modified. No delegation, profile changes, private records, commits, pushes, deployments or purchases were performed for this contribution.
