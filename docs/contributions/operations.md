# Operating cost and privacy review

Reviewer: Namako (namako-finance), Hermes Agent. Public operating-cost and privacy boundaries only; not a review of personal finances.
Reviewed: 2026-10-21 UTC.
Project: Sudoku, Ebi id the Sudoku project; parent session the originating build session.
Checkout: `.`.
Target: public MIT source `donovan-yohan/sudoku`, static Vite + React + TypeScript at `sudoku.donovanyohan.com`.

## Verdict

PASS for the proposed static-first operating model, conditional on continued non-commercial Hobby eligibility and staying within provider limits. This is a design review, not certification of a running application, its hosting settings, or a guaranteed zero-cost service. No paid dependency is necessary for the stated features. No provider changes were made.

## Recommended architecture and spending boundary

- Build static assets; run puzzle logic, hints, lesson scenarios, progress, and preferences in the browser. Bundle validated puzzles and lessons. Deterministic UTC-date selection gives visitors the same daily puzzle without a scheduled job, database, account, or daily deployment. Version the puzzle schedule so releases do not silently change today's puzzle.
- Prevalidate unique solutions, evidence-based difficulty, and lesson steps during development/build rather than using a paid puzzle API or runtime AI. Expert lessons are content and validation work, not a reason to add an inference bill.
- Use no paid APIs, hosted database, authentication, payment processor, email service, analytics, Speed Insights, error-reporting SDK, remote font, advertising, or third-party widget. Prefer system fonts and original local assets. Keep dependencies small and license-compatible; retain required notices even with MIT app source.
- Keep rendering static: no server functions, SSR, image-optimization service, middleware, or cron is needed for this scope. Static delivery still consumes network/request allowances.
- Keep deployments deliberate; previews and repeated builds also consume platform resources. Cache fingerprinted assets; avoid oversized puzzle bundles and unneeded media. Lesson chunks can be local static assets loaded on demand.
- Do not enable trials, add-ons, upgrades, external integrations, or paid services without explicit owner approval and a fresh pricing review. Pro is not an automatic remedy for traffic growth: its on-demand billing changes the risk.
- Existing domain registration/renewal and DNS arrangements are separate from hosting. Their price and current setup were not inspected. A subdomain does not establish that the parent domain is free. Maintenance time also remains a real cost.

## Current public Vercel caveats

Fetched from official docs on the review date; these are published allowances, not this project's measured remaining quota or a contract guaranteeing future pricing.

| Relevant Hobby allowance | Published value | Implication |
| --- | --- | --- |
| Fast Data Transfer | First 100 GB | Static assets consume delivery capacity. |
| Fast Origin Transfer | First 10 GB | Do not assume all transfer is covered by the CDN delivery figure. |
| CDN Requests | First 1,000,000 | Small responses still count as requests. |
| Deployments per day | 100 | Avoid deployment churn; daily puzzles need no daily build. |
| Concurrent deployments | 1 | Builds can queue. |
| Build duration per deployment | 45 minutes | Large generation jobs can fail a deployment. |
| CLI source upload | 100 MB | This is the CLI source-upload limit, not a claim about visitor download size. |

Sources: [Hobby plan](https://vercel.com/docs/plans/hobby) and [general limits](https://vercel.com/docs/limits). The Hobby page states that in most cases exceeding a usage limit requires waiting until 30 days have passed before the feature can be used again; some resources have different pause periods. Treat traffic spikes and abuse as availability risks, not as unlimited free capacity. Check actual account/team usage and reset semantics before launch; a project's apparent simplicity does not prove unused allowance.

[Fair use](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage) restricts Hobby to personal, non-commercial use. Public source and an MIT license do not independently establish eligibility. Vercel's definition includes financial gain anywhere in production, including paid development/hosting, visitor payments, advertisements, and relevant affiliate use; its page explicitly excludes asking for donations from commercial usage. Recheck eligibility before monetization, sponsorship arrangements, or compensated work; ask Vercel if ambiguous. No commercial-status determination was made here.

Analytics allowances are deliberately not a proposed resource budget: use no analytics. Vercel's [analytics quickstart](https://vercel.com/docs/analytics/quickstart) describes explicit dashboard enablement plus client integration; do not add either. This public-document review does not establish the actual dashboard state.

## Privacy boundary

- No visitor accounts, cloud saves, leaderboards, tracking identifiers, telemetry, third-party embeds, or server submission of moves, mistakes, hint usage, lesson performance, or progress. Keep game state on the current browser/device only.
- Store only the minimum local progress and preferences. Validate stored data as untrusted input, version schemas, handle corrupt data/quota/security exceptions, and provide a clear local reset. Explain that private browsing, storage clearing, device changes, or browser eviction can lose progress; no cross-device sync or backup is promised. Shared-device users can see local progress.
- Do not place play history or personal details in URLs, query strings, diagnostics, console messages, public issues, or repository fixtures. All browser bundles and `VITE_*` variables must be treated as public; no secrets belong there. Use only original/publicly distributable puzzle and lesson data, never private profile records.
- No app analytics does not mean no infrastructure processing. Delivery necessarily exposes connection/request information such as IP address to hosting/network providers. Do not claim anonymous hosting, zero logging, or that no data ever leaves the device: asset requests leave it. Provider retention and DNS configuration were not audited.
- Suggested user-facing wording, to publish only after implementation verification: "No account or app analytics. Your puzzle progress and preferences are stored in this browser, not synced to a server. Clearing browser storage can remove them. Our hosting provider processes requests needed to deliver the site."
- A no-tracking architecture reduces data handling; it is not a legal compliance certification or a reason to install a cookie banner by default. Reassess notices/consent if storage purposes, embeds, telemetry, or monetization change.

## Maintenance and acceptance handoff

The primary recurring work is lesson accuracy, solver/difficulty validation, dependency/browser compatibility, and accessible mobile/desktop behavior—not server administration. Keep the lockfile and review dependency advisories and licenses on updates. Pin a supported build runtime, run behavioral tests and production builds before release, and retain a known-good static artifact/release for rollback. Review UTC rollover and stable daily identity across releases; the local clock can be wrong, and this design provides no authoritative server time or anti-cheat guarantee.

Before launch, the integrating owner should verify:

- Actual Hobby eligibility, team-wide usage, quota alerts available on that plan, domain/DNS ownership, HTTPS, production routing, and absence of enabled paid products. Do not upgrade as part of this review.
- A production build emits static assets without functions or external runtime API dependencies. Inspect dependency imports and browser network traffic during play and lessons; confirm no analytics/telemetry/font/third-party calls, including Vercel insights scripts. Read back relevant hosting dashboard settings separately.
- Local-only storage, reset behavior, disabled/unavailable/corrupt storage fallback, and the accuracy of the public privacy wording.
- Unique-solution and difficulty evidence, validated beginner-to-expert scenarios, UTC daily consistency, keyboard/touch accessibility, black/white inverse themes, thin square borders, correct completion effects, reduced-motion behavior, and sound opt-in. These are implementation checks, not results claimed by this operations review.
- Periodic public-doc and usage review, especially after traffic changes, dependency additions, or any commercial change. Traffic/usage growth warrants a new decision, not a promise of free hosting forever.

## Execution receipt and limitations

PASS: verified checkout with `pwd`; read root `AGENTS.md`; looked for scoped instructions; read official public Vercel documentation; wrote only this assigned contribution file (parent directories created as needed).

ISSUES: first combined filesystem command was rejected by the execution approval guard before running because it included Python `-c`. Recovered with plain `pwd` and the file-read tool. No approval configuration was changed.

Not established: named Desktop project association. No project binding or external-service modification attempted. Directory is verified; the logical project identifier above is assignment context, not a verified Desktop binding.

Not tested: app implementation, build, live domain, DNS, hosting account/plan, remaining quotas, analytics settings, commercial eligibility, or actual visitor data flows. No need to wait for implementation to complete this document review.

No personal finance records accessed; no profile settings changed; no delegation, installs, commits, pushes, deployments, purchases, or external writes performed.
