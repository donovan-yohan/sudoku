# Sudoku Difficulty and Daily Publishing Research

## Status and scope

Research informed the expanded Expert solver in this checkout. The shared logical policy now includes additional subsets, wings, fish, coloring and bounded chains; ratings record operation work and chain lengths. A public Master tier, curated daily manifests and empirical human-difficulty calibration remain proposed work. The owner approved resetting historical puzzles, ratings, saved progress and compatibility fixtures for this rebuild.

## Findings

### Algorithmic generation has strong precedent

Good Sudoku's official App Store description says its authors wrote a custom generator to create over 70,000 puzzles, offer five technique-defined difficulty levels, and publish three daily puzzle modes. It names XYZ-Wing, hidden quadruples, Jellyfish, and Swordfish among its harder techniques. This supports generated puzzles with an explicit logical skill profile; it does not disclose the full generation or daily-selection algorithm. [1]

HoDoKu documents generation at a requested level and targeted generation containing a specified technique. Its rating combines a hardest-technique floor with the accumulated scores of solution steps. Targeting a technique in a solver's path is not proof that every possible human solve must use it. [6]

Conceptis described developing an analyzer, comparing its results with human testers, and incorporating the resulting correlation algorithm into its generator to control difficulty, appearance, and enjoyment. This is a publisher's historical account, not a publicly reproducible implementation or an independent validation study. [4]

### Human construction is a different, valid editorial choice

Cracking the Cryptic explicitly describes its apps as containing handmade puzzles, tested and hinted by Simon and Mark. Nikoli describes authors submitting puzzles and experienced editors reviewing them. A generator can target a technique or shape, but that alone does not reproduce a human constructor's theme, surprise, or intended narrative. [2][8]

### Daily publication need not mean generation on the player's device

In a 2023 first-person explanation, Sudoku Coach's developer distinguished randomized practice derived from stored base puzzles from its Sudoku of the Day, which was generated individually beforehand. This is a dated developer statement, not verification of its present internal production system. It is direct precedent for separating practice generation from precomputed daily publication. [10]

### Technique ceiling alone is incomplete

Sudoku Coach explains the effects of technique timing, earlier eliminations that reveal later patterns, and the number of simultaneously available basic deductions. It also warns that solver ordering changes the solve path and that its HoDoKu estimate may differ substantially from the official tool. [5]

Pelánek's computational study identifies both individual-step complexity and dependencies between steps as contributors to human difficulty. This supports collecting more than a hardest-technique label; it does not validate any particular weights or thresholds in this application. [7]

## Application limits and rebuild status

- `src/variant-engine.ts`: four logical caps now use the expanded shared selector. Profiles record deterministic operation work, placements, eliminations, technique counts and maximum chain length. Human-weighted workload, move scarcity and dependency structure are not yet measured or calibrated.
- `src/variant-generator.ts`: Classic/X try bounded construction and use certified fallback transformations; harder Killer uses a finite certified template bank. Transforming one puzzle does not create a new underlying solving structure.
- `src/generated-puzzles.ts`: the UTC date, variant, difficulty, and version form deterministic request identities. Identity and randomness are separate from quality certification.
- `src/puzzles.ts`: original clue strings remain as authoring provenance. The legacy runtime selector and divergent rating implementation have been removed.
- Existing uniqueness and trace tests establish mathematical correctness under their covered cases, not empirical calibration of human difficulty.

## Recommended architecture

Keep algorithmic generation, but move daily selection to an offline quality-controlled publishing pipeline:

1. **Construct candidates offline.** Search for target profiles, not merely a unique puzzle with a requested label. Numeric clues, cage layout, and symmetry are design inputs, not difficulty proofs.
2. **Independently check uniqueness and rules.** Exhaustion or an unknown rating is rejection/pending certification, never an automatic Master label.
3. **Solve with a versioned human-technique engine.** Retain actual candidate eliminations, premises, placements, enabled techniques, ordering, and operation limits.
4. **Measure a profile.** Record peak technique complexity, weighted workload, advanced-step counts and timing, low-tier move availability, and bounded chain length. Only claim dependency-depth measurement after implementing an actual dependency model; trace length is not dependency depth.
5. **Reject and select.** Enforce approachable openings at low levels, useful advanced deductions at higher levels, workload bounds, and variety across technique families. Reject digit/spatial isomorphs as new structures; use a constraint-aware fingerprint for each variant.
6. **Review a bank and schedule immutable records.** Choose across varied profiles, then publish explicit date + mode + level to puzzle-ID mappings in static versioned manifests. Keep proof/audit data out of the routine play UI.
7. **Keep random practice separate.** Practice can continue bounded deterministic generation and certified fallback selection, with its own identity namespace.

This remains compatible with static hosting and offline play. Future daily banks can be bundled in releases; no account, runtime API, scheduled paid service, or server-side execution is necessary. Exhausted publication coverage should produce a deliberate unavailable state, not silently replace an already assigned puzzle.

### Clean-break rebuild

Historical compatibility is explicitly out of scope. Replace the existing logical policy and retire obsolete resolvers instead of freezing a legacy engine alongside a stronger one. Historical daily boards, archive contents, ratings, and old-shape test expectations may change. Re-certify retained puzzle and lesson data under the new engine rather than retaining old detector order to keep provenance tests green.

Use a fresh puzzle/save namespace so stale browser records cannot attach to changed content, especially zero-given Killer puzzles with different cage partitions. No migration or dual-read fallback is required. Ignore obsolete records; do not indiscriminately clear browser storage or unrelated preferences. Bind new published identities to immutable content so ordinary future releases cannot silently substitute another board.

The implementation removes legacy startup and save-probing paths. `rateVariant` is the single rating implementation; hints and certification use its shared deduction selector and technique policy. Offline construction and runtime resolution have different jobs. Master still needs explicit capability gating and a certified supply, not just another member of the difficulty union.

## Solver ceiling and proposed Master admission

Master should initially be a Classic-only, product-defined level above Expert, not a synonym for every known hard Sudoku. HoDoKu's documented repertoire extends through subsets, ordinary and finned fish, wings, coloring, chains/AIC, almost locked sets, and more complex last-resort methods. [12]

A staged repertoire was recommended:

1. Missing fundamentals: hidden pairs/triples/quads and naked quads.
2. Broader named patterns: XYZ-/W-Wing, Skyscraper, Two-String Kite, Simple Coloring, Jellyfish, and finned fish.
3. A genuine higher ceiling: bounded X-/XY-Chains and alternating inference chains with recorded links and readable explanations. Consider a small ALS-XZ implementation after that foundation.

The Expert release implements hidden subsets, naked quads, XYZ-/W-Wing, Jellyfish, ordinary non-sashimi finned X-Wing, Simple Coloring and bounded X-/XY-/AIC deductions. Short named patterns such as Skyscraper and Two-String Kite can be covered by X-Chain proofs but are not separately classified. These families extend the current Expert policy; they do not establish a distinct Master boundary. ALS and broader fish/forcing families remain unimplemented.

Not all added techniques belong in Master: completing the basic repertoire should improve lower-level classification too. Avoid nested forcing nets, arbitrary unlimited proof searches, or backtracking masquerading as a logical hint. No source establishes a universal numeric threshold for the label Master.

A proposed Master puzzle is admitted only when the specified lower-cap solver stalls and the new bounded solver completes it with an independently checked, nontrivial higher-tier proof. This is relative to a declared solver/configuration, not a proof that no easier human route exists. Tune final bands using external comparisons and playtesting rather than inventing authoritative weights.

Do not automatically extend Master to X or Killer. Validate added houses/links and arithmetic-specific deductions independently; their difficulty calibration needs separate evidence.

### Smallest end-to-end implementation slice

The solver release adds four original, independently unique full puzzles that the previous solver stalls on and the expanded Expert solver completes. A real browser hint journey applies an AIC and finishes one of them. The fresh namespace and current-schema reload/offline paths are verified separately. A later Master release still needs a distinct Expert/Master admission boundary and an adequate publication bank, not a relabeling of these four Expert fixtures. Immutable daily manifest resolution remains follow-on work.

## Test and benchmark requirements

- Add positive fixtures, near-miss negative fixtures, both orientations, digit relabeling, and allowed spatial transforms for every technique.
- Verify premises and replay the complete trace, not only agreement with a stored final solution.
- Independently check each placement and elimination against the original puzzle constraints; forcing a supposedly eliminated candidate must have no completion. When fixtures are partial proof states, independently validate prior eliminations as well.
- Include full puzzles that the previous solver stalls on and the expanded solver completes, alongside easier controls and deliberately above-ceiling cases.
- Test explicit operation/chain limits, cancellation, deterministic ordering, and rejection on budget exhaustion.
- Pin external comparison tools, versions, modes, configuration, and corpus provenance. HoDoKu documents batch solving, all-step checking against solutions, and regression testing; these are useful precedents, not tools executed for this research. [13]
- Replace obsolete compatibility fixtures with tests that reject old-schema records and preserve new-schema progress across ordinary reloads and updates. Keep independent correctness and useful interaction regressions; permission to reset history is not permission to remove failing safety checks.
- Test publication coverage, duplicate/isomorphic structures, manifest immutability, UTC boundaries, and offline archive resolution.

Implement original MIT-compatible code. Do not copy third-party implementations, explanatory material, or puzzle collections without separately checking their licenses and provenance. Referencing an algorithm does not license a corpus.

## Sources

[1] Good Sudoku by Zach Gage — official App Store description: https://apps.apple.com/ca/app/good-sudoku-by-zach-gage/id1489118195

[2] Cracking the Cryptic — official apps page: https://crackingthecryptic.com/apps

[4] Conceptis — “Sudoku by Conceptis - feel the difference” (2005): https://www.conceptispuzzles.com/index.aspx?uri=info/news/199

[5] Sudoku Coach — “Sudoku Difficulty”: https://sudoku.coach/en/learn/sudoku-difficulty

[6] HoDoKu — creating puzzles and rating: https://hodoku.sourceforge.net/en/docs_cre.php

[7] Radek Pelánek — “Difficulty Rating of Sudoku Puzzles by a Computational Model” (2011): https://www.fi.muni.cz/~xpelanek/publications/flairs-sudoku.pdf

[8] Nikoli — puzzle construction and editorial review: https://www.nikoli.co.jp/en/puzzles/

[10] Sudoku Coach developer's 2023 explanation of practice and daily generation: https://www.reddit.com/r/sudoku/comments/17cpmgr/sudoku_coach_how_does_the_random_puzzle/k5tdea6/

[12] HoDoKu — implemented techniques: https://hodoku.sourceforge.net/en/techniques.php

[13] HoDoKu — command-line and test reference: https://hodoku.sourceforge.net/en/docs_ref.php
