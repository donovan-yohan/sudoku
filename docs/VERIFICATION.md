# Verification record

This file records executed checks separately from planning documents. Release and follow-up results are distinguished below.

## Local incremental checks

- Dependencies installed with npm. Audit at installation reported 0 vulnerabilities.
- `npx vitest run src/game.test.ts`: initial RED, missing game module. After game implementation, GREEN.
- Game behavior checks cover immutable givens, entry, exact undo/redo note restoration, future invalidation, bounded history, full-unit correctness, idempotent rewards, valid save restore, malformed records, modified givens, duplicate notes, and unavailable storage.
- Storage size regression: RED when whitespace-padded valid JSON over 100,000 characters was accepted. Added pre-parse size guard; rerun result recorded below after execution.
- `npx vitest run src/reward.test.ts`: initial RED, missing module. GREEN after choreography policy implementation. Tests cover effect rotation, subtle early rewards, late chromatic rewards, and distinct longer finale.
- Chromium Playwright browser installation command exited 0.

## Integrated verification

- `npm run check` passed 142 tests across 8 files, followed by a successful TypeScript and Vite production build.
- `npm run test:e2e` passed all 16 Chromium browser tests after the final review fixes, including both examples of every lesson, practice reload, UTC rollover/reload, hinted finale, reduced motion and readout regressions.
- Independent set-based exact solver confirmed all 16 catalog bases have one solution. It also proved each of 16 lesson candidate diagrams has a consistent global completion and that forcing the opposite of its claimed action is impossible under the supplied candidate premises. This does not claim each diagram is a unique playable puzzle.
- All eight lessons were exercised through both scenarios in the browser. The teaching interface labels diagrams as assumed logical contexts and records checked examples, not independent mastery.
- Acceptance script covered four difficulty selectors at widths 320/390/768/1440 in both themes. No page overflow, runtime page errors, or external runtime requests observed. Computed resting canvas/ink were pure black/white and authored button radii were zero.
- Actual keyboard entry solved a full puzzle and observed trace/wave/orbit/scatter/scan plus finale. Later chromatic effects appeared, and reload did not replay them. Reduced-motion completion keeps the status while the effect layer is hidden.
- Axe-core scan of play, catalog and expert lesson in both themes initially detected a visible-candidate/accessibility-label mismatch. Added spacing between rendered candidate digits and a regression. All six rescans returned no violations. This is automated coverage, not a manual screen-reader certification.
- Named Fugu release review found three real medium issues: unreachable practice save after reload, lost active daily identity after midnight plus reload, and no finale after a finishing hint. Integration fixes persisted a validated session envelope and shared reward commit path. The browser continuity suite covers these paths.
- Named Kame browser QA independently exercised all sixteen examples, both themes at 320/390/1440 widths, real entered solves and reduced motion. It confirmed the hint-finale defect and found two lower-severity readout defects: placed lesson values described as empty candidates, and stale completion text after Undo. Both were reproduced RED, fixed, and passed targeted browser regressions.
- Dependency audit reported zero known vulnerabilities. Secret/private-path candidate scan and ignored-artifact checks ran before publication. Vercel-created local environment credentials remain ignored and are not source content.

## Published release

- Public MIT source: https://github.com/donovan-yohan/sudoku.
- Production: https://sudoku.donovanyohan.com. Vercel Git integration tracks `main` on the owner's Hobby team; no paid add-ons or runtime services were added.
- Initial app commit `920e472d5291d032fac2b94e2f7898c95c4b52ed` matched Vercel production deployment `dpl_4pWY6N5GAuMiAQnQFufSG7hWqCBG`, state READY, custom-domain alias verified. GitHub Verify run `39539599753` completed successfully for that exact commit.
- Custom domain returned HTTP 200 with HTTPS, nosniff, permissions/referrer policies and the configured CSP. Production inline-theme bootstrap hash matched the allowlisted SHA-256. No script `unsafe-inline` is required; inline style support remains for effect coordinates.
- Ran the complete 16-test Playwright suite against the actual public custom domain, not just development: all passed. Repeated the eight viewport/theme acceptance combinations plus actual entry-to-finale solve against production: no page errors, overflow, or external runtime requests observed. Repeated play/catalog/expert-lesson axe scans in both themes: no violations. The axe harness bypasses CSP only to inject the local test auditor; normal browser acceptance runs retain CSP.
- Both named review reports are historical point-in-time findings. Their five distinct defects were fixed and covered by integration regressions; the reports themselves are not rewritten as unconditional approvals.

## Quiet UI follow-up (2026-10-21)

- Removed the idle hero, sidebar, hint introduction, routine save/hint counters and footer. Play uses one centered column with an accessible lightbulb-only hint control. Removed catalog disclaimers and repeated progress qualifications while preserving technique rules, questions and feedback.
- `npm run check` passed 144 tests across eight files and the production type/build gate. `npm run test:e2e` passed 27 Chromium tests, including six centered width/theme contexts, on-demand hint behavior, keyboard focus/dialog/lesson hairlines and existing continuity/lesson flows.
- All authored borders and outlines are at most 1px; grid hierarchy uses neutral opacity. Browser checks inspect actual rendered widths and distinguish ordinary/box boundaries. Finale strokes have a separate assertion in the hinted-completion regression.
- Local axe checks returned no violations for play/catalog/expert lesson in both themes. Acceptance repeated 320/390/768/1440 light/dark contexts and actual keyboard entry through all effect variants to the color finale with no overflow, page errors or external runtime requests observed.
- Copy provenance and prevention are recorded in `PRODUCT-COPY.md`. These local checks are not deployment evidence; the deployed source revision is verified separately at release.
- Read-only code review found lost keyboard focus after hint dismissal. Dedicated keyboard regressions reproduced dismissal and placement failures before the fix and passed afterward. The trigger now regains focus after either action. Product-copy review found remaining prerequisite disclaimers, guessing language and repeated idle prompts; these were removed with focused RED/GREEN checks.

## Generated modes and practical lessons follow-up (local, 2026-10-21)

This batch is not yet published. The production receipts above refer to the earlier release.

- `npm run check` passed 419 tests across 19 files, followed by TypeScript and Vite production builds. The emitted generation worker is a separate JavaScript asset. Heavy generator checks have explicit time budgets and Vitest uses two workers to avoid saturating the host with independent oracle work and Chromium teardown.
- Independent variant tests certify all 28 fallback templates and replay their logical traces. Beginner sweeps cover twelve new seeds in each mode, independent uniqueness and distinct fingerprints. Classic/X Beginner has 45 givens and a complete naked-single-only path; Killer Beginner has zero numeric givens and simple connected cages with singleton footholds. X/Killer Expert is unsupported rather than mislabeled.
- Harder Classic/X generation has a deterministic original attempt followed by certified fallbacks. Harder Killer currently uses a finite template bank. Desktop spike timings are not mobile guarantees, and random seeds do not imply infinitely distinct hard structures.
- All sixteen general and eight variant examples were exercised through actual placements in focused browser checks. The naked-triple examples remove alternatives from their final target directly, not from an unrelated cell. Tests replay source-puzzle provenance and verify full domains independently.
- Learn audit findings about stale peer notes and nonfinal-step focus were reproduced and fixed. Later regressions reproduced hidden-single target-only notes and unrelated candidate announcements. Both now pass: the full supporting unit is visible, unrelated cells stay quiet, and selecting a cell exposes its full internal candidate domain.
- `npm run test:a11y` returned no violations across ten play/settings/mistake/catalog/lesson theme contexts. `npm run test:acceptance` passed eight viewport/theme contexts, four Classic levels, full entry through the finale, and no overflow, page errors or external requests. These checks precede the last lesson-projection refinement and must be repeated for the final release.
- `npm run test:pwa` passed with the emitted generation worker in the complete first-install precache. Real strict-CSP offline navigation retained notes and preferences with HTTP cache disabled. All six malformed first installs and six malformed updates were rejected; active cache bytes/status/types and offline play survived rejected updates. Evidence is retained outside the public repository.
- Full async-browser migration and independent final composition/mathematical reviews remain separate release gates. No physical phone or manual screen-reader result is implied.
- Independent composition review found startup/error defects that parser tests missed. Real browser fault injection reproduced a failed worker saving the temporary v1 board; malformed session records also selected legacy mode. Save/tick effects now require a playable state, and legacy selection requires a valid matching game save. Four corruption/failure regressions plus valid legacy navigation/reload passed; retry returned the requested v2 identity without writing a placeholder save.
- Fresh bounded static review found no remaining errors in those two composition fixes. The parent repeated all five startup/legacy browser regressions successfully and repeated ten accessibility contexts after the lesson-projection refinement, with no axe violations. This does not close the independent mathematical-review gate.
- Mathematical review fixes now rank hints across Classic/variant families by tier and reject non-Killer cage metadata in the independent oracle. Priority regressions and schema controls were observed RED/GREEN. The combined `npm run check` then passed 425 tests across 19 files and the production build. All 28 certified templates retained their exact tiers; the worker's separate D4 audit covered 224 transforms. The parent repeated PWA, ten accessibility contexts and eight viewport/theme acceptance contexts successfully after these fixes. Final fresh mathematical review and the complete async browser suite remain pending.
- Fresh read-only mathematical review passed the priority and oracle-schema fixes with no findings. It confirmed one shared work budget, explicit arithmetic proof steps and meaningful independent premise controls. The complete async browser suite remains the final local release gate.
- Final parent Chromium gate passed all 78 tests across 15 files in two complete, nonoverlapping batches: 41 core/archive/generation/lesson checks and 37 preference/UI/variant checks. Test discovery was reconciled programmatically with no uncovered files. A preceding monolithic invocation hit the tool's execution ceiling after 49 passes; it was not counted as a completed run. The complete batches cover real native-worker cancellation and UTC parity, per-mode/difficulty daily/practice restoration, valid legacy saves, startup failure/retry, all 24 walkthroughs, Notes/settings/mistakes, digit rewards, reduced motion and keyboard focus. Browser fixtures install saved states before app startup rather than racing the live timer writer.

## Coverage limits

Physical phone hardware, VoiceOver/NVDA, Firefox and Safari are not claimed tested. Browser coverage uses Chromium with phone viewport/touch emulation. Static daily dates depend on the device clock. Progress is local-only, and simultaneous tabs use last-writer-wins records. A future release should repeat the live checks and bind them to its deployed commit.
