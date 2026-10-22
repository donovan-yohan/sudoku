# Sudoku

A quieter Sudoku app with daily puzzles, practice, and interactive technique lessons.

Play at https://sudoku.donovanyohan.com.

General, X Sudoku and Killer Sudoku lessons use real puzzle positions. Walk through the technique, apply its deductions, and place the number it unlocks. General techniques include singles, locked candidates, pairs, triples, X-Wing, Swordfish and XY-Wing; variant sections cover diagonals and cage arithmetic. See [verification](docs/VERIFICATION.md) for executed checks and their limits.

## Development

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:pwa
```

Node 24 is used for CI and hosting. The app is static Vite, React, and TypeScript. No environment variables, account service, database, or paid API is needed.

## Design

Pure black/white resting interface, inverse dark mode, thin borders, and square geometry. Correct row, column, and box completions rotate through several short effects. Early rewards are subtle; later rewards introduce transient chromatic shimmer, and a solved puzzle earns a full-board finale. System reduced-motion disables decorative movement. The interface returns to monochrome afterward. Sound is not enabled.

Settings contain theme, completion effects and Show mistakes. Mistakes are hidden by default. Enabling them marks incorrect entries red and gives new mistakes a brief digit-only shake. Notes are manual; automatic note filling is not included. Completed sets of nine matching digits receive a staggered hop and shimmer, and keypad digits with nine visible copies are disabled.

## Offline installation

Install Sudoku from your browser's app-install or Add to Home Screen action. After the complete app shell has been cached, puzzles, lessons and local progress remain usable offline. Updates wait until the current app closes rather than interrupting a puzzle. The app has original monochrome maskable and Apple-touch icons. Physical iOS installation has not been verified.

## Privacy

No visitor account or app analytics. Progress and preferences are kept in this browser on this device, without server sync. Clearing site data, private browsing, and storage eviction can remove progress. Shared-device users can see local progress. Hosting and network providers still process the requests needed to deliver the app.

## Content and correctness

See [the implementation seam](docs/IMPLEMENTATION.md) for domain boundaries and [the motion brief](docs/MOTION.md) for animation requirements. Puzzle levels use the app's logical solver policy, not clue count or a universal difficulty standard. All displayed lessons use real clue positions, validated deductions and a resulting number placement.

Daily identity includes the publication namespace, UTC date from the device clock, game mode and difficulty. The calendar covers 2026-01-01 through today. Practice has separate saved random identities. Generation runs in a Web Worker and remains usable offline after installation. The solver rebuild starts a fresh `v3` puzzle namespace and ignores historical game/session records. Theme and effects preferences remain unchanged.

Classic supports four difficulty levels; X and Killer currently support Beginner, Intermediate and Advanced. Beginner generates original approachable positions. Harder Classic/X generation falls back to certified templates when its fixed operation budget is exhausted; harder Killer uses a finite certified template bank. Practice does not promise endlessly distinct hard structures. The static bundle includes answers and deterministic selection logic, so it is not an anti-cheat system.

The shared logical policy includes hidden subsets and naked quads, XYZ-/W-Wing, Jellyfish, ordinary finned X-Wing, and Classic coloring and bounded X-/XY-/alternating inference chains. Hints use the same deduction selector as ratings, with internal proven eliminations separate from player notes. Chains have explicit link certificates and search limits, never solution-search premises. Ratings record technique counts, candidate removals, placements, maximum chain length and deterministic operation work; these measurements are not human solve-time predictions. See [difficulty research and next publication steps](docs/DIFFICULTY-RESEARCH.md). A public Master tier and curated daily manifests are not included in this solver release.

## Contributions

Eight named Hermes profiles contributed scoped product, design, teaching, editorial, experience, operating-cost, review, and QA briefs in `docs/contributions/`. These are planning contributions, not independent claims that the application passed a release review. Ebi owns integration, execution, review, and publishing. The later [motion addendum](docs/MOTION.md) supersedes early briefs' blanket prohibition on temporary color effects.

## License

MIT. Original application code, lesson prose, diagrams, and generated puzzle content. See [LICENSE](LICENSE).
