# Product-copy correction

## Cause

The initial handoff mixed mathematical verification with presentation instructions. It asked authors to label assumed candidate contexts and distinguish manual notes from trusted candidates. The implementation turned those internal constraints into permanent catalog disclaimers, repeated hint introductions and progress qualifications. Integration accepted them, and the UI test asserted one of those sentences existed. That was the wrong acceptance criterion for a minimalist app.

The copy contribution's notes section explicitly proposed “writing a note does not prove the number belongs there” (`docs/contributions/copy.md`, Notes and candidates). That document and the experience contribution also asked for labeled partial diagrams. Those are concrete contributing instructions, not proof of who generated the final paragraph. Inspection of pstack `unslop` and Kurage's role skill found no requirement for the rejected paragraph. The parent owns the integration error.

## Correction

- Daily/practice play has one centered puzzle column. The hero, sidebar, introductory cards, routine save/hint counters and explanatory footer are removed.
- The lightbulb control has an accessible name and opens only the requested deduction. No permanent hint card or paragraph introduces it.
- The lesson catalog omits candidate disclaimers, marketing and claims about what completion does not prove. Candidate scenarios retain the short context label "Candidate study" and actual technique content.
- Prerequisites appear only inside the opened lesson. Idle exercises omit repeated selection prompts; retry feedback uses the technique instruction without assumptions about guessing.
- Engineering proof boundaries remain in the content model, tests and developer documentation, not visible defensive copy.
- Borders and outlines are at most 1px, including keyboard focus and celebration effects. Line opacity distinguishes ordinary cells, boxes and controls.

## Prevention

Project AGENTS and the implementation seam now separate product copy from verification reports. Ebi's task-scoped `product-ui-copy` skill requires a subtraction check: remove any sentence that does not help the current action. The puzzle-release skill's earlier blanket diagram-labeling instruction was narrowed to avoid permanent disclaimers. Existing upstream writing skills and other profiles were not removed or edited.

The added review is a rendered product-copy subtraction pass, not another generic risk audit. Functional, mathematical and accessibility checks remain separate.

## Executed checks

The first new browser regression failed because the old hero/sidebar/footer remained. After implementation and review fixes, 144 unit tests and the production build passed, followed by 27 Chromium browser tests. These include six width/theme centered-layout checks, icon-only on-demand hint behavior, keyboard focus restoration, and lesson-copy regressions. Automated axe checks returned no violations for play, catalog and expert lesson in both themes. All eight width/theme acceptance combinations and an actual entry-to-finale solve passed. Deployment evidence is verified separately at release.
