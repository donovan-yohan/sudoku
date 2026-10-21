# Sudoku

A quieter Sudoku app with daily puzzles, practice, and interactive technique lessons.

## Development

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Node 24 is used for CI and hosting. The app is static Vite, React, and TypeScript. No environment variables, account service, database, or paid API is needed.

## Design

Pure black/white resting interface, inverse dark mode, thin borders, and square geometry. Correct row, column, and box completions rotate through several short effects. Early rewards are subtle; later rewards introduce transient chromatic shimmer, and a solved puzzle earns a full-board finale. System reduced-motion disables decorative movement. The interface returns to monochrome afterward. Sound is not enabled.

## Privacy

No visitor account or app analytics. Progress and preferences are kept in this browser on this device, without server sync. Clearing site data, private browsing, and storage eviction can remove progress. Shared-device users can see local progress. Hosting and network providers still process the requests needed to deliver the app.

## Content and correctness

See [the implementation seam](docs/IMPLEMENTATION.md) for domain boundaries and [the motion brief](docs/MOTION.md) for the refined animation requirements. Puzzle-level labels use the app's logical solver policy, not clue count or a universal difficulty standard. Lessons explicitly identify partial candidate diagrams when used; those diagrams are teaching contexts, not advertised as complete unique playable puzzles.

Daily identity uses the UTC date from the device clock. The static bundle includes answers and future deterministic selection logic. This is a learning app, not an anti-cheat system. Practice uses a finite structural puzzle bank with Sudoku-preserving transformations, not a promise of endlessly distinct patterns.

## Contributions

Eight named Hermes profiles contributed scoped product, design, teaching, editorial, experience, operating-cost, review, and QA briefs in `docs/contributions/`. These are planning contributions, not independent claims that the application passed a release review. Ebi owns integration, execution, review, and publishing. The later [motion addendum](docs/MOTION.md) supersedes early briefs' blanket prohibition on temporary color effects.

## License

MIT. Original application code, lesson prose, diagrams, and generated puzzle content. See [LICENSE](LICENSE).
